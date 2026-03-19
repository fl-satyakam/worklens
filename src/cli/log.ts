import chalk from 'chalk';
import * as fs from 'fs';
import { getWorkLensDir, getDbPath } from '../core/config';
import { WorkLensDB } from '../core/db';

export function logCommand(projectRoot: string, limit: number = 20): void {
  const workLensDir = getWorkLensDir(projectRoot);

  if (!fs.existsSync(workLensDir)) {
    console.log(chalk.red('✗ WorkLens not initialized'));
    return;
  }

  const dbPath = getDbPath(projectRoot);
  if (!fs.existsSync(dbPath)) {
    console.log(chalk.gray('No events recorded yet'));
    return;
  }

  const db = new WorkLensDB(dbPath);
  const events = db.getEvents(limit);

  if (events.length === 0) {
    console.log(chalk.gray('No events recorded yet'));
    db.close();
    return;
  }

  console.log(chalk.blue(`🔍 Recent Events (last ${events.length})`));
  console.log();

  const typeColors: Record<string, any> = {
    create: chalk.green,
    modify: chalk.yellow,
    delete: chalk.red,
    rename: chalk.blue,
  };

  events.forEach((event) => {
    const colorFn = typeColors[event.event_type] || chalk.white;
    const timestamp = new Date(event.timestamp).toLocaleString();

    console.log(
      chalk.gray(`[${timestamp}]`),
      colorFn(event.event_type.toUpperCase().padEnd(8)),
      chalk.white(event.file_path),
      event.file_size_bytes ? chalk.gray(`(${event.file_size_bytes} bytes)`) : ''
    );
  });

  db.close();
}
