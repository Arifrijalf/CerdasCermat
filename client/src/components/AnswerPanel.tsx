import { useState } from 'react';

interface AnswerPanelProps {
  winnerId: string | null;
  winnerName: string | null;
  onCorrect: (teamId: string, points?: number) => void;
  onWrong: (teamId: string, points?: number) => void;
  onSkip: () => void;
  onRebuttalStart: () => void;
}

const POINT_OPTIONS = [5, 10, 15, 20];

export default function AnswerPanel({ winnerId, winnerName, onCorrect, onWrong, onSkip, onRebuttalStart }: AnswerPanelProps) {
  const [points, setPoints] = useState(10);
  const [wrongPoints, setWrongPoints] = useState(0);

  if (!winnerId) return null;

  return (
    <div className="answer-panel">
      <h3>Answer Validation</h3>
      <div className="answer-winner">Winner: <strong>{winnerName}</strong></div>

      <div className="answer-points">
        <label>Points: {points}</label>
        <div className="point-options">
          {POINT_OPTIONS.map(p => (
            <button key={p} className={`btn btn-tiny ${points === p ? 'btn-start' : ''}`} onClick={() => setPoints(p)}>{p}</button>
          ))}
        </div>
      </div>

      <div className="answer-actions">
        <button className="btn btn-start" onClick={() => onCorrect(winnerId, points)}>Correct</button>
        <button className="btn btn-danger" onClick={() => onWrong(winnerId, wrongPoints)}>Wrong</button>
        <button className="btn btn-reset" onClick={onSkip}>Skip</button>
      </div>

      {wrongPoints > 0 && (
        <div className="wrong-points">
          <label>Penalty: -{wrongPoints}</label>
          {POINT_OPTIONS.map(p => (
            <button key={p} className={`btn btn-tiny ${wrongPoints === p ? 'btn-danger' : ''}`} onClick={() => setWrongPoints(p)}>{p}</button>
          ))}
        </div>
      )}

      <div className="rebuttal-section">
        <button className="btn btn-export" onClick={onRebuttalStart}>Activate Rebuttal</button>
      </div>
    </div>
  );
}
