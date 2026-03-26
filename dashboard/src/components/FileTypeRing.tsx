import { useState, useCallback } from 'react';
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { FileEvent } from '../lib/api';
import { getExtColor, EXT_LABELS } from '../lib/colors';
import { PieChart as PieChartIcon } from 'lucide-react';

interface FileTypeRingProps {
  events: FileEvent[];
}

interface PieDataItem {
  name: string;
  ext: string;
  value: number;
  color: string;
  percentage: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, value, percent,
  } = props;

  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#fafafa" fontSize={14} fontWeight={700}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#a1a1aa" fontSize={12}>
        {value} events ({(percent * 100).toFixed(1)}%)
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={1}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.4}
      />
    </g>
  );
};

export default function FileTypeRing({ events }: FileTypeRingProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const onPieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const onPieLeave = useCallback(() => {
    setActiveIndex(undefined);
  }, []);

  // Count by extension
  const extCounts = new Map<string, number>();
  events.forEach(e => {
    const ext = e.file_ext || '';
    if (ext) {
      extCounts.set(ext, (extCounts.get(ext) || 0) + 1);
    }
  });

  // Sort by count, take top 8
  const sorted = Array.from(extCounts.entries()).sort((a, b) => b[1] - a[1]);
  const top8 = sorted.slice(0, 8);
  const otherCount = sorted.slice(8).reduce((sum, [, count]) => sum + count, 0);
  const totalEvents = events.length;

  const pieData: PieDataItem[] = top8.map(([ext, count]) => ({
    name: EXT_LABELS[ext] || EXT_LABELS['.' + ext] || ext.replace('.', '').toUpperCase(),
    ext,
    value: count,
    color: getExtColor(ext),
    percentage: totalEvents > 0 ? (count / totalEvents) * 100 : 0,
  }));

  if (otherCount > 0) {
    pieData.push({
      name: 'Other',
      ext: 'other',
      value: otherCount,
      color: '#52525b',
      percentage: totalEvents > 0 ? (otherCount / totalEvents) * 100 : 0,
    });
  }

  if (pieData.length === 0) {
    return (
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-5">
          <PieChartIcon className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">File Types</h2>
        </div>
        <div className="text-center text-zinc-500 py-12">
          <PieChartIcon className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm">No file type data yet</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card"
    >
      <div className="flex items-center gap-2 mb-5">
        <PieChartIcon className="w-5 h-5 text-emerald-400" />
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">File Types</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative w-[240px] h-[240px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
                animationDuration={800}
                animationEasing="ease-out"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {activeIndex === undefined && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-zinc-100">{totalEvents}</span>
              <span className="text-xs text-zinc-500">events</span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {pieData.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-colors duration-150 ${
                activeIndex === i ? 'bg-zinc-800/50' : ''
              }`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(undefined)}
            >
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-zinc-300 flex-1 truncate">{item.name}</span>
              <span className="text-zinc-500 tabular-nums">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
