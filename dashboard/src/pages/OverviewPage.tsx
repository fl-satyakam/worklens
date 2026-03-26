import { FileEvent, Stats, TimelineData, HeatmapData, ScanCycle } from '../lib/api';
import EventFeed from '../components/EventFeed';
import Timeline from '../components/Timeline';
import FileHeatmap from '../components/FileHeatmap';
import StatsPanel from '../components/StatsPanel';
import ScanHistory from '../components/ScanHistory';
import ContributionCalendar from '../components/ContributionCalendar';
import FileTypeRing from '../components/FileTypeRing';

interface OverviewPageProps {
  events: FileEvent[];
  stats: Stats | null;
  timeline: TimelineData[];
  heatmap: HeatmapData[];
  cycles: ScanCycle[];
  selectedWorkspace: string | null;
}

export default function OverviewPage({
  events,
  stats,
  timeline,
  heatmap,
  cycles,
  selectedWorkspace,
}: OverviewPageProps) {
  return (
    <>
      {cycles.length > 0 && (
        <div className="mb-8 animate-slide-up">
          <ScanHistory cycles={cycles} />
        </div>
      )}

      {/* Contribution Calendar */}
      <div className="mb-6 animate-slide-up">
        <ContributionCalendar workspace={selectedWorkspace} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="animate-slide-up">
            <EventFeed events={events} />
          </div>
        </div>

        <div className="space-y-6 animate-slide-up">
          <StatsPanel stats={stats} />
          <FileTypeRing events={events} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-slide-up">
        <Timeline data={timeline} />
        <FileHeatmap data={heatmap} />
      </div>
    </>
  );
}
