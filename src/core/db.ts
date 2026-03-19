import Database from 'better-sqlite3';
import { FileEvent, Stats, TimelineData, HeatmapData } from '../types';

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
        diff_summary TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_event_type ON events(event_type);
      CREATE INDEX IF NOT EXISTS idx_file_path ON events(file_path);
    `);
  }

  insertEvent(event: FileEvent): void {
    const stmt = this.db.prepare(`
      INSERT INTO events (timestamp, event_type, file_path, file_ext, file_size_bytes, diff_summary)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.timestamp,
      event.event_type,
      event.file_path,
      event.file_ext,
      event.file_size_bytes,
      event.diff_summary
    );
  }

  getEvents(limit: number = 100, offset: number = 0, type?: string): FileEvent[] {
    let query = 'SELECT * FROM events';
    const params: any[] = [];

    if (type) {
      query += ' WHERE event_type = ?';
      params.push(type);
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as FileEvent[];
  }

  getStats(): Stats {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const totalEvents = this.db.prepare('SELECT COUNT(*) as count FROM events WHERE timestamp >= ?').get(todayISO) as { count: number };

    const mostActiveFile = this.db.prepare(`
      SELECT file_path, COUNT(*) as count
      FROM events
      WHERE timestamp >= ?
      GROUP BY file_path
      ORDER BY count DESC
      LIMIT 1
    `).get(todayISO) as { file_path: string; count: number } | undefined;

    const mostActiveHour = this.db.prepare(`
      SELECT strftime('%H', timestamp) as hour, COUNT(*) as count
      FROM events
      WHERE timestamp >= ?
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `).get(todayISO) as { hour: string; count: number } | undefined;

    const counts = this.db.prepare(`
      SELECT
        SUM(CASE WHEN event_type = 'create' THEN 1 ELSE 0 END) as created,
        SUM(CASE WHEN event_type = 'modify' THEN 1 ELSE 0 END) as modified,
        SUM(CASE WHEN event_type = 'delete' THEN 1 ELSE 0 END) as deleted
      FROM events
      WHERE timestamp >= ?
    `).get(todayISO) as { created: number; modified: number; deleted: number };

    return {
      totalEvents: totalEvents.count,
      mostActiveFile: mostActiveFile?.file_path || null,
      mostActiveHour: mostActiveHour ? parseInt(mostActiveHour.hour) : null,
      createdCount: counts.created || 0,
      modifiedCount: counts.modified || 0,
      deletedCount: counts.deleted || 0,
    };
  }

  getTimeline(hours: number = 24): TimelineData[] {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const results = this.db.prepare(`
      SELECT strftime('%H', timestamp) as hour, COUNT(*) as count
      FROM events
      WHERE timestamp >= ?
      GROUP BY hour
      ORDER BY hour
    `).all(since) as { hour: string; count: number }[];

    return results.map(r => ({
      hour: parseInt(r.hour),
      count: r.count,
    }));
  }

  getHeatmap(limit: number = 50): HeatmapData[] {
    const results = this.db.prepare(`
      SELECT file_path as path, COUNT(*) as count
      FROM events
      GROUP BY file_path
      ORDER BY count DESC
      LIMIT ?
    `).all(limit) as HeatmapData[];

    return results;
  }

  close(): void {
    this.db.close();
  }
}
