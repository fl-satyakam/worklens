import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import { WorkLensDB } from './db';
import { WorkLensConfig, FileEvent, EventType } from '../types';

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
      ignoreInitial: true,
      usePolling: false,
      awaitWriteFinish: false,
    });

    this.watcher
      .on('add', (filePath) => this.handleEvent('create', path.relative(this.projectRoot, filePath)))
      .on('change', (filePath) => this.handleEvent('modify', path.relative(this.projectRoot, filePath)))
      .on('unlink', (filePath) => this.handleEvent('delete', path.relative(this.projectRoot, filePath)))
      .on('ready', () => this.emit('ready'))
      .on('error', (err) => console.error('Watcher error:', err));
  }

  private handleEvent(eventType: EventType, filePath: string): void {
    if (!filePath || filePath.startsWith('..')) return;

    const absolutePath = path.join(this.projectRoot, filePath);
    const ext = path.extname(filePath);
    let fileSize: number | null = null;
    let diffSummary: string | null = null;

    if (eventType !== 'delete') {
      try {
        const stats = fs.statSync(absolutePath);
        fileSize = stats.size;

        if (eventType === 'modify' && this.fileCache.has(filePath)) {
          const oldContent = this.fileCache.get(filePath) || '';
          const newContent = fs.readFileSync(absolutePath, 'utf8').substring(0, 500);
          if (oldContent !== newContent) {
            diffSummary = `${oldContent.length} -> ${newContent.length} chars`;
          }
        }

        if (stats.size < 1000000) {
          try {
            this.fileCache.set(filePath, fs.readFileSync(absolutePath, 'utf8').substring(0, 500));
          } catch (e) {
            // Binary file
          }
        }
      } catch (error) {
        // File might have been deleted between event and stat
      }
    } else {
      this.fileCache.delete(filePath);
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
