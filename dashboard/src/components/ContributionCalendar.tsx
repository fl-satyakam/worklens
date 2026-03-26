import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { api, DailyActivity } from '../lib/api';
import { Flame, CalendarDays } from 'lucide-react';

interface ContributionCalendarProps {
  workspace?: string | null;
}

const COLOR_SCALE = [
  '#27272a', // 0 events
  '#064e3b', // low
  '#059669', // med
  '#10b981', // high
  '#34d399', // very high
];

function getColor(count: number, max: number): string {
  if (count === 0) return COLOR_SCALE[0];
  const ratio = count / max;
  if (ratio <= 0.25) return COLOR_SCALE[1];
  if (ratio <= 0.5) return COLOR_SCALE[2];
  if (ratio <= 0.75) return COLOR_SCALE[3];
  return COLOR_SCALE[4];
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

export default function ContributionCalendar({ workspace }: ContributionCalendarProps) {
  const [data, setData] = useState<DailyActivity[]>([]);
  const [hoveredCell, setHoveredCell] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  useEffect(() => {
    api.getDailyActivity(90, workspace || undefined).then(setData).catch(console.error);
  }, [workspace]);

  const { grid, months, maxCount, totalEvents, streak } = useMemo(() => {
    const map = new Map(data.map(d => [d.date, d.count]));
    const today = new Date();
    const cells: { date: string; count: number; col: number; row: number }[] = [];

    // Go back 90 days
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 89);

    // Adjust to start on Monday
    const dayOfWeek = startDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + mondayOffset);

    let col = 0;
    const current = new Date(startDate);
    const monthLabels: { label: string; col: number }[] = [];
    let lastMonth = -1;

    while (current <= today) {
      const row = (current.getDay() + 6) % 7; // Mon=0, Sun=6
      const dateStr = current.toISOString().split('T')[0];
      const count = map.get(dateStr) || 0;

      if (row === 0 && current.getMonth() !== lastMonth) {
        monthLabels.push({
          label: current.toLocaleDateString('en-US', { month: 'short' }),
          col,
        });
        lastMonth = current.getMonth();
      }

      cells.push({ date: dateStr, count, col: row === 0 ? col : col, row });

      current.setDate(current.getDate() + 1);
      if ((current.getDay() + 6) % 7 === 0) col++;
    }

    // Calculate streak
    let streakCount = 0;
    const checkDate = new Date(today);
    while (true) {
      const ds = checkDate.toISOString().split('T')[0];
      if ((map.get(ds) || 0) > 0) {
        streakCount++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const maxVal = Math.max(...cells.map(c => c.count), 1);
    const total = cells.reduce((sum, c) => sum + c.count, 0);

    return { grid: cells, months: monthLabels, maxCount: maxVal, totalEvents: total, streak: streakCount };
  }, [data]);

  // Group cells by column
  const columns = useMemo(() => {
    const colMap = new Map<number, typeof grid>();
    grid.forEach(cell => {
      const existing = colMap.get(cell.col) || [];
      existing.push(cell);
      colMap.set(cell.col, existing);
    });
    return Array.from(colMap.entries()).sort((a, b) => a[0] - b[0]);
  }, [grid]);

  const cellSize = 14;
  const cellGap = 3;
  const labelWidth = 32;
  const headerHeight = 20;
  const svgWidth = labelWidth + columns.length * (cellSize + cellGap);
  const svgHeight = headerHeight + 7 * (cellSize + cellGap);

  return (
    <div className="glass-card">
      <div className="flex items-center gap-2 mb-5">
        <CalendarDays className="w-5 h-5 text-emerald-400" />
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Contribution Calendar</h2>
        <span className="text-xs text-zinc-500 font-medium px-2 py-1 bg-zinc-800/50 rounded">90 days</span>
      </div>

      <div className="overflow-x-auto relative">
        <svg width={svgWidth} height={svgHeight} className="block">
          {/* Month labels */}
          {months.map((m, i) => (
            <text
              key={i}
              x={labelWidth + m.col * (cellSize + cellGap)}
              y={12}
              fill="#71717a"
              fontSize={10}
              fontWeight={500}
            >
              {m.label}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((label, i) => (
            label ? (
              <text
                key={i}
                x={0}
                y={headerHeight + i * (cellSize + cellGap) + cellSize - 2}
                fill="#52525b"
                fontSize={10}
                fontWeight={500}
              >
                {label}
              </text>
            ) : null
          ))}

          {/* Cells */}
          {grid.map((cell, i) => (
            <rect
              key={i}
              x={labelWidth + cell.col * (cellSize + cellGap)}
              y={headerHeight + cell.row * (cellSize + cellGap)}
              width={cellSize}
              height={cellSize}
              rx={3}
              ry={3}
              fill={getColor(cell.count, maxCount)}
              className="transition-all duration-150 cursor-pointer"
              style={{
                opacity: hoveredCell?.date === cell.date ? 1 : 0.9,
                stroke: hoveredCell?.date === cell.date ? '#34d399' : 'transparent',
                strokeWidth: hoveredCell?.date === cell.date ? 1.5 : 0,
              }}
              onMouseEnter={(e) => {
                const rect = (e.target as SVGRectElement).getBoundingClientRect();
                setHoveredCell({ date: cell.date, count: cell.count, x: rect.x + rect.width / 2, y: rect.y });
              }}
              onMouseLeave={() => setHoveredCell(null)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredCell && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute z-50 px-3 py-2 bg-zinc-800/95 backdrop-blur-sm border border-zinc-700/50 rounded-lg text-xs shadow-xl pointer-events-none"
            style={{
              left: Math.min(hoveredCell.x - 60, svgWidth - 140),
              top: -36,
            }}
          >
            <span className="text-zinc-100 font-semibold">{hoveredCell.count} events</span>
            <span className="text-zinc-500 ml-1">
              on {new Date(hoveredCell.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </motion.div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
        <div className="flex items-center gap-4">
          {streak > 0 && (
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-zinc-200">{streak} day streak</span>
            </div>
          )}
          <span className="text-sm text-zinc-400">{totalEvents.toLocaleString()} total events</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span>Less</span>
          {COLOR_SCALE.map((color, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
