/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The hints panel: every technique that is available on the board right now.
 */
import type { HintResult } from '../protocol';

export interface HintsPanelProps {
  results: HintResult[];
  /** How many steps of each technique are available. */
  total: Record<string, number>;
  busy: boolean;
  onPick: (hint: HintResult) => void;
  onClose: () => void;
}

export function HintsPanel({ results, total, busy, onPick, onClose }: HintsPanelProps) {
  return (
    <div className="panel hints-panel">
      <div className="panel-head">
        <h2>Available techniques</h2>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close the hints">
          ✕
        </button>
      </div>
      {busy ? <p className="empty">Looking…</p> : null}
      {!busy && results.length === 0 ? (
        <p className="empty">No step is available right now. Fill in a few more digits and look again.</p>
      ) : null}
      {results.length > 0 ? (
        <ul className="hint-list">
          {results.map((h, i) => (
            <li key={`${h.type}-${i}`}>
              <button type="button" onClick={() => onPick(h)}>
                <span className="hint-name">{h.name}</span>
                <span className="hint-text-inline">{h.text}</span>
                <span className="hint-total">{total[h.type] ?? 1} available</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
