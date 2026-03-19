export interface WorkLensConfig {
  version: number;
  watch: {
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
