import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Collapsible from '@radix-ui/react-collapsible';
import { formatDistanceToNow } from 'date-fns';
import { FileEvent } from '../lib/api';
import { FilePlus, FileEdit, FileX, FileSymlink, ChevronDown, ChevronRight } from 'lucide-react';

interface EventFeedProps {
  events: FileEvent[];
}

const eventIcons = {
  create: FilePlus,
  modify: FileEdit,
  delete: FileX,
  rename: FileSymlink,
};

const eventBorderColors = {
  create: 'border-l-emerald-500',
  modify: 'border-l-amber-500',
  delete: 'border-l-red-500',
  rename: 'border-l-blue-500',
};

const eventBadgeColors = {
  create: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
  modify: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
  delete: 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-400 border-red-500/30',
  rename: 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
};

const eventIconColors = {
  create: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  modify: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  delete: 'text-red-400 bg-red-500/10 border-red-500/20',
  rename: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

function getFileExtension(path: string): string {
  const match = path.match(/\.([^.]+)$/);
  return match ? match[1] : '';
}

function getExtensionColor(ext: string): string {
  const colors: Record<string, string> = {
    ts: 'text-blue-400',
    tsx: 'text-purple-400',
    js: 'text-yellow-400',
    jsx: 'text-yellow-300',
    css: 'text-pink-400',
    scss: 'text-pink-500',
    html: 'text-orange-400',
    json: 'text-amber-300',
    md: 'text-zinc-400',
    py: 'text-blue-500',
    go: 'text-cyan-400',
    rs: 'text-orange-500',
    java: 'text-red-400',
  };
  return colors[ext] || 'text-zinc-400';
}

function DiffView({ diff }: { diff: string }) {
  const lines = diff.split('\n');

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-3 rounded-lg bg-zinc-950 border border-zinc-800/50 overflow-hidden"
    >
      <div className="overflow-x-auto">
        {lines.map((line, i) => {
          let bg = '';
          let textColor = 'text-zinc-400';
          let borderLeft = '';

          if (line.startsWith('+') && !line.startsWith('+++')) {
            bg = 'bg-emerald-500/5';
            textColor = 'text-emerald-300';
            borderLeft = 'border-l-2 border-l-emerald-500/50';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            bg = 'bg-red-500/5';
            textColor = 'text-red-300';
            borderLeft = 'border-l-2 border-l-red-500/50';
          } else if (line.startsWith('@@')) {
            bg = 'bg-blue-500/5';
            textColor = 'text-blue-400 font-semibold';
            borderLeft = 'border-l-2 border-l-blue-500/50';
          }

          return (
            <div
              key={i}
              className={`flex ${bg} ${borderLeft}`}
            >
              <div className="flex-shrink-0 w-10 text-right pr-3 py-1 text-zinc-700 text-xs font-mono select-none">
                {i + 1}
              </div>
              <div className={`flex-1 py-1 pr-3 ${textColor} whitespace-pre font-mono text-xs leading-relaxed`}>
                {line || ' '}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function EventFeed({ events }: EventFeedProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="glass-card">
      <h2 className="text-xl font-bold text-zinc-100 mb-5 tracking-tight">Real-time Event Feed</h2>
      <div className="space-y-3 max-h-[650px] overflow-y-auto pr-2">
        {events.length === 0 ? (
          <div className="text-center text-zinc-500 py-12 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
              <FileEdit className="w-8 h-8 text-zinc-600" />
            </div>
            <p className="text-sm">No events yet. Start making changes to your files...</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((event, index) => {
              const Icon = eventIcons[event.event_type];
              const borderColor = eventBorderColors[event.event_type];
              const badgeColor = eventBadgeColors[event.event_type];
              const iconColor = eventIconColors[event.event_type];
              const key = `${event.timestamp}-${index}`;
              const isExpanded = expanded.has(key);
              const hasDiff = event.diff_summary && event.diff_summary.trim().length > 0;
              const ext = getFileExtension(event.file_path);
              const extColor = getExtensionColor(ext);

              let relativeTime = 'just now';
              try {
                relativeTime = formatDistanceToNow(new Date(event.timestamp), { addSuffix: true });
              } catch (e) {
                // Fallback if date parsing fails
              }

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-lg bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 ${borderColor} border-l-4 hover:bg-zinc-800/60 hover:border-zinc-700/60 transition-all duration-200 overflow-hidden`}
                >
                  <Collapsible.Root open={isExpanded} onOpenChange={() => hasDiff && toggleExpand(key)}>
                    <Collapsible.Trigger asChild>
                      <div className={`flex items-start gap-3 p-4 ${hasDiff ? 'cursor-pointer' : ''}`}>
                        <div className={`p-2 rounded-lg border ${iconColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`badge border ${badgeColor}`}>
                              {event.event_type}
                            </span>
                            <span className="text-xs text-zinc-500 font-medium">{relativeTime}</span>
                            {event.file_size_bytes !== null && (
                              <span className="text-xs text-zinc-600 px-2 py-0.5 bg-zinc-800/50 rounded">
                                {event.file_size_bytes < 1024
                                  ? `${event.file_size_bytes} B`
                                  : `${(event.file_size_bytes / 1024).toFixed(1)} KB`}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-sm text-zinc-100 font-mono truncate" title={event.file_path}>
                              {event.file_path}
                            </code>
                            {ext && (
                              <span className={`text-xs font-semibold ${extColor} px-2 py-0.5 bg-zinc-800/30 rounded`}>
                                .{ext}
                              </span>
                            )}
                          </div>
                        </div>
                        {hasDiff && (
                          <div className="text-zinc-500 mt-2 transition-transform duration-200">
                            {isExpanded
                              ? <ChevronDown className="w-4 h-4" />
                              : <ChevronRight className="w-4 h-4" />}
                          </div>
                        )}
                      </div>
                    </Collapsible.Trigger>
                    {hasDiff && (
                      <Collapsible.Content>
                        <div className="px-4 pb-4">
                          <DiffView diff={event.diff_summary!} />
                        </div>
                      </Collapsible.Content>
                    )}
                  </Collapsible.Root>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
