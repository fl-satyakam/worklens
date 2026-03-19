import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { WorkLensConfig, Workspace } from '../types';

const DEFAULT_CONFIG: WorkLensConfig = {
  version: 1,
  watch: {
    mode: 'interval',
    intervalSeconds: 120,
    include: ['**/*'],
    exclude: ['node_modules/**', '.git/**', 'dist/**', '.worklens/**', '*.lock'],
    debounceMs: 300,
  },
  dashboard: {
    port: 3377,
    open: true,
  },
};

export function getWorkLensDir(projectRoot: string): string {
  return path.join(projectRoot, '.worklens');
}

export function getConfigPath(projectRoot: string): string {
  return path.join(getWorkLensDir(projectRoot), 'config.yml');
}

export function getDbPath(projectRoot: string): string {
  return path.join(getWorkLensDir(projectRoot), 'events.db');
}

export function getGlobalWorkLensDir(): string {
  return path.join(os.homedir(), '.worklens');
}

export function getGlobalDbPath(): string {
  return path.join(getGlobalWorkLensDir(), 'worklens.db');
}

export function getWorkspacesConfigPath(): string {
  return path.join(getGlobalWorkLensDir(), 'workspaces.yml');
}

export function loadConfig(projectRoot: string): WorkLensConfig {
  const configPath = getConfigPath(projectRoot);

  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(content) as WorkLensConfig;
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error('Error loading config, using defaults:', error);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(projectRoot: string, config: WorkLensConfig): void {
  const configPath = getConfigPath(projectRoot);
  const content = yaml.dump(config);
  fs.writeFileSync(configPath, content, 'utf8');
}

export function initWorkLens(projectRoot: string): boolean {
  const workLensDir = getWorkLensDir(projectRoot);

  if (fs.existsSync(workLensDir)) {
    return false; // Already initialized
  }

  // Create .worklens directory
  fs.mkdirSync(workLensDir, { recursive: true });

  // Create config.yml
  saveConfig(projectRoot, DEFAULT_CONFIG);

  // Create .gitignore
  const gitignorePath = path.join(workLensDir, '.gitignore');
  fs.writeFileSync(gitignorePath, 'events.db\n*.db\n', 'utf8');

  return true;
}

export function loadWorkspaces(): Workspace[] {
  const workspacesPath = getWorkspacesConfigPath();

  if (!fs.existsSync(workspacesPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(workspacesPath, 'utf8');
    const data = yaml.load(content) as { workspaces: Workspace[] } | null;
    return data?.workspaces || [];
  } catch (error) {
    console.error('Error loading workspaces:', error);
    return [];
  }
}

export function saveWorkspaces(workspaces: Workspace[]): void {
  const globalDir = getGlobalWorkLensDir();
  if (!fs.existsSync(globalDir)) {
    fs.mkdirSync(globalDir, { recursive: true });
  }

  const workspacesPath = getWorkspacesConfigPath();
  const content = yaml.dump({ workspaces });
  fs.writeFileSync(workspacesPath, content, 'utf8');
}

export function addWorkspace(name: string, workspacePath: string): void {
  const workspaces = loadWorkspaces();

  // Check if workspace already exists
  if (workspaces.some(w => w.name === name || w.path === workspacePath)) {
    throw new Error('Workspace with this name or path already exists');
  }

  workspaces.push({
    name,
    path: workspacePath,
    enabled: true,
  });

  saveWorkspaces(workspaces);
}

export function removeWorkspace(name: string): boolean {
  const workspaces = loadWorkspaces();
  const filtered = workspaces.filter(w => w.name !== name);

  if (filtered.length === workspaces.length) {
    return false; // Not found
  }

  saveWorkspaces(filtered);
  return true;
}
