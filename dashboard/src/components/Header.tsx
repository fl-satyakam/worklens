import { useEffect, useState } from 'react';
import { Eye, Clock, Play, Activity } from 'lucide-react';
import { motion } from 'framer-motion';
import { Stats } from '../lib/api';

interface HeaderProps {
  projectName: string;
  connected: boolean;
  stats: Stats | null;
  fileCount: number;
  nextScanSeconds?: number;
  scanMode?: 'realtime' | 'interval';
}

function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (value === displayValue) return;

    const duration = 500;
    const steps = 20;
    const increment = (value - displayValue) / steps;
    let current = 0;

    const timer = setInterval(() => {
      current++;
      if (current === steps) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.round(displayValue + increment));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, displayValue]);

  return <span className="animate-counter">{displayValue}</span>;
}

function CircularProgress({ percentage }: { percentage: number }) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-zinc-800"
      />
      <circle
        cx="18"
        cy="18"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-emerald-500 transition-all duration-1000"
      />
    </svg>
  );
}

export default function Header({
  projectName,
  connected,
  stats,
  fileCount,
  nextScanSeconds,
  scanMode = 'realtime'
}: HeaderProps) {
  const percentage = nextScanSeconds !== undefined ? ((120 - nextScanSeconds) / 120) * 100 : 0;

  return (
    <header className="glass-card mb-6 border-b-2 border-emerald-500/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl border border-emerald-500/30">
            <Eye className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text-emerald tracking-tight">
              {projectName}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <motion.div
                animate={{
                  scale: connected ? [1, 1.2, 1] : 1,
                  opacity: connected ? [1, 0.7, 1] : 0.5
                }}
                transition={{
                  duration: 2,
                  repeat: connected ? Infinity : 0,
                  ease: "easeInOut"
                }}
                className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-red-500'}`}
              />
              <span className="text-sm font-medium text-zinc-300">
                {connected ? (scanMode === 'interval' ? 'Scanning' : 'Watching') : 'Disconnected'}
              </span>
              {scanMode === 'interval' && nextScanSeconds !== undefined && (
                <>
                  <span className="text-zinc-600">•</span>
                  <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                    <div className="relative flex items-center justify-center">
                      <CircularProgress percentage={percentage} />
                      <Clock className="w-4 h-4 text-emerald-400 absolute" />
                    </div>
                    <span className="text-sm font-mono text-emerald-400">
                      {nextScanSeconds}s
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {scanMode === 'interval' && (
          <button
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg font-semibold text-white text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-emerald-500/40 hover:scale-105"
            onClick={() => {/* TODO: Implement manual scan trigger */}}
          >
            <Play className="w-4 h-4" />
            Scan Now
          </button>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 px-5 py-3 bg-zinc-800/30 rounded-xl border border-zinc-700/50 hover:border-emerald-500/30 transition-colors duration-200">
          <Activity className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-sm text-zinc-400 font-medium">Total Events</div>
            <div className="text-2xl font-bold text-zinc-100 tabular-nums">
              <AnimatedCounter value={stats?.totalEvents ?? 0} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-3 bg-zinc-800/30 rounded-xl border border-zinc-700/50 hover:border-blue-500/30 transition-colors duration-200">
          <div className="w-5 h-5 flex items-center justify-center">
            <div className="w-3 h-3 bg-blue-400 rounded-sm" />
          </div>
          <div>
            <div className="text-sm text-zinc-400 font-medium">Files Tracked</div>
            <div className="text-2xl font-bold text-zinc-100 tabular-nums">
              <AnimatedCounter value={fileCount} />
            </div>
          </div>
        </div>

        {stats && (
          <div className="flex items-center gap-3 px-5 py-3 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-xs font-mono text-emerald-400">{stats.createdCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-amber-500 rounded-full" />
              <span className="text-xs font-mono text-amber-400">{stats.modifiedCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-xs font-mono text-red-400">{stats.deletedCount}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
