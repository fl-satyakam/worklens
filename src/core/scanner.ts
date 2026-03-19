import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import * as Diff from 'diff';
import { WorkLensDB } from './db';
import { WorkLensConfig, FileEvent, FileSnapshot, ScanCycle } from '../types';

const MAX_CACHE_SIZE = 2 * 1024 * 1024; // 2MB max file size for caching
const MAX_DIFF_LENGTH = 5000; // max chars stored in diff_summary

function isBinaryPath(filePath: string): boolean {
  const binaryExts = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg',
    '.mp4', '.mp3', '.wav', '.ogg', '.webm',
    '.zip', '.gz', '.tar', '.rar', '.7z',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.woff', '.woff2', '.ttf', '.eot',
    '.exe', '.dll', '.so', '.dylib',
    '.db', '.sqlite', '.sqlite3',
    '.pyc', '.class', '.o',
  ]);
  return binaryExts.has(path.extname(filePath).toLowerCase());
}

function safeReadFile(absPath: string): string | null {
  try {
    const stats = fs.statSync(absPath);
    if (stats.size > MAX_CACHE_SIZE) return null;
    return fs.readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
}

function computeHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

export class FileScanner extends EventEmitter {
  private db: WorkLensDB;
  private config: WorkLensConfig;
  private projectRoot: string;
  private workspaceName: string;
  private scanInterval: NodeJS.Timeout | null = null;
  private scanCount = 0;

  constructor(db: WorkLensDB, config: WorkLensConfig, projectRoot: string, workspaceName: string) {
    super();
    this.db = db;
    this.config = config;
    this.projectRoot = projectRoot;
    this.workspaceName = workspaceName;
  }

  private shouldIgnore(rel: string): boolean {
    for (const pattern of this.config.watch.exclude) {
      if (pattern.endsWith('/**')) {
        const dir = pattern.slice(0, -3);
        if (rel === dir || rel.startsWith(dir + '/')) return true;
      } else if (pattern.startsWith('*.')) {
        const ext = pattern.slice(1);
        if (rel.endsWith(ext)) return true;
      } else if (rel === pattern || rel.startsWith(pattern + '/')) {
        return true;
      }
    }
    return false;
  }

  private walkDirectory(dir: string, files: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const absPath = path.join(dir, entry.name);
      const relPath = path.relative(this.projectRoot, absPath);

      if (this.shouldIgnore(relPath)) {
        continue;
      }

      if (entry.isDirectory()) {
        this.walkDirectory(absPath, files);
      } else if (entry.isFile()) {
        files.push(relPath);
      }
    }

    return files;
  }

  async performScan(): Promise<void> {
    this.scanCount++;
    const scanTimestamp = new Date().toISOString();
    const events: FileEvent[] = [];

    try {
      // Get all current files on disk
      const currentFiles = new Set(this.walkDirectory(this.projectRoot));

      // Get all snapshots from database
      const snapshots = this.db.getAllSnapshots(this.workspaceName);
      const snapshotMap = new Map<string, FileSnapshot>();
      for (const snapshot of snapshots) {
        snapshotMap.set(snapshot.file_path, snapshot);
      }

      // Process each current file
      for (const filePath of currentFiles) {
        const absPath = path.join(this.projectRoot, filePath);
        let stats: fs.Stats;

        try {
          stats = fs.statSync(absPath);
        } catch {
          continue; // File gone between scan start and now
        }

        const snapshot = snapshotMap.get(filePath);

        if (!snapshot) {
          // NEW FILE - CREATE event
          const event = this.createFileEvent('create', filePath, absPath, stats, null);
          if (event) events.push(event);

          // Save snapshot
          this.saveSnapshot(filePath, absPath, stats);
        } else {
          // Existing file - check if modified
          if (stats.mtimeMs !== snapshot.mtime || stats.size !== snapshot.size) {
            // Potentially modified - check hash
            if (!isBinaryPath(filePath)) {
              const content = safeReadFile(absPath);
              if (content !== null) {
                const hash = computeHash(content);
                if (hash !== snapshot.content_hash) {
                  // MODIFIED - hash differs
                  const event = this.createFileEvent('modify', filePath, absPath, stats, snapshot);
                  if (event) events.push(event);

                  // Update snapshot
                  this.saveSnapshot(filePath, absPath, stats);
                }
              }
            } else {
              // Binary file changed (by size/mtime)
              const event = this.createFileEvent('modify', filePath, absPath, stats, snapshot);
              if (event) events.push(event);

              // Update snapshot
              this.saveSnapshot(filePath, absPath, stats);
            }
          }

          // Mark as seen
          snapshotMap.delete(filePath);
        }
      }

      // Remaining snapshots are deleted files
      for (const [filePath, snapshot] of snapshotMap) {
        const event = this.createDeleteEvent(filePath, snapshot);
        if (event) events.push(event);

        // Remove snapshot
        this.db.deleteSnapshot(filePath, this.workspaceName);
      }

      // Create scan cycle summary
      if (events.length > 0) {
        const summary = this.generateSummary(events);
        const cycle: ScanCycle = {
          timestamp: scanTimestamp,
          event_count: events.length,
          summary,
          files_created: events.filter(e => e.event_type === 'create').length,
          files_modified: events.filter(e => e.event_type === 'modify').length,
          files_deleted: events.filter(e => e.event_type === 'delete').length,
          workspace: this.workspaceName,
        };

        const cycleId = this.db.insertScanCycle(cycle);

        // Update events with cycle ID and insert
        for (const event of events) {
          event.scan_cycle_id = cycleId;
          this.db.insertEvent(event);
          this.emit('event', event);
        }

        this.emit('scan', { cycle, events });
      }

      this.emit('scan-complete', { scanCount: this.scanCount, eventCount: events.length });
    } catch (error) {
      console.error('Scan error:', error);
      this.emit('error', error);
    }
  }

  private createFileEvent(
    eventType: 'create' | 'modify',
    filePath: string,
    absPath: string,
    stats: fs.Stats,
    oldSnapshot: FileSnapshot | null
  ): FileEvent | null {
    const ext = path.extname(filePath);
    let diffSummary: string | null = null;

    if (!isBinaryPath(filePath)) {
      const newContent = safeReadFile(absPath);

      if (newContent !== null) {
        if (eventType === 'modify' && oldSnapshot) {
          // Generate unified diff
          const patch = Diff.createPatch(
            filePath,
            oldSnapshot.content,
            newContent,
            'before',
            'after',
            { context: 3 }
          );
          const patchLines = patch.split('\n');
          const body = patchLines.slice(4).join('\n').trim();
          if (body) {
            diffSummary = body.substring(0, MAX_DIFF_LENGTH);
          }
        } else if (eventType === 'create') {
          // Show the new file content as additions
          const lines = newContent.split('\n');
          if (lines.length <= 50) {
            diffSummary = lines.map(l => `+ ${l}`).join('\n').substring(0, MAX_DIFF_LENGTH);
          } else {
            diffSummary = lines.slice(0, 50).map(l => `+ ${l}`).join('\n').substring(0, MAX_DIFF_LENGTH)
              + `\n... +${lines.length - 50} more lines`;
          }
        }
      }
    } else {
      diffSummary = `[binary file: ${ext}]`;
    }

    return {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      file_path: filePath,
      file_ext: ext,
      file_size_bytes: stats.size,
      diff_summary: diffSummary,
      workspace: this.workspaceName,
    };
  }

  private createDeleteEvent(filePath: string, snapshot: FileSnapshot): FileEvent | null {
    const ext = path.extname(filePath);
    let diffSummary: string | null = null;

    // Show what was removed
    if (snapshot.content) {
      const lines = snapshot.content.split('\n');
      diffSummary = lines.map(l => `- ${l}`).join('\n').substring(0, MAX_DIFF_LENGTH);
    } else {
      diffSummary = `[deleted: ${ext}]`;
    }

    return {
      timestamp: new Date().toISOString(),
      event_type: 'delete',
      file_path: filePath,
      file_ext: ext,
      file_size_bytes: null,
      diff_summary: diffSummary,
      workspace: this.workspaceName,
    };
  }

  private saveSnapshot(filePath: string, absPath: string, stats: fs.Stats): void {
    const isBinary = isBinaryPath(filePath);
    let content = '';
    let hash = '';

    if (!isBinary) {
      const readContent = safeReadFile(absPath);
      if (readContent !== null) {
        content = readContent;
        hash = computeHash(content);
      }
    }

    const snapshot: FileSnapshot = {
      file_path: filePath,
      workspace: this.workspaceName,
      mtime: stats.mtimeMs,
      size: stats.size,
      content_hash: hash,
      content: content,
      last_seen_at: new Date().toISOString(),
    };

    this.db.upsertSnapshot(snapshot);
  }

  private generateSummary(events: FileEvent[]): string {
    const creates = events.filter(e => e.event_type === 'create');
    const modifies = events.filter(e => e.event_type === 'modify');
    const deletes = events.filter(e => e.event_type === 'delete');

    const parts: string[] = [];

    // Group by directory
    const byDir = new Map<string, { creates: number; modifies: number; deletes: number }>();

    for (const event of events) {
      const dir = path.dirname(event.file_path) || '.';
      const existing = byDir.get(dir) || { creates: 0, modifies: 0, deletes: 0 };

      if (event.event_type === 'create') existing.creates++;
      else if (event.event_type === 'modify') existing.modifies++;
      else if (event.event_type === 'delete') existing.deletes++;

      byDir.set(dir, existing);
    }

    // Mention important files
    const importantFiles = ['package.json', 'package-lock.json', 'tsconfig.json', 'README.md', 'config.yml', '.env'];
    const importantEvents = events.filter(e => importantFiles.some(f => e.file_path.endsWith(f)));

    if (importantEvents.length > 0) {
      const fileNames = importantEvents.map(e => path.basename(e.file_path)).join(', ');
      parts.push(`Important: ${fileNames}`);
    }

    // Top directories
    const topDirs = Array.from(byDir.entries())
      .sort((a, b) => (b[1].creates + b[1].modifies + b[1].deletes) - (a[1].creates + a[1].modifies + a[1].deletes))
      .slice(0, 3);

    for (const [dir, counts] of topDirs) {
      const dirParts: string[] = [];
      if (counts.creates > 0) dirParts.push(`${counts.creates} new`);
      if (counts.modifies > 0) dirParts.push(`${counts.modifies} modified`);
      if (counts.deletes > 0) dirParts.push(`${counts.deletes} deleted`);

      parts.push(`${dir === '.' ? 'root' : dir}: ${dirParts.join(', ')}`);
    }

    const summary = `Scan #${this.scanCount}: ${events.length} change${events.length !== 1 ? 's' : ''} — ${parts.join(' • ')}`;
    return summary.substring(0, 500); // Keep it concise
  }

  start(): void {
    // Perform initial scan immediately
    this.emit('ready');
    this.performScan();

    // Schedule periodic scans
    const intervalMs = this.config.watch.intervalSeconds * 1000;
    this.scanInterval = setInterval(() => {
      this.performScan();
    }, intervalMs);
  }

  stop(): void {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  getNextScanTime(): number {
    const intervalMs = this.config.watch.intervalSeconds * 1000;
    return intervalMs;
  }
}
