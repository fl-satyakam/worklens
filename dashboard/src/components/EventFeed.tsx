import { FileEvent } from '../lib/api';
import { FilePlus, FileEdit, FileX, FileSymlink } from 'lucide-react';

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

export default function EventFeed({ events }: EventFeedProps) {
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

            return (
              <div
                key={`${event.timestamp}-${index}`}
                className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors animate-fade-in"
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
                  </div>
                  <div className="text-sm text-zinc-100 truncate" title={event.file_path}>
                    {event.file_path}
                  </div>
                  {event.file_size_bytes !== null && (
                    <div className="text-xs text-zinc-500 mt-1">
                      {(event.file_size_bytes / 1024).toFixed(2)} KB
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
