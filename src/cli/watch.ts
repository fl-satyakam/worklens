import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { loadConfig, getWorkLensDir, getDbPath } from '../core/config';
import { WorkLensDB } from '../core/db';
import { FileWatcher } from '../core/watcher';
import { FileScanner } from '../core/scanner';
import { WorkLensServer } from '../server';

export async function watchCommand(projectRoot: string): Promise<void> {
  const workLensDir = getWorkLensDir(projectRoot);

  if (!fs.existsSync(workLensDir)) {
    console.log(chalk.red('✗ WorkLens not initialized. Run'), chalk.cyan('worklens init'), chalk.red('first'));
    process.exit(1);
  }

  console.log(chalk.blue('🔍 Starting WorkLens...'));

  // Load config
  const config = loadConfig(projectRoot);

  // Initialize database
  const dbPath = getDbPath(projectRoot);
  const db = new WorkLensDB(dbPath);

  const workspaceName = path.basename(projectRoot);

  // Initialize watcher or scanner based on mode
  let watcher: FileWatcher | null = null;
  let scanner: FileScanner | null = null;
  let eventEmitter: FileWatcher | FileScanner;

  if (config.watch.mode === 'realtime') {
    watcher = new FileWatcher(db, config, projectRoot, workspaceName);
    eventEmitter = watcher;
  } else {
    scanner = new FileScanner(db, config, projectRoot, workspaceName);
    eventEmitter = scanner;
  }

  // Initialize server
  const server = new WorkLensServer(db, eventEmitter, config.dashboard.port);

  // Start watcher/scanner
  if (watcher) {
    watcher.start();
    watcher.on('ready', () => {
      console.log(chalk.green('✓ Real-time file watcher started'));
    });
  } else if (scanner) {
    scanner.start();
    scanner.on('ready', () => {
      console.log(chalk.green(`✓ Interval scanner started (scanning every ${config.watch.intervalSeconds}s)`));
    });

    // Show next scan countdown
    let secondsUntilNextScan = config.watch.intervalSeconds;
    const countdownInterval = setInterval(() => {
      secondsUntilNextScan--;
      if (secondsUntilNextScan <= 0) {
        secondsUntilNextScan = config.watch.intervalSeconds;
      }
    }, 1000);

    scanner.on('scan-complete', () => {
      secondsUntilNextScan = config.watch.intervalSeconds;
    });

    // Store for cleanup
    (scanner as any)._countdownInterval = countdownInterval;
  }

  // Start server
  await server.start();
  console.log(chalk.green(`✓ Dashboard server started at http://localhost:${config.dashboard.port}`));

  // Open browser if configured
  if (config.dashboard.open) {
    const url = `http://localhost:${config.dashboard.port}`;
    const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${command} ${url}`, (error) => {
      if (error) {
        console.log(chalk.yellow(`⚠ Could not open browser automatically. Visit ${url} manually.`));
      }
    });
  }

  console.log();
  if (config.watch.mode === 'realtime') {
    console.log(chalk.white('Watching for file changes in real-time...'));
  } else {
    console.log(chalk.white(`Scanning for file changes every ${config.watch.intervalSeconds} seconds...`));
  }
  console.log(chalk.gray('Press Ctrl+C to stop'));

  // Handle graceful shutdown
  const shutdown = () => {
    console.log();
    console.log(chalk.blue('🔍 Stopping WorkLens...'));

    if (watcher) {
      watcher.stop();
    }
    if (scanner) {
      scanner.stop();
      if ((scanner as any)._countdownInterval) {
        clearInterval((scanner as any)._countdownInterval);
      }
    }

    server.stop().then(() => {
      db.close();
      console.log(chalk.green('✓ WorkLens stopped'));
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Log events to console
  eventEmitter.on('event', (event) => {
    const typeColors: Record<string, any> = {
      create: chalk.green,
      modify: chalk.yellow,
      delete: chalk.red,
      rename: chalk.blue,
    };

    const colorFn = typeColors[event.event_type] || chalk.white;
    const timestamp = new Date(event.timestamp).toLocaleTimeString();

    console.log(
      chalk.gray(`[${timestamp}]`),
      colorFn(event.event_type.toUpperCase().padEnd(8)),
      chalk.white(event.file_path)
    );
  });

  // Log scan summaries for interval mode
  if (scanner) {
    scanner.on('scan', ({ cycle }) => {
      console.log(chalk.cyan(`📊 ${cycle.summary}`));
    });
  }
}
