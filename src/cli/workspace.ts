import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { loadWorkspaces, addWorkspace, removeWorkspace } from '../core/config';
import { initCommand } from './init';

export function workspaceAddCommand(workspacePath?: string): void {
  const targetPath = workspacePath || process.cwd();
  const absPath = path.resolve(targetPath);

  if (!fs.existsSync(absPath)) {
    console.log(chalk.red('✗ Path does not exist:'), chalk.white(absPath));
    process.exit(1);
  }

  if (!fs.statSync(absPath).isDirectory()) {
    console.log(chalk.red('✗ Path is not a directory:'), chalk.white(absPath));
    process.exit(1);
  }

  const name = path.basename(absPath);

  // Initialize WorkLens in this project if not already done
  const workLensDir = path.join(absPath, '.worklens');
  if (!fs.existsSync(workLensDir)) {
    console.log(chalk.blue('Initializing WorkLens in workspace...'));
    initCommand(absPath);
  }

  try {
    addWorkspace(name, absPath);
    console.log(chalk.green('✓ Workspace added:'), chalk.white(name));
    console.log(chalk.gray(`  Path: ${absPath}`));
  } catch (error) {
    console.log(chalk.red('✗ Failed to add workspace:'), (error as Error).message);
    process.exit(1);
  }
}

export function workspaceRemoveCommand(name: string): void {
  const removed = removeWorkspace(name);

  if (removed) {
    console.log(chalk.green('✓ Workspace removed:'), chalk.white(name));
  } else {
    console.log(chalk.red('✗ Workspace not found:'), chalk.white(name));
    process.exit(1);
  }
}

export function workspaceListCommand(): void {
  const workspaces = loadWorkspaces();

  if (workspaces.length === 0) {
    console.log(chalk.yellow('No workspaces configured.'));
    console.log();
    console.log(chalk.gray('Add a workspace with:'), chalk.cyan('worklens workspace add [path]'));
    return;
  }

  console.log(chalk.blue('Configured Workspaces:'));
  console.log();

  for (const workspace of workspaces) {
    const statusIcon = workspace.enabled ? chalk.green('✓') : chalk.gray('○');
    const status = workspace.enabled ? chalk.green('enabled') : chalk.gray('disabled');

    console.log(`  ${statusIcon} ${chalk.white(workspace.name)} ${chalk.gray('—')} ${status}`);
    console.log(chalk.gray(`     ${workspace.path}`));
    console.log();
  }
}
