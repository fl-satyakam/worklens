import chalk from 'chalk';
import * as fs from 'fs';
import { loadConfig, getWorkLensDir, getDbPath } from '../core/config';
import { WorkLensDB } from '../core/db';

export function statusCommand(projectRoot: string): void {
  const workLensDir = getWorkLensDir(projectRoot);

  if (!fs.existsSync(workLensDir)) {
    console.log(chalk.red('✗ WorkLens not initialized'));
    return;
  }

  console.log(chalk.blue('🔍 WorkLens Status'));
  console.log();

  // Check config
  const config = loadConfig(projectRoot);
  console.log(chalk.white('Configuration:'));
  console.log(chalk.gray(`  Dashboard port: ${config.dashboard.port}`));
  console.log(chalk.gray(`  Debounce: ${config.watch.debounceMs}ms`));
  console.log(chalk.gray(`  Watching: ${config.watch.include.join(', ')}`));
  console.log();

  // Check database
  const dbPath = getDbPath(projectRoot);
  if (fs.existsSync(dbPath)) {
    const db = new WorkLensDB(dbPath);
    const stats = db.getStats();

    console.log(chalk.white('Today\'s Activity:'));
    console.log(chalk.gray(`  Total events: ${stats.totalEvents}`));
    console.log(chalk.gray(`  Created: ${chalk.green(stats.createdCount.toString())}`));
    console.log(chalk.gray(`  Modified: ${chalk.yellow(stats.modifiedCount.toString())}`));
    console.log(chalk.gray(`  Deleted: ${chalk.red(stats.deletedCount.toString())}`));

    if (stats.mostActiveFile) {
      console.log(chalk.gray(`  Most active file: ${stats.mostActiveFile}`));
    }

    db.close();
  } else {
    console.log(chalk.gray('No events recorded yet'));
  }
}
