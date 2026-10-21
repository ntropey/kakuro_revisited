/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The dialog that appears when the puzzle is solved.
 */
export interface SolvedDialogProps {
  levelName: string;
  elapsedMs: number;
  hintsUsed: number;
  daily?: string;
  onShare: () => void;
  onNew: () => void;
  onClose: () => void;
}

export function SolvedDialog({ levelName, elapsedMs, hintsUsed, daily, onShare, onNew, onClose }: SolvedDialogProps) {
  const total = Math.floor(elapsedMs / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal solved" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Puzzle solved">
        <h2>Solved</h2>
        <p className="solved-time">
          {m}:{String(s).padStart(2, '0')}
        </p>
        <p className="solved-meta">
          {levelName}
          {daily ? ` · Daily ${daily}` : ''}
          {hintsUsed > 0 ? ` · ${hintsUsed} hints` : ''}
        </p>
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
