import type { LogEntry } from '@quickbuzz/shared';
import { motion } from 'framer-motion';

interface EventLogProps {
  logs: LogEntry[];
}

function getActionStyle(action: string): string {
  switch (action) {
    case 'WINNER': return 'bg-warning/15 text-warning';
    case 'BUZZ': return 'bg-danger/15 text-danger';
    case 'DUPLICATE': return 'bg-orange/15 text-orange';
    case 'CONNECT': return 'bg-success/15 text-success';
    case 'DISCONNECT': return 'bg-danger/10 text-text-muted';
    case 'RESET': return 'bg-accent/15 text-accent';
    default: return 'bg-bg-subtle text-text-secondary';
  }
}

export default function EventLog({ logs }: EventLogProps) {
  return (
    <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden">
      <div className="p-4 pb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Event Log</h3>
      </div>
      <div className="max-h-[250px] overflow-y-auto px-4 pb-3">
        {logs.length === 0 && (
          <p className="text-sm text-text-muted text-center py-4 italic">No events yet</p>
        )}
        {logs.map((entry, i) => (
          <motion.div
            key={i}
            initial={i === 0 ? { opacity: 0, y: -8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 py-1.5 border-b border-border-subtle last:border-0 text-[0.8rem]"
          >
            <span className="font-mono text-[0.7rem] text-text-muted min-w-[56px] shrink-0">{entry.time}</span>
            <span className="font-bold min-w-[40px] shrink-0 text-text">{entry.team}</span>
            <span className={`px-1.5 py-0.5 rounded text-[0.65rem] font-semibold shrink-0 ${getActionStyle(entry.action)}`}>
              {entry.action}
            </span>
            {entry.message && (
              <span className="text-text-muted text-[0.75rem] truncate">{entry.message}</span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
