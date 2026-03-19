import chalk from 'chalk';
import * as fs from 'fs';
import { exec } from 'child_process';
import { EventEmitter } from 'events';
import { loadWorkspaces, loadConfig, getGlobalDbPath, getGlobalWorkLensDir } from '../core/config';
import { WorkLensDB } from '../core/db';
import { FileWatcher } from '../core/watcher';
import { FileScanner } from '../core/scanner';
import { WorkLensServer } from '../server';

export async function dashboardCommand(): Promise<void> {
  const workspaces = loadWorkspaces();

  if (workspaces.length === 0) {
    console.log(chalk.yellow('⚠ No workspaces configured.'));
    console.log();
    console.log(chalk.gray('Add workspaces with:'), chalk.cyan('worklens workspace add [path]'));
    process.exit(1);
  }

  console.log(chalk.blue('🔍 Starting WorkLens Dashboard...'));

  // Create global .worklens directory if it doesn't exist
  const globalDir = getGlobalWorkLensDir();
  if (!fs.existsSync(globalDir)) {
    fs.mkdirSync(globalDir, { recursive: true });
  }

  // Use central database
  const dbPath = getGlobalDbPath();
  const db = new WorkLensDB(dbPath);

  const watchers: (FileWatcher | FileScanner)[] = [];
  const combinedEmitter = new EventEmitter();

  // Start watching each enabled workspace
  for (const workspace of workspaces) {
    if (!workspace.enabled) {
      console.log(chalk.gray(`○ Skipping disabled workspace: ${workspace.name}`));
      continue;
    }

    if (!fs.existsSync(workspace.path)) {
      console.log(chalk.yellow(`⚠ Workspace path not found: ${workspace.name} (${workspace.path})`));
      continue;
    }

    // Load workspace config
    const config = loadConfig(workspace.path);

    // Create watcher or scanner based on mode
    let eventEmitter: FileWatcher | FileScanner;

    if (config.watch.mode === 'realtime') {
      const watcher = new FileWatcher(db, config, workspace.path, workspace.name);
      watcher.start();
      watcher.on('ready', () => {
        console.log(chalk.green(`✓ Watching ${workspace.name} (realtime)`));
      });
      eventEmitter = watcher;
    } else {
      const scanner = new FileScanner(db, config, workspace.path, workspace.name);
      scanner.start();
      scanner.on('ready', () => {
        console.log(chalk.green(`✓ Scanning ${workspace.name} (every ${config.watch.intervalSeconds}s)`));
      });
      eventEmitter = scanner;
    }

    // Forward events to combined emitter
    eventEmitter.on('event', (event) => {
      combinedEmitter.emit('event', event);
    });

    watchers.push(eventEmitter);
  }

  if (watchers.length === 0) {
    console.log(chalk.red('✗ No active workspaces to watch'));
    process.exit(1);
  }

  // Initialize server with combined emitter
  const port = 3377; // Default dashboard port
  const server = new WorkLensServer(db, combinedEmitter, port);

  // Start server
  await server.start();
  console.log(chalk.green(`✓ Dashboard server started at http://localhost:${port}`));

  // Open browser
  const url = `http://localhost:${port}`;
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${command} ${url}`, (error) => {
    if (error) {
      console.log(chalk.yellow(`⚠ Could not open browser automatically. Visit ${url} manually.`));
    }
  });

  console.log();
  console.log(chalk.white(`Watching ${watchers.length} workspace${watchers.length !== 1 ? 's' : ''}...`));
  console.log(chalk.gray('Press Ctrl+C to stop'));

  // Handle graceful shutdown
  const shutdown = () => {
    console.log();
    console.log(chalk.blue('🔍 Stopping WorkLens Dashboard...'));

    for (const watcher of watchers) {
      watcher.stop();
    }

    server.stop().then(() => {
      db.close();
      console.log(chalk.green('✓ Dashboard stopped'));
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Log events to console
  combinedEmitter.on('event', (event) => {
    const typeColors: Record<string, any> = {
      create: chalk.green,
      modify: chalk.yellow,
      delete: chalk.red,
      rename: chalk.blue,
    };

    const colorFn = typeColors[event.event_type] || chalk.white;
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    const workspaceLabel = event.workspace ? chalk.magenta(`[${event.workspace}]`) : '';

    console.log(
      chalk.gray(`[${timestamp}]`),
      workspaceLabel,
      colorFn(event.event_type.toUpperCase().padEnd(8)),
      chalk.white(event.file_path)
    );
  });
}
