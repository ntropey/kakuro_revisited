/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The statistics panel: what the player has solved, their best time, the Daily streak and the
 * latest puzzles.
 */
import type { HistoryEntry, Stats } from '../store';
import { formatElapsed, levelName } from '../ui';

export interface StatsPanelProps {
  stats: Stats;
  /** The Daily streak that is still alive today. */
  streak: number;
  /** The solved puzzles, newest first. */
  history: readonly HistoryEntry[];
  onClose: () => void;
}

const RECENT = 10;

function shortDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function StatsPanel({ stats, streak, history, onClose }: StatsPanelProps) {
  const levels = [1, 2, 3, 4, 5];
  const most = Math.max(1, ...levels.map((l) => stats.byLevel[l] ?? 0));
  return (
    <div className="panel stats-panel">
      <div className="panel-head">
        <h2>Statistics</h2>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close the statistics">
          ✕
        </button>
      </div>
      {stats.solved === 0 ? (
        <p className="empty">Solve a puzzle and your times and streak show up here.</p>
      ) : (
        <>
          <dl className="stat-figures">
            <div>
              <dt>Solved</dt>
              <dd>{stats.solved}</dd>
            </div>
            <div>
              <dt>Daily streak</dt>
              <dd>{streak}</dd>
            </div>
            <div>
              <dt>Best time</dt>
              <dd>{formatElapsed(stats.bestSeconds * 1000)}</dd>
            </div>
          </dl>

          <h3>By difficulty</h3>
          <ul className="level-bars">
            {levels.map((l) => {
              const n = stats.byLevel[l] ?? 0;
              return (
                <li key={l}>
                  <span className="level-name">{levelName(l)}</span>
                  <span className="level-track" aria-hidden="true">
                    <span className="level-fill" style={{ width: `${(n / most) * 100}%` }} />
                  </span>
                  <span className="level-count">{n}</span>
                </li>
              );
            })}
          </ul>

          <h3>Recent</h3>
          <ul className="recent-list">
            {history.slice(0, RECENT).map((h) => (
              <li key={h.id}>
                <span className="recent-level">{levelName(h.level)}</span>
                {h.daily ? <span className="badge subtle">Daily</span> : null}
                <span className="recent-time">{formatElapsed(h.seconds * 1000)}</span>
                <span className="recent-date">{shortDate(h.at)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
