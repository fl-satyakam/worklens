import { Eye } from 'lucide-react';
import { Stats } from '../lib/api';

interface HeaderProps {
  projectName: string;
  connected: boolean;
  stats: Stats | null;
  fileCount: number;
}

export default function Header({ projectName, connected, stats, fileCount }: HeaderProps) {
  return (
    <header className="card mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Eye className="w-8 h-8 text-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{projectName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              <span className="text-sm text-zinc-400">
                {connected ? 'Watching' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          <div className="text-right">
            <div className="text-2xl font-bold text-zinc-100">
              {stats?.totalEvents ?? 0}
            </div>
            <div className="text-xs text-zinc-400">Events Today</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-zinc-100">{fileCount}</div>
            <div className="text-xs text-zinc-400">Files Tracked</div>
          </div>
        </div>
      </div>
    </header>
  );
}
