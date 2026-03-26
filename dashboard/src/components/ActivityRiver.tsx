import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api, ExtensionActivity } from '../lib/api';
import { getExtColor, EXT_LABELS } from '../lib/colors';
import { Waves } from 'lucide-react';
import { motion } from 'framer-motion';

interface ActivityRiverProps {
  workspace?: string | null;
}

export default function ActivityRiver({ workspace }: ActivityRiverProps) {
  const [data, setData] = useState<ExtensionActivity[]>([]);

  useEffect(() => {
    api.getActivityByExtension(30, workspace || undefined).then(setData).catch(console.error);
  }, [workspace]);

  const { chartData, extensions } = useMemo(() => {
    // Collect all unique extensions
    const extSet = new Set<string>();
    data.forEach(d => Object.keys(d.extensions).forEach(ext => extSet.add(ext)));

    // Get top extensions by total count
    const extTotals = new Map<string, number>();
    data.forEach(d => {
      Object.entries(d.extensions).forEach(([ext, count]) => {
        extTotals.set(ext, (extTotals.get(ext) || 0) + count);
      });
    });

    const topExts = Array.from(extTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ext]) => ext);

    // Build chart data
    const transformed = data.map(d => {
      const entry: Record<string, string | number> = { date: d.date };
      topExts.forEach(ext => {
        entry[ext] = d.extensions[ext] || 0;
      });
      return entry;
    });

    return { chartData: transformed, extensions: topExts };
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass-card"
    >
      <div className="flex items-center gap-2 mb-5">
        <Waves className="w-5 h-5 text-emerald-400" />
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Activity River</h2>
        <span className="text-xs text-zinc-500 font-medium px-2 py-1 bg-zinc-800/50 rounded">30 days</span>
      </div>

      {chartData.length === 0 ? (
        <div className="text-center text-zinc-500 py-16">
          <Waves className="w-12 h-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-sm">No extension activity data yet</p>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {extensions.map(ext => (
                  <linearGradient key={ext} id={`grad-${ext.replace('.', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getExtColor(ext)} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={getExtColor(ext)} stopOpacity={0.05} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.3} />
              <XAxis
                dataKey="date"
                stroke="#52525b"
                fontSize={10}
                tick={{ fill: '#71717a' }}
                axisLine={{ stroke: '#27272a' }}
                tickFormatter={(d: string) => {
                  const date = new Date(d + 'T00:00:00');
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis
                stroke="#52525b"
                fontSize={11}
                tick={{ fill: '#71717a' }}
                axisLine={{ stroke: '#27272a' }}
              />
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
                  color: '#a1a1aa',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}
                labelFormatter={(d: string) => {
                  const date = new Date(d + 'T00:00:00');
                  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                }}
                formatter={(value: number, name: string) => [
                  value,
                  EXT_LABELS[name] || EXT_LABELS['.' + name] || name,
                ]}
              />
              {extensions.map(ext => (
                <Area
                  key={ext}
                  type="monotone"
                  dataKey={ext}
                  stackId="1"
                  stroke={getExtColor(ext)}
                  strokeWidth={1.5}
                  fill={`url(#grad-${ext.replace('.', '')})`}
                  animationDuration={1200}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-zinc-800/50">
            {extensions.map(ext => (
              <div key={ext} className="flex items-center gap-1.5 text-xs">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: getExtColor(ext) }} />
                <span className="text-zinc-400">
                  {EXT_LABELS[ext] || EXT_LABELS['.' + ext] || ext}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
