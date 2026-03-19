import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { Clock, FilePlus, FileEdit, FileX, GitCommit } from 'lucide-react';
import { ScanCycle } from '../lib/api';

interface ScanHistoryProps {
  cycles: ScanCycle[];
}

export default function ScanHistory({ cycles }: ScanHistoryProps) {
  if (cycles.length === 0) {
    return (
      <div className="glass-card">
        <h2 className="text-xl font-bold text-zinc-100 mb-5 flex items-center gap-2 tracking-tight">
          <Clock className="w-5 h-5 text-emerald-400" />
          Scan History
        </h2>
        <div className="text-sm text-zinc-500 text-center py-8">
          No scan cycles yet. Scans will appear here as they complete.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card">
      <h2 className="text-xl font-bold text-zinc-100 mb-6 flex items-center gap-2 tracking-tight">
        <Clock className="w-5 h-5 text-emerald-400" />
        Scan History
      </h2>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-zinc-700 to-transparent" />

        <div className="space-y-6">
          {cycles.map((cycle, index) => {
            const timestamp = new Date(cycle.timestamp);
            let relativeTime = 'just now';
            try {
              relativeTime = formatDistanceToNow(timestamp, { addSuffix: true });
            } catch (e) {
              // Fallback
            }

            return (
              <motion.div
                key={cycle.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="relative pl-12"
              >
                {/* Timeline dot */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 + 0.1 }}
                  className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-950 shadow-lg shadow-emerald-500/50"
                />

                <div className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-4 hover:bg-zinc-800/60 hover:border-zinc-700/60 transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
                        <GitCommit className="w-3 h-3" />
                        <span>{relativeTime}</span>
                      </div>
                      {cycle.workspace && (
                        <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30 font-semibold">
                          {cycle.workspace}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-zinc-300 px-2.5 py-1 bg-zinc-800/50 rounded-md">
                      {cycle.event_count} {cycle.event_count === 1 ? 'change' : 'changes'}
                    </div>
                  </div>

                  <div className="text-sm text-zinc-200 mb-3 leading-relaxed">
                    {cycle.summary}
                  </div>

                  <div className="flex items-center gap-4">
                    {cycle.files_created > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                        <FilePlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-400">
                          {cycle.files_created}
                        </span>
                      </div>
                    )}
                    {cycle.files_modified > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 rounded-md border border-amber-500/20">
                        <FileEdit className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-semibold text-amber-400">
                          {cycle.files_modified}
                        </span>
                      </div>
                    )}
                    {cycle.files_deleted > 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 rounded-md border border-red-500/20">
                        <FileX className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs font-semibold text-red-400">
                          {cycle.files_deleted}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
