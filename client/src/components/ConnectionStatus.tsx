interface ConnectionStatusProps {
  connected: boolean;
}

export default function ConnectionStatus({ connected }: ConnectionStatusProps) {
  return (
    <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
      <span className="status-dot" />
      <span>{connected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
}
