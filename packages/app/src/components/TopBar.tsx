/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The top bar: what is being played, how long it takes and what the player can open.
 */
export interface TopBarProps {
  title: string;
  level: number;
  levelName: string;
  elapsedMs: number;
  showTimer: boolean;
  onNew: () => void;
  onDaily: () => void;
  onCoach: () => void;
  onHints: () => void;
  onCombinations: () => void;
  onShare: () => void;
  onSettings: () => void;
}

export function TopBar({
  title,
  level,
  levelName,
  elapsedMs,
  showTimer,
  onNew,
  onDaily,
  onCoach,
  onHints,
  onCombinations,
  onShare,
  onSettings,
}: TopBarProps) {
  const total = Math.floor(elapsedMs / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const time = `${m}:${String(s).padStart(2, '0')}`;
  return (
    <header className="top-bar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          ▦
        </span>
        <span className="brand-text">Kakuro Revisited</span>
      </div>
      <div className="puzzle-meta">
        <span className="puzzle-title">{title}</span>
        <span className="badge" title={`Difficulty: ${levelName}`}>
          {levelName}
        </span>
        <span className="badge subtle">L{level}</span>
        {showTimer ? <span className="timer">{time}</span> : null}
      </div>
      <nav className="top-actions">
        <button type="button" className="primary" onClick={onNew} title="New puzzle">
          New
        </button>
        <button type="button" onClick={onDaily} title="Daily puzzle">
          Daily
        </button>
        <button type="button" onClick={onCoach} title="Coach me">
          Coach
        </button>
        <button type="button" onClick={onHints} title="Available techniques">
          Hints
        </button>
        <button type="button" onClick={onCombinations} title="Sum combinations">
          Sums
        </button>
        <button type="button" onClick={onShare} title="Share the result">
          Share
        </button>
      </nav>
      <button type="button" className="ghost settings-btn" onClick={onSettings} title="Settings" aria-label="Settings">
        ⚙
      </button>
    </header>
  );
}
