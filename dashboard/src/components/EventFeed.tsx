import { useState } from 'react';
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

const eventColors = {
  create: 'text-emerald-500 bg-emerald-500/10',
  modify: 'text-amber-500 bg-amber-500/10',
  delete: 'text-red-500 bg-red-500/10',
  rename: 'text-blue-500 bg-blue-500/10',
};

function DiffView({ diff }: { diff: string }) {
  const lines = diff.split('\n');

  return (
    <div className="mt-2 rounded-md bg-zinc-950 border border-zinc-800 overflow-x-auto font-mono text-xs leading-5">
      {lines.map((line, i) => {
        let bg = '';
        let textColor = 'text-zinc-400';

        if (line.startsWith('+')) {
          bg = 'bg-emerald-500/10';
          textColor = 'text-emerald-400';
        } else if (line.startsWith('-')) {
          bg = 'bg-red-500/10';
          textColor = 'text-red-400';
        } else if (line.startsWith('@@')) {
          bg = 'bg-blue-500/5';
          textColor = 'text-blue-400';
        }

        return (
          <div key={i} className={`px-3 py-0 ${bg} ${textColor} whitespace-pre`}>
            {line}
          </div>
        );
      })}
    </div>
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
    <div className="card">
      <h2 className="text-lg font-semibold mb-4">Real-time Event Feed</h2>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center text-zinc-400 py-8">
            No events yet. Start making changes to your files...
          </div>
        ) : (
          events.map((event, index) => {
            const Icon = eventIcons[event.event_type];
            const colorClass = eventColors[event.event_type];
            const timestamp = new Date(event.timestamp).toLocaleTimeString();
            const key = `${event.timestamp}-${index}`;
            const isExpanded = expanded.has(key);
            const hasDiff = event.diff_summary && event.diff_summary.trim().length > 0;

            return (
              <div
                key={key}
                className="rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors animate-fade-in overflow-hidden"
              >
                <div
                  className={`flex items-start gap-3 p-3 ${hasDiff ? 'cursor-pointer' : ''}`}
                  onClick={() => hasDiff && toggleExpand(key)}
                >
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${colorClass}`}>
                        {event.event_type}
                      </span>
                      <span className="text-xs text-zinc-500">{timestamp}</span>
                      {event.file_size_bytes !== null && (
                        <span className="text-xs text-zinc-600">
                          {event.file_size_bytes < 1024
                            ? `${event.file_size_bytes} B`
                            : `${(event.file_size_bytes / 1024).toFixed(1)} KB`}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-zinc-100 truncate" title={event.file_path}>
                      {event.file_path}
                    </div>
                  </div>
                  {hasDiff && (
                    <div className="text-zinc-500 mt-2">
                      {isExpanded
                        ? <ChevronDown className="w-4 h-4" />
                        : <ChevronRight className="w-4 h-4" />}
                    </div>
                  )}
                </div>
                {hasDiff && isExpanded && (
                  <div className="px-3 pb-3">
                    <DiffView diff={event.diff_summary!} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
