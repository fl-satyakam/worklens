import { useState, useEffect, useMemo } from 'react';
import { api, TimelineData } from '../lib/api';
import { Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface PeakHeatmapProps {
  workspace?: string | null;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const COLOR_SCALE = [
  '#27272a', // no activity
  '#064e3b',
  '#059669',
  '#10b981',
  '#34d399',
];

function getHeatColor(value: number, max: number): string {
  if (value === 0 || max === 0) return COLOR_SCALE[0];
  const ratio = value / max;
  if (ratio <= 0.25) return COLOR_SCALE[1];
  if (ratio <= 0.5) return COLOR_SCALE[2];
  if (ratio <= 0.75) return COLOR_SCALE[3];
  return COLOR_SCALE[4];
}

export default function PeakHeatmap({ workspace }: PeakHeatmapProps) {
  const [timelineData, setTimelineData] = useState<TimelineData[]>([]);
  const [tooltip, setTooltip] = useState<{ day: string; hour: number; count: number; x: number; y: number } | null>(null);

  useEffect(() => {
    // We'll use the timeline API to get hourly data and distribute across days
    // In a real implementation, the server would aggregate by day-of-week × hour
    api.getTimeline(168, workspace || undefined).then(setTimelineData).catch(console.error);
  }, [workspace]);

  const { grid, maxCount } = useMemo(() => {
    // Build a 7×24 grid from timeline data
    const heatGrid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    // Distribute the 168 hours (7 days) across the grid
    timelineData.forEach((d, _i) => {
      const hour = d.hour % 24;
      const day = Math.floor(d.hour / 24) % 7;
      if (day >= 0 && day < 7 && hour >= 0 && hour < 24) {
        heatGrid[day][hour] += d.count;
      }
    });

    const max = Math.max(...heatGrid.flat(), 1);
    return { grid: heatGrid, maxCount: max };
  }, [timelineData]);

  const cellSize = 24;
  const cellGap = 3;
  const labelWidth = 40;
  const headerHeight = 24;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card"
    >
      <div className="flex items-center gap-2 mb-5">
        <Clock className="w-5 h-5 text-emerald-400" />
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Peak Hours</h2>
        <span className="text-xs text-zinc-500 font-medium px-2 py-1 bg-zinc-800/50 rounded">Day × Hour</span>
      </div>

      <div className="overflow-x-auto relative">
        <svg
          width={labelWidth + HOURS.length * (cellSize + cellGap)}
          height={headerHeight + DAYS.length * (cellSize + cellGap) + 10}
          className="block"
        >
          {/* Hour labels */}
          {HOURS.filter(h => h % 3 === 0).map(h => (
            <text
              key={h}
              x={labelWidth + h * (cellSize + cellGap) + cellSize / 2}
              y={14}
              fill="#71717a"
              fontSize={10}
              textAnchor="middle"
              fontWeight={500}
            >
              {h}h
            </text>
          ))}

          {/* Day labels */}
          {DAYS.map((day, i) => (
            <text
              key={day}
              x={0}
              y={headerHeight + i * (cellSize + cellGap) + cellSize - 4}
              fill="#52525b"
              fontSize={10}
              fontWeight={500}
            >
              {day}
            </text>
          ))}

          {/* Cells */}
          {DAYS.map((day, dayIdx) =>
            HOURS.map(hour => {
              const count = grid[dayIdx][hour];
              const isHovered = tooltip?.day === day && tooltip?.hour === hour;
              return (
                <rect
                  key={`${day}-${hour}`}
                  x={labelWidth + hour * (cellSize + cellGap)}
                  y={headerHeight + dayIdx * (cellSize + cellGap)}
                  width={cellSize}
                  height={cellSize}
                  rx={4}
                  ry={4}
                  fill={getHeatColor(count, maxCount)}
                  className="transition-all duration-150 cursor-pointer"
                  style={{
                    stroke: isHovered ? '#34d399' : 'transparent',
                    strokeWidth: isHovered ? 1.5 : 0,
                  }}
                  onMouseEnter={(e) => {
                    const rect = (e.target as SVGRectElement).getBoundingClientRect();
                    setTooltip({
                      day,
                      hour,
                      count,
                      x: rect.x + rect.width / 2,
                      y: rect.y,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}
        </svg>

        {tooltip && (
          <div
            className="absolute z-50 px-3 py-2 bg-zinc-800/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg text-xs shadow-xl pointer-events-none whitespace-nowrap"
            style={{
              left: Math.min(tooltip.x - 60, (labelWidth + HOURS.length * (cellSize + cellGap)) - 140),
              top: -36,
            }}
          >
            <span className="text-zinc-100 font-semibold">{tooltip.day} {tooltip.hour}:00</span>
            <span className="text-zinc-500 ml-1.5">— {tooltip.count} events</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
