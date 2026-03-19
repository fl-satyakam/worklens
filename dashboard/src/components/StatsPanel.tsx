import { Stats } from '../lib/api';
import { TrendingUp, File, Clock } from 'lucide-react';

interface StatsPanelProps {
  stats: Stats | null;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  if (!stats) {
    return (
      <div className="card">
        <div className="text-center text-zinc-400 py-8">Loading stats...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Statistics</h2>

      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-zinc-800 rounded-lg">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-zinc-100">{stats.totalEvents}</div>
            <div className="text-sm text-zinc-400">Total Events Today</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 py-4 border-y border-zinc-800">
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-500">{stats.createdCount}</div>
            <div className="text-xs text-zinc-400">Created</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-500">{stats.modifiedCount}</div>
            <div className="text-xs text-zinc-400">Modified</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-500">{stats.deletedCount}</div>
            <div className="text-xs text-zinc-400">Deleted</div>
          </div>
        </div>

        {stats.mostActiveFile && (
          <div className="flex items-start gap-3">
            <div className="p-3 bg-zinc-800 rounded-lg">
              <File className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-zinc-400">Most Active File</div>
              <div className="text-sm text-zinc-100 truncate mt-1" title={stats.mostActiveFile}>
                {stats.mostActiveFile}
              </div>
            </div>
          </div>
        )}

        {stats.mostActiveHour !== null && (
          <div className="flex items-center gap-3">
            <div className="p-3 bg-zinc-800 rounded-lg">
              <Clock className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <div className="text-sm text-zinc-400">Most Active Hour</div>
              <div className="text-sm text-zinc-100 mt-1">
                {stats.mostActiveHour}:00 - {stats.mostActiveHour + 1}:00
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
