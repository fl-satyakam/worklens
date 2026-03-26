export interface FileEvent {
  id?: number;
  timestamp: string;
  event_type: 'create' | 'modify' | 'delete' | 'rename';
  file_path: string;
  file_ext: string;
  file_size_bytes: number | null;
  diff_summary: string | null;
  workspace?: string | null;
  scan_cycle_id?: number | null;
}

export interface Stats {
  totalEvents: number;
  mostActiveFile: string | null;
  mostActiveHour: number | null;
  createdCount: number;
  modifiedCount: number;
  deletedCount: number;
}

export interface TimelineData {
  hour: number;
  count: number;
}

export interface HeatmapData {
  path: string;
  count: number;
}

export interface ScanCycle {
  id?: number;
  timestamp: string;
  event_count: number;
  summary: string;
  files_created: number;
  files_modified: number;
  files_deleted: number;
  workspace: string;
}

export interface Workspace {
  name: string;
  path: string;
  enabled: boolean;
}

export interface Session {
  id: number;
  startTime: string;
  endTime: string;
  durationMs: number;
  eventCount: number;
  filesChanged: number;
  fileTypes: Record<string, number>;
  creates: number;
  modifies: number;
  deletes: number;
}

export interface CodebaseNode {
  name: string;
  path: string;
  children: CodebaseNode[];
  eventCount: number;
  lastModified: string | null;
}

export interface DailyActivity {
  date: string;
  count: number;
}

export interface ExtensionActivity {
  date: string;
  extensions: Record<string, number>;
}

export interface CoChange {
  source: string;
  target: string;
  weight: number;
}

const API_BASE = '/api';

export const api = {
  async getEvents(limit = 100, offset = 0, type?: string, workspace?: string) {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    if (type) params.append('type', type);
    if (workspace) params.append('workspace', workspace);

    const response = await fetch(`${API_BASE}/events?${params}`);
    return response.json();
  },

  async getStats(workspace?: string): Promise<Stats> {
    const params = workspace ? `?workspace=${workspace}` : '';
    const response = await fetch(`${API_BASE}/stats${params}`);
    return response.json();
  },

  async getTimeline(hours = 24, workspace?: string): Promise<TimelineData[]> {
    const params = new URLSearchParams({ hours: hours.toString() });
    if (workspace) params.append('workspace', workspace);
    const response = await fetch(`${API_BASE}/timeline?${params}`);
    return response.json();
  },

  async getHeatmap(limit = 50, workspace?: string): Promise<HeatmapData[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (workspace) params.append('workspace', workspace);
    const response = await fetch(`${API_BASE}/heatmap?${params}`);
    return response.json();
  },

  async getCycles(limit = 20, workspace?: string): Promise<{ cycles: ScanCycle[]; limit: number }> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (workspace) params.append('workspace', workspace);
    const response = await fetch(`${API_BASE}/cycles?${params}`);
    return response.json();
  },

  async getWorkspaces(): Promise<{ workspaces: Workspace[] }> {
    const response = await fetch(`${API_BASE}/workspaces`);
    return response.json();
  },

  async addWorkspace(name: string, path: string): Promise<void> {
    const response = await fetch(`${API_BASE}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, path }),
    });
    if (!response.ok) throw new Error('Failed to add workspace');
  },

  async removeWorkspace(name: string): Promise<void> {
    const response = await fetch(`${API_BASE}/workspaces/${name}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove workspace');
  },

  async getSessions(workspace?: string): Promise<Session[]> {
    const params = workspace ? `?workspace=${workspace}` : '';
    const response = await fetch(`${API_BASE}/sessions${params}`);
    return response.json();
  },

  async getCodebase(workspace?: string): Promise<CodebaseNode> {
    const params = workspace ? `?workspace=${workspace}` : '';
    const response = await fetch(`${API_BASE}/codebase${params}`);
    return response.json();
  },

  async getDailyActivity(days = 90, workspace?: string): Promise<DailyActivity[]> {
    const params = new URLSearchParams({ days: days.toString() });
    if (workspace) params.append('workspace', workspace);
    const response = await fetch(`${API_BASE}/activity/daily?${params}`);
    return response.json();
  },

  async getActivityByExtension(days = 30, workspace?: string): Promise<ExtensionActivity[]> {
    const params = new URLSearchParams({ days: days.toString() });
    if (workspace) params.append('workspace', workspace);
    const response = await fetch(`${API_BASE}/activity/by-extension?${params}`);
    return response.json();
  },

  async getCoChanges(workspace?: string, limit = 50): Promise<CoChange[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (workspace) params.append('workspace', workspace);
    const response = await fetch(`${API_BASE}/cochanges?${params}`);
    return response.json();
  },
};
