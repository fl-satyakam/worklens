import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Activity Timeline (Last 24h)</h2>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={fullData}>
          <XAxis
            dataKey="hour"
            stroke="#71717a"
            fontSize={12}
            tickFormatter={(hour) => `${hour}:00`}
          />
          <YAxis stroke="#71717a" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              color: '#fafafa',
            }}
            labelFormatter={(hour) => `${hour}:00`}
            formatter={(value: number) => [value, 'Events']}
          />
          <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
