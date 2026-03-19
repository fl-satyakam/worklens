import { useState, useEffect, useCallback } from 'react';
import { api, FileEvent, Stats, TimelineData, HeatmapData } from './lib/api';
import { useSSE } from './hooks/useSSE';
import Header from './components/Header';
import EventFeed from './components/EventFeed';
import Timeline from './components/Timeline';
import FileHeatmap from './components/FileHeatmap';
import StatsPanel from './components/StatsPanel';

function App() {
  const [events, setEvents] = useState<FileEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapData[]>([]);
  const [projectName] = useState(() => {
    const parts = window.location.hostname.split('.');
    return parts[0] === 'localhost' ? 'worklens' : parts[0];
  });

  const loadData = useCallback(async () => {
    try {
      const [eventsData, statsData, timelineData, heatmapData] = await Promise.all([
        api.getEvents(100),
        api.getStats(),
        api.getTimeline(24),
        api.getHeatmap(20),
      ]);

      setEvents(eventsData.events);
      setStats(statsData);
      setTimeline(timelineData);
      setHeatmap(heatmapData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [loadData]);

  const handleNewEvent = useCallback((event: FileEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 100));
    // Reload stats and other data
    loadData();
  }, [loadData]);

  const { connected, error } = useSSE(handleNewEvent);

  const fileCount = new Set(events.map(e => e.file_path)).size;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        <Header
          projectName={projectName}
          connected={connected}
          stats={stats}
          fileCount={fileCount}
        />

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <EventFeed events={events} />
          </div>

          <div>
            <StatsPanel stats={stats} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Timeline data={timeline} />
          <FileHeatmap data={heatmap} />
        </div>
      </div>
    </div>
  );
}

export default App;
