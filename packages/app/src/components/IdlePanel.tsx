/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The side panel when no tool is open: how far the puzzle is and where to go next.
 */
export interface IdlePanelProps {
  /** White cells that hold a digit. */
  filled: number;
  /** All white cells of the puzzle. */
  total: number;
  onCoach: () => void;
  onHints: () => void;
  onCombinations: () => void;
}

export function IdlePanel({ filled, total, onCoach, onHints, onCombinations }: IdlePanelProps) {
  const percent = total > 0 ? Math.round((filled / total) * 100) : 0;
  return (
    <div className="panel idle-panel">
      <h2>Your puzzle</h2>
      <div
        className="progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={filled}
        aria-label="Cells filled"
      >
        <span className="progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="hint-text">
        {filled} of {total} cells filled
      </p>

      <h3>Stuck?</h3>
      <div className="idle-actions">
        <button type="button" onClick={onHints}>
          Find a technique
        </button>
        <button type="button" onClick={onCoach}>
          Coach me
        </button>
        <button type="button" onClick={onCombinations}>
          Sum combinations
        </button>
      </div>

      <h3>Keys</h3>
      <dl className="key-list">
        <dt>1–9</dt>
        <dd>place a digit, or a pencil mark in notes mode</dd>
        <dt>N</dt>
        <dd>switch notes on or off</dd>
        <dt>⌫</dt>
        <dd>erase the cell</dd>
        <dt>← ↑ ↓ →</dt>
        <dd>move the selection</dd>
      </dl>
    </div>
  );
}
