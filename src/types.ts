export type WatchMode = 'realtime' | 'interval';

export interface WorkLensConfig {
  version: number;
  watch: {
    mode: WatchMode;
    intervalSeconds: number;
    include: string[];
    exclude: string[];
    debounceMs: number;
  };
  dashboard: {
    port: number;
    open: boolean;
  };
}

export type EventType = 'create' | 'modify' | 'delete' | 'rename';

export interface FileEvent {
  id?: number;
  timestamp: string;
  event_type: EventType;
  file_path: string;
  file_ext: string;
  file_size_bytes: number | null;
  diff_summary: string | null;
  workspace?: string | null;
  scan_cycle_id?: number | null;
}

export interface FileSnapshot {
  file_path: string;
  mtime: number;
  size: number;
  content_hash: string;
  content: string;
  last_seen_at: string;
  workspace: string;
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
