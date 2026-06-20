import { useEffect, useRef } from 'react';
import type { LogEntry } from '@quickbuzz/shared';

interface EventLogProps {
  logs: LogEntry[];
}

function getActionClass(action: string): string {
  switch (action) {
    case 'WINNER':
      return 'log-winner';
    case 'BUZZ':
      return 'log-buzz';
    case 'DUPLICATE':
      return 'log-duplicate';
    case 'CONNECT':
      return 'log-connect';
    case 'DISCONNECT':
      return 'log-disconnect';
    case 'RESET':
      return 'log-reset';
    default:
      return '';
  }
}

export default function EventLog({ logs }: EventLogProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="event-log">
      <h3>Event Log</h3>
      <div className="log-entries">
        {logs.length === 0 && (
          <div className="log-empty">No events yet</div>
        )}
        {logs.map((entry, i) => (
          <div key={i} className={`log-entry ${getActionClass(entry.action)}`}>
            <span className="log-time">{entry.time}</span>
            <span className="log-team">{entry.team}</span>
            <span className="log-action">{entry.action}</span>
            {entry.message && <span className="log-message">{entry.message}</span>}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
