/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The dialog that appears when the puzzle is solved.
 */
import { formatElapsed } from '../ui';

export interface SolvedDialogProps {
  levelName: string;
  elapsedMs: number;
  hintsUsed: number;
  daily?: string;
  /** Set when this solve beat the player's best time. */
  newBest?: boolean;
  /** The Daily streak after this solve; shown for a Daily Puzzle. */
  streak?: number;
  onShare: () => void;
  onNew: () => void;
  onClose: () => void;
}

export function SolvedDialog({
  levelName,
  elapsedMs,
  hintsUsed,
  daily,
  newBest,
  streak,
  onShare,
  onNew,
  onClose,
}: SolvedDialogProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal solved" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Puzzle solved">
        <h2>Solved</h2>
        <p className="solved-time">{formatElapsed(elapsedMs)}</p>
        <p className="solved-meta">
          {levelName}
          {daily ? ` · Daily ${daily}` : ''}
          {hintsUsed > 0 ? ` · ${hintsUsed} hints` : ''}
        </p>
        {newBest ? <p className="solved-note">New personal best</p> : null}
        {daily && streak && streak > 1 ? <p className="solved-note">Daily streak: {streak} days</p> : null}
        <div className="panel-actions">
          <button type="button" onClick={onShare}>
            Share
          </button>
          <button type="button" className="primary" onClick={onNew}>
            New puzzle
          </button>
        </div>
      </div>
    </div>
  );
}
