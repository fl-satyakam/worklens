import { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { Stats } from '../lib/api';
import { TrendingUp, File, Clock, PieChart as PieChartIcon } from 'lucide-react';

interface StatsPanelProps {
  stats: Stats | null;
}

function AnimatedCounter({ value, delay = 0 }: { value: number; delay?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 800;
      const steps = 30;
      const increment = value / steps;
      let current = 0;

      const timer = setInterval(() => {
        current++;
        if (current === steps) {
          setDisplayValue(value);
          clearInterval(timer);
        } else {
          setDisplayValue(Math.round(current * increment));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return <span className="animate-counter tabular-nums">{displayValue}</span>;
}

function MiniSparkline({ data }: { data: number[] }) {
  const chartData = data.map((value, index) => ({ value, index }));

  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke="#10b981"
          strokeWidth={2}
          dot={false}
          animationDuration={1000}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MiniBarChart({ data }: { data: number[] }) {
  return (
    <div className="flex items-end justify-between h-10 gap-0.5">
      {data.map((value, index) => {
        const maxValue = Math.max(...data, 1);
        const height = (value / maxValue) * 100;
        return (
          <div
            key={index}
            className="flex-1 bg-purple-500 rounded-sm transition-all duration-300"
            style={{ height: `${height}%`, minHeight: value > 0 ? '4px' : '0px' }}
          />
        );
      })}
    </div>
  );
}

function MiniDonutChart({ created, modified, deleted }: { created: number; modified: number; deleted: number }) {
  const total = created + modified + deleted;
  if (total === 0) return <div className="w-16 h-16 rounded-full bg-zinc-800" />;

  const data = [
    { name: 'Created', value: created, color: '#10b981' },
    { name: 'Modified', value: modified, color: '#f59e0b' },
    { name: 'Deleted', value: deleted, color: '#ef4444' },
  ];

  return (
    <ResponsiveContainer width={64} height={64}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={20}
          outerRadius={30}
          paddingAngle={2}
          dataKey="value"
          animationDuration={1000}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  if (!stats) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card animate-pulse">
            <div className="h-24" />
          </div>
        ))}
      </div>
    );
  }

  // Generate sample sparkline data (in a real app, this would come from the API)
  const sparklineData = Array.from({ length: 12 }, () => Math.floor(Math.random() * 50));
  const hourlyData = Array.from({ length: 24 }, () => Math.floor(Math.random() * 20));

  return (
    <div className="space-y-4">
      {/* Total Events Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0 }}
        className="glass-card hover:border-emerald-500/30 transition-colors duration-200"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-lg border border-emerald-500/30">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
        <div className="text-sm text-zinc-400 font-medium mb-1">Total Events</div>
        <div className="text-3xl font-bold text-zinc-100 mb-3">
          <AnimatedCounter value={stats.totalEvents} />
        </div>
        <div className="h-10 -mb-2">
          <MiniSparkline data={sparklineData} />
        </div>
      </motion.div>

      {/* Most Active File Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass-card hover:border-blue-500/30 transition-colors duration-200"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg border border-blue-500/30">
            <File className="w-5 h-5 text-blue-400" />
          </div>
        </div>
        <div className="text-sm text-zinc-400 font-medium mb-1">Most Active File</div>
        {stats.mostActiveFile ? (
          <div className="text-sm font-mono text-zinc-100 truncate" title={stats.mostActiveFile}>
            {stats.mostActiveFile.split('/').pop() || stats.mostActiveFile}
          </div>
        ) : (
          <div className="text-sm text-zinc-500">No data</div>
        )}
      </motion.div>

      {/* Peak Hour Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="glass-card hover:border-purple-500/30 transition-colors duration-200"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
            <Clock className="w-5 h-5 text-purple-400" />
          </div>
        </div>
        <div className="text-sm text-zinc-400 font-medium mb-1">Peak Hour</div>
        {stats.mostActiveHour !== null ? (
          <div className="text-xl font-bold text-zinc-100 mb-3">
            {stats.mostActiveHour}:00
          </div>
        ) : (
          <div className="text-xl font-bold text-zinc-500 mb-3">--:--</div>
        )}
        <div className="h-10">
          <MiniBarChart data={hourlyData} />
        </div>
      </motion.div>

      {/* Change Breakdown Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass-card hover:border-zinc-700 transition-colors duration-200"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-gradient-to-br from-zinc-700/50 to-zinc-600/50 rounded-lg border border-zinc-700/50">
            <PieChartIcon className="w-5 h-5 text-zinc-400" />
          </div>
          <MiniDonutChart
            created={stats.createdCount}
            modified={stats.modifiedCount}
            deleted={stats.deletedCount}
          />
        </div>
        <div className="text-sm text-zinc-400 font-medium mb-3">Change Breakdown</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-zinc-400">Created</span>
            </div>
            <span className="font-bold text-emerald-400">{stats.createdCount}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-zinc-400">Modified</span>
            </div>
            <span className="font-bold text-amber-400">{stats.modifiedCount}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-zinc-400">Deleted</span>
            </div>
            <span className="font-bold text-red-400">{stats.deletedCount}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
