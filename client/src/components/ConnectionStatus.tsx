import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  connected: boolean;
}

export default function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${connected ? 'text-success' : 'text-danger'}`}>
      {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
      <span>{connected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
}
