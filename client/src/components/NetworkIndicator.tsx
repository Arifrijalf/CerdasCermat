import type { ConnectionQuality } from '@quickbuzz/shared';

interface NetworkIndicatorProps {
  quality: ConnectionQuality;
  ping: number | null;
}

const labels: Record<ConnectionQuality, string> = {
  good: 'Connected',
  fair: 'Reconnecting...',
  poor: 'Weak Connection',
  disconnected: 'Disconnected',
};

export default function NetworkIndicator({ quality, ping }: NetworkIndicatorProps) {
  return (
    <div className={`network-indicator ${quality}`}>
      <span className="network-dot" />
      <span className="network-text">{labels[quality]}</span>
      {ping !== null && quality !== 'disconnected' && (
        <span className="network-ping">{ping}ms</span>
      )}
    </div>
  );
}
