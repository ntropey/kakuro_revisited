/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The settings sheet.
 */
import { HINT_LEVEL_NAMES } from '../protocol';
import { LEVEL_NAMES, type Settings } from '../ui';

export interface SettingsSheetProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
}

export function SettingsSheet({ settings, onChange, onClose }: SettingsSheetProps) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="panel settings-panel">
      <div className="panel-head">
        <h2>Settings</h2>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close the settings">
          ✕
        </button>
      </div>

      <fieldset>
        <legend>Appearance</legend>
        <label className="row">
          <span>Theme</span>
          <select value={settings.theme} onChange={(e) => set('theme', e.target.value as Settings['theme'])}>
            <option value="auto">Follow the system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label className="row">
          <span>Show the timer</span>
          <input
            type="checkbox"
            checked={settings.showTimer}
            onChange={(e) => set('showTimer', e.target.checked)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Playing</legend>
        <label className="row">
          <span>Keep the pencil marks up to date</span>
          <input
            type="checkbox"
            checked={settings.autoNotes}
            onChange={(e) => set('autoNotes', e.target.checked)}
          />
        </label>
        <label className="row">
          <span>Shade the runs of the selected cell</span>
          <input
            type="checkbox"
            checked={settings.highlightPeers}
            onChange={(e) => set('highlightPeers', e.target.checked)}
          />
        </label>
        <label className="row">
          <span>Shade the cells with the same digit</span>
          <input
            type="checkbox"
            checked={settings.highlightSameDigit}
            onChange={(e) => set('highlightSameDigit', e.target.checked)}
          />
        </label>
        <label className="row">
          <span>Ask before a wrong digit is accepted</span>
          <input
            type="checkbox"
            checked={settings.confirmOnMistake}
            onChange={(e) => set('confirmOnMistake', e.target.checked)}
          />
        </label>
      </fieldset>

      <fieldset>
        <legend>Difficulty</legend>
        <label className="row">
          <span>New puzzles</span>
          <select value={settings.puzzleLevel} onChange={(e) => set('puzzleLevel', Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {LEVEL_NAMES[n]}
              </option>
            ))}
          </select>
        </label>
        <label className="row">
          <span>Daily puzzles</span>
          <select value={settings.dailyLevel} onChange={(e) => set('dailyLevel', Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {LEVEL_NAMES[n]}
              </option>
            ))}
          </select>
        </label>
        <label className="row">
          <span>The hardest hint</span>
          <select value={settings.hintLevel} onChange={(e) => set('hintLevel', Number(e.target.value))}>
            {HINT_LEVEL_NAMES.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <p className="hint-text">
        Learn the techniques on the website:{' '}
        <a href="https://kakurorevisited.com/techniques/" target="_blank" rel="noreferrer">
          the technique guides
        </a>
        .
      </p>
    </div>
  );
}
