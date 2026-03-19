import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import * as Diff from 'diff';
import { WorkLensDB } from './db';
import { WorkLensConfig, FileEvent, EventType } from '../types';

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

export class FileWatcher extends EventEmitter {
  private watcher: chokidar.FSWatcher | null = null;
  private db: WorkLensDB;
  private config: WorkLensConfig;
  private projectRoot: string;
  private fileCache = new Map<string, string>();

  constructor(db: WorkLensDB, config: WorkLensConfig, projectRoot: string) {
    super();
    this.db = db;
    this.config = config;
    this.projectRoot = projectRoot;
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

  start(): void {
    const watchPath = this.projectRoot;

    this.watcher = chokidar.watch(watchPath, {
      ignored: (filePath: string) => {
        const rel = path.relative(this.projectRoot, filePath);
        if (!rel || rel === '.' || rel.startsWith('..')) return false;
        return this.shouldIgnore(rel);
      },
      persistent: true,
      ignoreInitial: false, // we want initial scan to populate cache
      usePolling: false,
      awaitWriteFinish: false,
    });

    // On initial scan, cache file contents silently (no events emitted)
    let ready = false;

    this.watcher
      .on('add', (absPath) => {
        const rel = path.relative(this.projectRoot, absPath);
        if (!rel || rel.startsWith('..')) return;
        // Cache content for future diffs
        if (!isBinaryPath(rel)) {
          const content = safeReadFile(absPath);
          if (content !== null) this.fileCache.set(rel, content);
        }
        if (ready) this.handleEvent('create', rel);
      })
      .on('change', (absPath) => {
        const rel = path.relative(this.projectRoot, absPath);
        if (!rel || rel.startsWith('..')) return;
        if (ready) this.handleEvent('modify', rel);
      })
      .on('unlink', (absPath) => {
        const rel = path.relative(this.projectRoot, absPath);
        if (!rel || rel.startsWith('..')) return;
        if (ready) this.handleEvent('delete', rel);
      })
      .on('ready', () => {
        ready = true;
        this.emit('ready');
      })
      .on('error', (err) => console.error('Watcher error:', err));
  }

  private handleEvent(eventType: EventType, filePath: string): void {
    const absolutePath = path.join(this.projectRoot, filePath);
    const ext = path.extname(filePath);
    let fileSize: number | null = null;
    let diffSummary: string | null = null;

    if (eventType === 'delete') {
      // For deletes, show what was removed
      const oldContent = this.fileCache.get(filePath);
      if (oldContent !== undefined) {
        const lines = oldContent.split('\n');
        diffSummary = lines.map(l => `- ${l}`).join('\n').substring(0, MAX_DIFF_LENGTH);
      }
      this.fileCache.delete(filePath);
    } else {
      try {
        const stats = fs.statSync(absolutePath);
        fileSize = stats.size;
      } catch {
        return; // file gone
      }

      if (!isBinaryPath(filePath)) {
        const newContent = safeReadFile(absolutePath);

        if (newContent !== null) {
          if (eventType === 'modify') {
            const oldContent = this.fileCache.get(filePath) || '';
            // Generate unified diff
            const patch = Diff.createPatch(
              filePath,
              oldContent,
              newContent,
              'before',
              'after',
              { context: 3 }
            );
            // Strip the header (first 4 lines) and truncate
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

          // Update cache
          this.fileCache.set(filePath, newContent);
        }
      } else {
        diffSummary = `[binary file: ${ext}]`;
        this.fileCache.delete(filePath);
      }
    }

    const event: FileEvent = {
      timestamp: new Date().toISOString(),
      event_type: eventType,
      file_path: filePath,
      file_ext: ext,
      file_size_bytes: fileSize,
      diff_summary: diffSummary,
    };

    this.db.insertEvent(event);
    this.emit('event', event);
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
