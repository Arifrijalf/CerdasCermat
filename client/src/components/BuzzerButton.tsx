interface BuzzerButtonProps {
  teamName: string;
  disabled: boolean;
  winner: string | null;
  winnerName: string | null;
  isWinner: boolean;
  onBuzz: () => void;
  teamColor?: string;
}

export default function BuzzerButton({
  teamName,
  disabled,
  winner,
  winnerName,
  isWinner,
  onBuzz,
  teamColor,
}: BuzzerButtonProps) {
  if (isWinner) {
    return (
      <div className="buzzer-container winner" style={teamColor ? { borderColor: teamColor } : undefined}>
        <div className="winner-text">YOU WIN!</div>
        <div className="winner-team">{teamName}</div>
      </div>
    );
  }

  if (disabled && winner) {
    return (
      <div className="buzzer-container locked">
        <div className="locked-text">LOCKED</div>
        <div className="winner-name">Winner: {winnerName ?? winner}</div>
      </div>
    );
  }

  return (
    <div className="buzzer-container ready">
      <div className="team-label">{teamName}</div>
      <button
        className="buzzer-button"
        onClick={onBuzz}
        disabled={disabled}
        aria-label="Buzz"
        style={teamColor ? { background: teamColor, boxShadow: `0 8px 32px ${teamColor}4D, 0 0 0 4px ${teamColor}1A` } : undefined}
      >
        BUZZ
      </button>
    </div>
  );
}
