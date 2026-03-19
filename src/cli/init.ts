import chalk from 'chalk';
import { initWorkLens } from '../core/config';

export function initCommand(projectRoot: string): void {
  console.log(chalk.blue('🔍 Initializing WorkLens...'));

  const created = initWorkLens(projectRoot);

  if (created) {
    console.log(chalk.green('✓ Created .worklens/ directory'));
    console.log(chalk.green('✓ Created config.yml'));
    console.log(chalk.green('✓ Created .gitignore'));
    console.log();
    console.log(chalk.white('Next step: Run'), chalk.cyan('worklens watch'), chalk.white('to start watching'));
  } else {
    console.log(chalk.yellow('⚠ WorkLens is already initialized in this directory'));
  }
}
