import { HeatmapData } from '../lib/api';
import { Flame } from 'lucide-react';

interface FileHeatmapProps {
  data: HeatmapData[];
}

export default function FileHeatmap({ data }: FileHeatmapProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Flame className="w-5 h-5 text-amber-500" />
        File Heatmap
      </h2>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {data.length === 0 ? (
          <div className="text-center text-zinc-400 py-8">
            No file activity yet...
          </div>
        ) : (
          data.map((item) => {
            const intensity = item.count / maxCount;
            const bgOpacity = Math.max(0.1, intensity);

            return (
              <div
                key={item.path}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors"
                style={{
                  backgroundColor: `rgba(245, 158, 11, ${bgOpacity * 0.2})`,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-100 truncate" title={item.path}>
                    {item.path}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-xs text-amber-500 font-medium">
                    {item.count} changes
                  </div>
                  <div
                    className="h-2 rounded-full bg-amber-500"
                    style={{
                      width: `${Math.max(20, intensity * 60)}px`,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
