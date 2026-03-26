import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { api, Session } from '../lib/api';
import { getExtColor, EXT_LABELS } from '../lib/colors';
import { Clock, FileText, Timer } from 'lucide-react';

interface SessionsPageProps {
  selectedWorkspace: string | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getIntensityBorder(eventCount: number): string {
  if (eventCount > 100) return 'border-l-emerald-400';
  if (eventCount > 50) return 'border-l-emerald-500';
  if (eventCount > 20) return 'border-l-emerald-600';
  return 'border-l-emerald-700';
}

export default function SessionsPage({ selectedWorkspace }: SessionsPageProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getSessions(selectedWorkspace || undefined)
      .then(setSessions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedWorkspace]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass-card animate-pulse">
            <div className="h-32" />
          </div>
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="glass-card text-center py-20">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-zinc-800/50 flex items-center justify-center">
          <Clock className="w-10 h-10 text-zinc-600" />
        </div>
        <h3 className="text-xl font-bold text-zinc-300 mb-2">No sessions detected yet</h3>
        <p className="text-sm text-zinc-500 max-w-md mx-auto">
          Sessions are automatically created when WorkLens detects sustained coding activity.
          Keep coding and they'll appear here!
        </p>
      </div>
    );
  }

  // Group sessions by date
  const grouped = new Map<string, Session[]>();
  sessions.forEach(s => {
    const dateKey = new Date(s.startTime).toISOString().split('T')[0];
    const existing = grouped.get(dateKey) || [];
    existing.push(s);
    grouped.set(dateKey, existing);
  });

  return (
    <div className="space-y-8">
      {Array.from(grouped.entries()).map(([dateKey, daySessions]) => (
        <div key={dateKey}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-zinc-800/50" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {formatDate(daySessions[0].startTime)}
            </span>
            <div className="h-px flex-1 bg-zinc-800/50" />
          </div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-emerald-500/50 via-zinc-700/30 to-transparent" />

            <div className="space-y-4">
              {daySessions.map((session, index) => {
                const total = session.creates + session.modifies + session.deletes;
                const createPct = total > 0 ? (session.creates / total) * 100 : 0;
                const modifyPct = total > 0 ? (session.modifies / total) * 100 : 0;
                const deletePct = total > 0 ? (session.deletes / total) * 100 : 0;

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.08 }}
                    className="relative pl-12"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-[15px] top-6 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950 shadow-lg shadow-emerald-500/40 z-10" />

                    <div className={`glass-card border-l-4 ${getIntensityBorder(session.eventCount)} hover:bg-zinc-800/60 transition-all duration-200`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-zinc-100">
                              {formatTime(session.startTime)} – {formatTime(session.endTime)}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 px-2.5 py-1 bg-emerald-500/15 rounded-md border border-emerald-500/30">
                              <Timer className="w-3 h-3" />
                              {formatDuration(session.durationMs)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <FileText className="w-3.5 h-3.5" />
                          <span className="font-semibold">{session.filesChanged}</span>
                          <span>files</span>
                        </div>
                      </div>

                      {/* Event type breakdown bar */}
                      {total > 0 && (
                        <div className="mb-3">
                          <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800/50">
                            {createPct > 0 && (
                              <div
                                className="bg-emerald-500 transition-all duration-300"
                                style={{ width: `${createPct}%` }}
                                title={`${session.creates} creates`}
                              />
                            )}
                            {modifyPct > 0 && (
                              <div
                                className="bg-amber-500 transition-all duration-300"
                                style={{ width: `${modifyPct}%` }}
                                title={`${session.modifies} modifies`}
                              />
                            )}
                            {deletePct > 0 && (
                              <div
                                className="bg-red-500 transition-all duration-300"
                                style={{ width: `${deletePct}%` }}
                                title={`${session.deletes} deletes`}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            {session.creates > 0 && (
                              <span className="text-xs text-emerald-400">+{session.creates}</span>
                            )}
                            {session.modifies > 0 && (
                              <span className="text-xs text-amber-400">~{session.modifies}</span>
                            )}
                            {session.deletes > 0 && (
                              <span className="text-xs text-red-400">-{session.deletes}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* File type pills */}
                      {Object.keys(session.fileTypes).length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(session.fileTypes)
                            .sort(([, a], [, b]) => b - a)
                            .map(([ext, count]) => (
                              <span
                                key={ext}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border"
                                style={{
                                  backgroundColor: `${getExtColor(ext)}15`,
                                  borderColor: `${getExtColor(ext)}30`,
                                  color: getExtColor(ext),
                                }}
                              >
                                {EXT_LABELS[ext] || EXT_LABELS['.' + ext] || ext}
                                <span className="opacity-70">{count}</span>
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
