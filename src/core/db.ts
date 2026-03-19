import Database from 'better-sqlite3';
import { FileEvent, Stats, TimelineData, HeatmapData, ScanCycle, FileSnapshot } from '../types';

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

  close(): void {
    this.db.close();
  }
}
