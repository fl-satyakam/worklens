import Database from 'better-sqlite3';
import { FileEvent, Stats, TimelineData, HeatmapData, ScanCycle, FileSnapshot, Session, CodebaseNode, DailyActivity, ExtensionActivity, CoChange } from '../types';

export class WorkLensDB {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_ext TEXT NOT NULL,
        file_size_bytes INTEGER,
        diff_summary TEXT,
        workspace TEXT,
        scan_cycle_id INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_event_type ON events(event_type);
      CREATE INDEX IF NOT EXISTS idx_file_path ON events(file_path);
      CREATE INDEX IF NOT EXISTS idx_workspace ON events(workspace);
      CREATE INDEX IF NOT EXISTS idx_scan_cycle_id ON events(scan_cycle_id);

      CREATE TABLE IF NOT EXISTS scan_cycles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        event_count INTEGER NOT NULL,
        summary TEXT NOT NULL,
        files_created INTEGER NOT NULL,
        files_modified INTEGER NOT NULL,
        files_deleted INTEGER NOT NULL,
        workspace TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_cycles_timestamp ON scan_cycles(timestamp);
      CREATE INDEX IF NOT EXISTS idx_cycles_workspace ON scan_cycles(workspace);

      CREATE TABLE IF NOT EXISTS file_snapshots (
        file_path TEXT NOT NULL,
        workspace TEXT NOT NULL,
        mtime INTEGER NOT NULL,
        size INTEGER NOT NULL,
        content_hash TEXT NOT NULL,
        content TEXT NOT NULL,
        last_seen_at TEXT NOT NULL,
        PRIMARY KEY (file_path, workspace)
      );

      CREATE INDEX IF NOT EXISTS idx_snapshots_workspace ON file_snapshots(workspace);
    `);
  }

  insertEvent(event: FileEvent): void {
    const stmt = this.db.prepare(`
      INSERT INTO events (timestamp, event_type, file_path, file_ext, file_size_bytes, diff_summary, workspace, scan_cycle_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.timestamp,
      event.event_type,
      event.file_path,
      event.file_ext,
      event.file_size_bytes,
      event.diff_summary,
      event.workspace || null,
      event.scan_cycle_id || null
    );
  }

  getEvents(limit: number = 100, offset: number = 0, type?: string, workspace?: string): FileEvent[] {
    let query = 'SELECT * FROM events';
    const params: any[] = [];
    const conditions: string[] = [];

    if (type) {
      conditions.push('event_type = ?');
      params.push(type);
    }

    if (workspace) {
      conditions.push('workspace = ?');
      params.push(workspace);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as FileEvent[];
  }

  getStats(workspace?: string): Stats {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const whereClause = workspace ? 'WHERE timestamp >= ? AND workspace = ?' : 'WHERE timestamp >= ?';
    const params = workspace ? [todayISO, workspace] : [todayISO];

    const totalEvents = this.db.prepare(`SELECT COUNT(*) as count FROM events ${whereClause}`).get(...params) as { count: number };

    const mostActiveFile = this.db.prepare(`
      SELECT file_path, COUNT(*) as count
      FROM events
      ${whereClause}
      GROUP BY file_path
      ORDER BY count DESC
      LIMIT 1
    `).get(...params) as { file_path: string; count: number } | undefined;

    const mostActiveHour = this.db.prepare(`
      SELECT strftime('%H', timestamp) as hour, COUNT(*) as count
      FROM events
      ${whereClause}
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `).get(...params) as { hour: string; count: number } | undefined;

    const counts = this.db.prepare(`
      SELECT
        SUM(CASE WHEN event_type = 'create' THEN 1 ELSE 0 END) as created,
        SUM(CASE WHEN event_type = 'modify' THEN 1 ELSE 0 END) as modified,
        SUM(CASE WHEN event_type = 'delete' THEN 1 ELSE 0 END) as deleted
      FROM events
      ${whereClause}
    `).get(...params) as { created: number; modified: number; deleted: number };

    return {
      totalEvents: totalEvents.count,
      mostActiveFile: mostActiveFile?.file_path || null,
      mostActiveHour: mostActiveHour ? parseInt(mostActiveHour.hour) : null,
      createdCount: counts.created || 0,
      modifiedCount: counts.modified || 0,
      deletedCount: counts.deleted || 0,
    };
  }

  getTimeline(hours: number = 24, workspace?: string): TimelineData[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const whereClause = workspace ? 'WHERE timestamp >= ? AND workspace = ?' : 'WHERE timestamp >= ?';
    const params = workspace ? [since, workspace] : [since];

    const results = this.db.prepare(`
      SELECT strftime('%H', timestamp) as hour, COUNT(*) as count
      FROM events
      ${whereClause}
      GROUP BY hour
      ORDER BY hour
    `).all(...params) as { hour: string; count: number }[];

    return results.map(r => ({
      hour: parseInt(r.hour),
      count: r.count,
    }));
  }

  getHeatmap(limit: number = 50, workspace?: string): HeatmapData[] {
    const whereClause = workspace ? 'WHERE workspace = ?' : '';
    const params = workspace ? [workspace, limit] : [limit];

    const results = this.db.prepare(`
      SELECT file_path as path, COUNT(*) as count
      FROM events
      ${whereClause ? whereClause + ' ' : ''}
      GROUP BY file_path
      ORDER BY count DESC
      LIMIT ?
    `).all(...params) as HeatmapData[];

    return results;
  }

  // Scan cycle methods
  insertScanCycle(cycle: ScanCycle): number {
    const stmt = this.db.prepare(`
      INSERT INTO scan_cycles (timestamp, event_count, summary, files_created, files_modified, files_deleted, workspace)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      cycle.timestamp,
      cycle.event_count,
      cycle.summary,
      cycle.files_created,
      cycle.files_modified,
      cycle.files_deleted,
      cycle.workspace
    );

    return result.lastInsertRowid as number;
  }

  getScanCycles(limit: number = 20, workspace?: string): ScanCycle[] {
    const whereClause = workspace ? 'WHERE workspace = ?' : '';
    const params = workspace ? [workspace, limit] : [limit];

    const stmt = this.db.prepare(`
      SELECT * FROM scan_cycles
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    return stmt.all(...params) as ScanCycle[];
  }

  // File snapshot methods
  upsertSnapshot(snapshot: FileSnapshot): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO file_snapshots (file_path, workspace, mtime, size, content_hash, content, last_seen_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      snapshot.file_path,
      snapshot.workspace,
      snapshot.mtime,
      snapshot.size,
      snapshot.content_hash,
      snapshot.content,
      snapshot.last_seen_at
    );
  }

  getSnapshot(filePath: string, workspace: string): FileSnapshot | undefined {
    const stmt = this.db.prepare(`
      SELECT * FROM file_snapshots
      WHERE file_path = ? AND workspace = ?
    `);

    return stmt.get(filePath, workspace) as FileSnapshot | undefined;
  }

  getAllSnapshots(workspace: string): FileSnapshot[] {
    const stmt = this.db.prepare(`
      SELECT * FROM file_snapshots
      WHERE workspace = ?
    `);

    return stmt.all(workspace) as FileSnapshot[];
  }

  deleteSnapshot(filePath: string, workspace: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM file_snapshots
      WHERE file_path = ? AND workspace = ?
    `);

    stmt.run(filePath, workspace);
  }

  // --- v0.2 methods ---

  private getSessionBoundaries(workspace?: string): { events: { timestamp: string; file_path: string; file_ext: string; event_type: string }[] }[] {
    let query = 'SELECT timestamp, file_path, file_ext, event_type FROM events';
    const params: any[] = [];

    if (workspace) {
      query += ' WHERE workspace = ?';
      params.push(workspace);
    }

    query += ' ORDER BY timestamp ASC';
    const events = this.db.prepare(query).all(...params) as { timestamp: string; file_path: string; file_ext: string; event_type: string }[];

    const GAP_MS = 15 * 60 * 1000;
    const sessions: { events: typeof events }[] = [];
    let current: typeof events = [];

    for (const evt of events) {
      if (current.length > 0) {
        const prevTime = new Date(current[current.length - 1].timestamp).getTime();
        const curTime = new Date(evt.timestamp).getTime();
        if (curTime - prevTime > GAP_MS) {
          sessions.push({ events: current });
          current = [];
        }
      }
      current.push(evt);
    }
    if (current.length > 0) {
      sessions.push({ events: current });
    }

    return sessions;
  }

  getSessions(workspace?: string): Session[] {
    const sessionGroups = this.getSessionBoundaries(workspace);

    return sessionGroups.map((group, idx) => {
      const evts = group.events;
      const startTime = evts[0].timestamp;
      const endTime = evts[evts.length - 1].timestamp;
      const durationMs = new Date(endTime).getTime() - new Date(startTime).getTime();

      const uniqueFiles = new Set(evts.map(e => e.file_path));
      const fileTypes: Record<string, number> = {};
      let creates = 0;
      let modifies = 0;
      let deletes = 0;

      for (const e of evts) {
        const ext = e.file_ext || '(none)';
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        if (e.event_type === 'create') creates++;
        else if (e.event_type === 'modify') modifies++;
        else if (e.event_type === 'delete') deletes++;
      }

      return {
        id: idx + 1,
        startTime,
        endTime,
        durationMs,
        eventCount: evts.length,
        filesChanged: uniqueFiles.size,
        fileTypes,
        creates,
        modifies,
        deletes,
      };
    });
  }

  getCodebaseTree(workspace?: string): CodebaseNode {
    let query = 'SELECT file_path, COUNT(*) as count, MAX(timestamp) as lastModified FROM events';
    const params: any[] = [];

    if (workspace) {
      query += ' WHERE workspace = ?';
      params.push(workspace);
    }

    query += ' GROUP BY file_path';

    const rows = this.db.prepare(query).all(...params) as { file_path: string; count: number; lastModified: string }[];

    const root: CodebaseNode = { name: '.', path: '.', children: [], eventCount: 0, lastModified: null };

    for (const row of rows) {
      const parts = row.file_path.split('/').filter(Boolean);
      let node = root;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        currentPath = currentPath ? currentPath + '/' + parts[i] : parts[i];
        let child = node.children.find(c => c.name === parts[i]);
        if (!child) {
          child = { name: parts[i], path: currentPath, children: [], eventCount: 0, lastModified: null };
          node.children.push(child);
        }
        node = child;
      }

      node.eventCount += row.count;
      if (!node.lastModified || row.lastModified > node.lastModified) {
        node.lastModified = row.lastModified;
      }
    }

    // Propagate event counts and lastModified up the tree
    const propagate = (node: CodebaseNode): { eventCount: number; lastModified: string | null } => {
      let totalCount = node.eventCount;
      let latestMod = node.lastModified;

      for (const child of node.children) {
        const result = propagate(child);
        totalCount += result.eventCount;
        if (result.lastModified && (!latestMod || result.lastModified > latestMod)) {
          latestMod = result.lastModified;
        }
      }

      node.eventCount = totalCount;
      node.lastModified = latestMod;
      return { eventCount: totalCount, lastModified: latestMod };
    };

    propagate(root);

    return root;
  }

  getDailyActivity(days: number, workspace?: string): DailyActivity[] {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const conditions = ['timestamp >= ?'];
    const params: any[] = [since];

    if (workspace) {
      conditions.push('workspace = ?');
      params.push(workspace);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const rows = this.db.prepare(`
      SELECT date(timestamp) as date, COUNT(*) as count
      FROM events
      ${whereClause}
      GROUP BY date(timestamp)
      ORDER BY date ASC
    `).all(...params) as DailyActivity[];

    return rows;
  }

  getActivityByExtension(days: number, workspace?: string): ExtensionActivity[] {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const conditions = ['timestamp >= ?'];
    const params: any[] = [since];

    if (workspace) {
      conditions.push('workspace = ?');
      params.push(workspace);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const rows = this.db.prepare(`
      SELECT date(timestamp) as date, file_ext, COUNT(*) as count
      FROM events
      ${whereClause}
      GROUP BY date(timestamp), file_ext
      ORDER BY date ASC, count DESC
    `).all(...params) as { date: string; file_ext: string; count: number }[];

    const map = new Map<string, Record<string, number>>();
    for (const row of rows) {
      if (!map.has(row.date)) {
        map.set(row.date, {});
      }
      map.get(row.date)![row.file_ext || '(none)'] = row.count;
    }

    const result: ExtensionActivity[] = [];
    for (const [date, extensions] of map) {
      result.push({ date, extensions });
    }

    return result;
  }

  getCoChanges(workspace?: string, limit: number = 50): CoChange[] {
    const sessionGroups = this.getSessionBoundaries(workspace);
    const pairCounts = new Map<string, number>();

    for (const group of sessionGroups) {
      const uniqueFiles = [...new Set(group.events.map(e => e.file_path))].sort();

      for (let i = 0; i < uniqueFiles.length; i++) {
        for (let j = i + 1; j < uniqueFiles.length; j++) {
          const key = `${uniqueFiles[i]}\0${uniqueFiles[j]}`;
          pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
        }
      }
    }

    const edges: CoChange[] = [];
    for (const [key, weight] of pairCounts) {
      const [source, target] = key.split('\0');
      edges.push({ source, target, weight });
    }

    edges.sort((a, b) => b.weight - a.weight);
    return edges.slice(0, limit);
  }

  close(): void {
    this.db.close();
  }
}
