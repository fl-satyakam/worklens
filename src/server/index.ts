import express, { Express } from 'express';
import * as path from 'path';
import { EventEmitter } from 'events';
import { WorkLensDB } from '../core/db';
import { SSEManager } from './sse';
import { createAPIRouter } from './api';

export class WorkLensServer {
  private app: Express;
  private server: any;
  private sseManager: SSEManager;
  private db: WorkLensDB;
  private eventEmitter: EventEmitter;
  private port: number;

  constructor(db: WorkLensDB, eventEmitter: EventEmitter, port: number) {
    this.db = db;
    this.eventEmitter = eventEmitter;
    this.port = port;
    this.sseManager = new SSEManager();
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWatcherEvents();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api', createAPIRouter(this.db, this.sseManager));

    // Serve dashboard static files
    const dashboardPath = path.join(__dirname, '../../dashboard/dist');
    this.app.use(express.static(dashboardPath));

    // SPA fallback
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(dashboardPath, 'index.html'));
    });
  }

  private setupWatcherEvents(): void {
    this.eventEmitter.on('event', (event) => {
      this.sseManager.broadcast(event);
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getPort(): number {
    return this.port;
  }
}
