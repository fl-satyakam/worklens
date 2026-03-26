import ActivityRiver from '../components/ActivityRiver';
import CoChangeGraph from '../components/CoChangeGraph';
import PeakHeatmap from '../components/PeakHeatmap';

interface ActivityPageProps {
  selectedWorkspace: string | null;
}

export default function ActivityPage({ selectedWorkspace }: ActivityPageProps) {
  return (
    <div className="space-y-6">
      <ActivityRiver workspace={selectedWorkspace} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CoChangeGraph workspace={selectedWorkspace} />
        <PeakHeatmap workspace={selectedWorkspace} />
      </div>
    </div>
  );
}
