/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The solve path panel: the techniques the puzzle needs, hardest first.
 */
import type { PathEntry } from '../protocol';

export interface PathPanelProps {
  path: PathEntry[];
  onClose: () => void;
}

export function PathPanel({ path, onClose }: PathPanelProps) {
  return (
    <div className="panel path-panel">
      <div className="panel-head">
        <h2>Solve path</h2>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close the path">
          ✕
        </button>
      </div>
      {path.length === 0 ? (
        <p className="empty">The path of this puzzle is not known yet.</p>
      ) : (
        <ul className="path-list">
          {path.map((p) => (
            <li key={`${p.type}-${p.name}`}>
              <span className="path-name">{p.name}</span>
              <span className="path-count">{p.count}×</span>
              <span className="path-score">{p.score} pts</span>
            </li>
          ))}
        </ul>
      )}
      <p className="hint-text">
        The path shows every technique the puzzle needs. It is the plan the solver follows, and it
        tells you what to learn next.
      </p>
    </div>
  );
}
