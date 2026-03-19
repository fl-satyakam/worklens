import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { Flame, TrendingUp } from 'lucide-react';
import { HeatmapData } from '../lib/api';

interface FileHeatmapProps {
  data: HeatmapData[];
}

interface TreemapNode {
  name: string;
  size: number;
  count: number;
  fill: string;
}

const CustomizedContent = (props: any) => {
  const { x, y, width, height, name, count } = props;

  // Only show label if rectangle is large enough
  if (width < 60 || height < 30) {
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: props.fill,
            stroke: '#18181b',
            strokeWidth: 2,
          }}
          className="transition-all duration-200 hover:opacity-80"
        />
      </g>
    );
  }

  const fileName = name.split('/').pop() || name;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: props.fill,
          stroke: '#18181b',
          strokeWidth: 2,
        }}
        className="transition-all duration-200 hover:opacity-80"
      />
      <text
        x={x + width / 2}
        y={y + height / 2 - 6}
        textAnchor="middle"
        fill="#fafafa"
        fontSize={12}
        fontWeight={600}
        className="pointer-events-none"
      >
        {fileName.length > 15 ? fileName.substring(0, 12) + '...' : fileName}
      </text>
      <text
        x={x + width / 2}
        y={y + height / 2 + 10}
        textAnchor="middle"
        fill="#d4d4d8"
        fontSize={10}
        className="pointer-events-none"
      >
        {count} changes
      </text>
    </g>
  );
};

export default function FileHeatmap({ data }: FileHeatmapProps) {

  if (data.length === 0) {
    return (
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-5">
          <Flame className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">File Heatmap</h2>
        </div>
        <div className="text-center text-zinc-500 py-12 px-4">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
            <Flame className="w-8 h-8 text-zinc-600" />
          </div>
          <p className="text-sm">No file activity yet...</p>
        </div>
      </div>
    );
  }

  const maxCount = Math.max(...data.map(d => d.count), 1);

  // Transform data for treemap with emerald color scale
  const treemapData: TreemapNode[] = data.map((item) => {
    const intensity = item.count / maxCount;

    // Emerald color scale from dark to bright
    let fill: string;
    if (intensity > 0.75) {
      fill = '#10b981'; // emerald-500
    } else if (intensity > 0.5) {
      fill = '#34d399'; // emerald-400
    } else if (intensity > 0.25) {
      fill = '#6ee7b7'; // emerald-300
    } else {
      fill = '#064e3b'; // emerald-900
    }

    return {
      name: item.path,
      size: Math.max(item.count, 1), // Ensure minimum size
      count: item.count,
      fill,
    };
  });

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">File Heatmap</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <TrendingUp className="w-4 h-4" />
          <span>Change frequency</span>
        </div>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <Treemap
            data={treemapData}
            dataKey="size"
            stroke="#18181b"
            content={<CustomizedContent />}
            animationDuration={800}
          >
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(63, 63, 70, 0.5)',
                borderRadius: '12px',
                padding: '12px',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.4)',
              }}
              labelStyle={{
                color: '#10b981',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '4px',
              }}
              formatter={(_value: number, _name: string, props: any) => {
                return [
                  <div key="content" className="space-y-1">
                    <div className="text-zinc-100 font-mono text-xs truncate max-w-xs">
                      {props.payload.name}
                    </div>
                    <div className="text-emerald-400 font-bold">
                      {props.payload.count} changes
                    </div>
                  </div>,
                  ''
                ];
              }}
            />
          </Treemap>
        </ResponsiveContainer>

        <div className="mt-4 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-emerald-900" />
            <span className="text-xs text-zinc-500">Low activity</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="text-xs text-zinc-500">High activity</span>
          </div>
        </div>
      </div>
    </div>
  );
}
