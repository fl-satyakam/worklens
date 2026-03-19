import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity } from 'lucide-react';
import { TimelineData } from '../lib/api';

interface TimelineProps {
  data: TimelineData[];
}

export default function Timeline({ data }: TimelineProps) {
  // Fill in missing hours with 0 count
  const fullData = Array.from({ length: 24 }, (_, i) => {
    const existing = data.find(d => d.hour === i);
    return existing || { hour: i, count: 0 };
  });

  const maxCount = Math.max(...fullData.map(d => d.count), 1);

  return (
    <div className="glass-card">
      <div className="flex items-center gap-2 mb-5">
        <Activity className="w-5 h-5 text-emerald-400" />
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Activity Timeline</h2>
        <span className="text-xs text-zinc-500 font-medium px-2 py-1 bg-zinc-800/50 rounded">Last 24h</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={fullData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.3} />
          <XAxis
            dataKey="hour"
            stroke="#52525b"
            fontSize={11}
            tickFormatter={(hour) => `${hour}h`}
            tick={{ fill: '#71717a' }}
            axisLine={{ stroke: '#27272a' }}
          />
          <YAxis
            stroke="#52525b"
            fontSize={11}
            tick={{ fill: '#71717a' }}
            axisLine={{ stroke: '#27272a' }}
            domain={[0, maxCount > 0 ? Math.ceil(maxCount * 1.1) : 5]}
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
            itemStyle={{
              color: '#10b981',
              fontSize: '14px',
              fontWeight: 700,
            }}
            labelFormatter={(hour) => `${hour}:00 - ${(hour + 1) % 24}:00`}
            formatter={(value: number) => [value, 'Events']}
            cursor={{ stroke: '#10b981', strokeWidth: 1, strokeOpacity: 0.3 }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#colorCount)"
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
