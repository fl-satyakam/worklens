import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { api, FileEvent, Stats, TimelineData, HeatmapData, ScanCycle, Workspace } from './lib/api';
import { useSSE } from './hooks/useSSE';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Navigation from './components/Navigation';
import OverviewPage from './pages/OverviewPage';
import SessionsPage from './pages/SessionsPage';
import CodebasePage from './pages/CodebasePage';
import ActivityPage from './pages/ActivityPage';

function App() {
  const [events, setEvents] = useState<FileEvent[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [timeline, setTimeline] = useState<TimelineData[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapData[]>([]);
  const [cycles, setCycles] = useState<ScanCycle[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);
  const [nextScanSeconds, setNextScanSeconds] = useState<number | undefined>(undefined);
  const [projectName] = useState(() => {
    const parts = window.location.hostname.split('.');
    return parts[0] === 'localhost' ? 'WorkLens' : parts[0];
  });

  const loadData = useCallback(async () => {
    try {
      const [eventsData, statsData, timelineData, heatmapData, cyclesData, workspacesData] = await Promise.all([
        api.getEvents(100, 0, undefined, selectedWorkspace || undefined),
        api.getStats(selectedWorkspace || undefined),
        api.getTimeline(24, selectedWorkspace || undefined),
        api.getHeatmap(20, selectedWorkspace || undefined),
        api.getCycles(20, selectedWorkspace || undefined),
        api.getWorkspaces(),
      ]);

      setEvents(eventsData.events);
      setStats(statsData);
      setTimeline(timelineData);
      setHeatmap(heatmapData);
      setCycles(cyclesData.cycles);
      setWorkspaces(workspacesData.workspaces);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [selectedWorkspace]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  useEffect(() => {
    const countdown = setInterval(() => {
      setNextScanSeconds(prev => {
        if (prev === undefined || prev <= 1) return 120;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  const handleNewEvent = useCallback((event: FileEvent) => {
    if (!selectedWorkspace || event.workspace === selectedWorkspace) {
      setEvents((prev) => [event, ...prev].slice(0, 100));
    }
    loadData();
  }, [loadData, selectedWorkspace]);

  const { connected, error } = useSSE(handleNewEvent);

  const fileCount = new Set(events.map(e => e.file_path)).size;
  const isMultiWorkspace = workspaces.length > 0;
  const scanMode = cycles.length > 0 ? 'interval' : 'realtime';

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
        {isMultiWorkspace && (
          <Sidebar
            workspaces={workspaces}
            selectedWorkspace={selectedWorkspace}
            onSelectWorkspace={setSelectedWorkspace}
          />
        )}

        <div className="flex-1 overflow-y-auto dot-pattern">
          <div className="min-h-screen bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950">
            <div className="max-w-7xl mx-auto p-8">
              <Header
                projectName={selectedWorkspace || projectName}
                connected={connected}
                stats={stats}
                fileCount={fileCount}
                nextScanSeconds={scanMode === 'interval' ? nextScanSeconds : undefined}
                scanMode={scanMode}
              />

              {error && (
                <div className="mb-6 p-4 glass-card border-red-500/30 bg-red-500/5 text-red-400 text-sm flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  {error}
                </div>
              )}

              <Navigation />

              <Routes>
                <Route
                  path="/"
                  element={
                    <OverviewPage
                      events={events}
                      stats={stats}
                      timeline={timeline}
                      heatmap={heatmap}
                      cycles={cycles}
                      selectedWorkspace={selectedWorkspace}
                    />
                  }
                />
                <Route
                  path="/sessions"
                  element={<SessionsPage selectedWorkspace={selectedWorkspace} />}
                />
                <Route
                  path="/codebase"
                  element={<CodebasePage selectedWorkspace={selectedWorkspace} />}
                />
                <Route
                  path="/activity"
                  element={<ActivityPage selectedWorkspace={selectedWorkspace} />}
                />
              </Routes>

              <div className="h-8" />
            </div>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
