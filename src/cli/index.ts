import { Command } from 'commander';
import { initCommand } from './init';
import { watchCommand } from './watch';
import { statusCommand } from './status';
import { logCommand } from './log';
import { workspaceAddCommand, workspaceRemoveCommand, workspaceListCommand } from './workspace';
import { dashboardCommand } from './dashboard';

const program = new Command();

program
  .name('worklens')
  .description('Developer-first file/folder watcher with real-time dashboard')
  .version('0.2.0');

program
  .command('init')
  .description('Initialize WorkLens in the current directory')
  .action(() => {
    const cwd = process.cwd();
    initCommand(cwd);
  });

program
  .command('watch')
  .description('Start watching files and serve dashboard')
  .action(async () => {
    const cwd = process.cwd();
    await watchCommand(cwd);
  });

program
  .command('status')
  .description('Show current watch status and statistics')
  .action(() => {
    const cwd = process.cwd();
    statusCommand(cwd);
  });

program
  .command('log')
  .description('Show recent file events')
  .option('-n, --limit <number>', 'Number of events to show', '20')
  .action((options) => {
    const cwd = process.cwd();
    const limit = parseInt(options.limit);
    logCommand(cwd, limit);
  });

const workspaceCmd = program
  .command('workspace')
  .description('Manage workspaces for central dashboard');

workspaceCmd
  .command('add [path]')
  .description('Add a workspace (defaults to current directory)')
  .action((path) => {
    workspaceAddCommand(path);
  });

workspaceCmd
  .command('remove <name>')
  .description('Remove a workspace by name')
  .action((name) => {
    workspaceRemoveCommand(name);
  });

workspaceCmd
  .command('list')
  .description('List all configured workspaces')
  .action(() => {
    workspaceListCommand();
  });

program
  .command('dashboard')
  .description('Start central dashboard for all workspaces')
  .action(async () => {
    await dashboardCommand();
  });

export function run(): void {
  program.parse(process.argv);
}
