import type { ConnectionQuality } from '@quickbuzz/shared';
import { Signal, SignalLow, SignalMedium, WifiOff } from 'lucide-react';

interface NetworkIndicatorProps {
  quality: ConnectionQuality;
  ping: number | null;
}

const config: Record<ConnectionQuality, { label: string; color: string; Icon: typeof Signal }> = {
  good: { label: 'Connected', color: 'text-success', Icon: Signal },
  fair: { label: 'Reconnecting...', color: 'text-warning', Icon: SignalMedium },
  poor: { label: 'Weak Connection', color: 'text-orange', Icon: SignalLow },
  disconnected: { label: 'Disconnected', color: 'text-danger', Icon: WifiOff },
};

export default function NetworkIndicator({ quality, ping }: NetworkIndicatorProps) {
  const { label, color, Icon } = config[quality];

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-medium ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {ping !== null && quality !== 'disconnected' && (
        <span className="text-text-muted font-mono text-[0.65rem]">{ping}ms</span>
      )}
    </div>
  );
}
