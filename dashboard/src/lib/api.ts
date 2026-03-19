export interface FileEvent {
  id?: number;
  timestamp: string;
  event_type: 'create' | 'modify' | 'delete' | 'rename';
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

const API_BASE = '/api';

export const api = {
  async getEvents(limit = 100, offset = 0, type?: string) {
    const params = new URLSearchParams({ limit: limit.toString(), offset: offset.toString() });
    if (type) params.append('type', type);

    const response = await fetch(`${API_BASE}/events?${params}`);
    return response.json();
  },

  async getStats(): Promise<Stats> {
    const response = await fetch(`${API_BASE}/stats`);
    return response.json();
  },

  async getTimeline(hours = 24): Promise<TimelineData[]> {
    const response = await fetch(`${API_BASE}/timeline?hours=${hours}`);
    return response.json();
  },

  async getHeatmap(limit = 50): Promise<HeatmapData[]> {
    const response = await fetch(`${API_BASE}/heatmap?limit=${limit}`);
    return response.json();
  },
};
