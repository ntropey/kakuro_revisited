/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The digit pad: nine digits, an eraser and the pencil mark switch.
 */
export interface DigitPadProps {
  /** How often each digit still appears in the puzzle. */
  counts: Record<number, number>;
  /** True while the pad writes pencil marks instead of digits. */
  notesMode: boolean;
  /** The digits the selected cell cannot take. */
  disabled: Set<number>;
  onDigit: (digit: number) => void;
  onErase: () => void;
  onToggleNotes: () => void;
}

export function DigitPad({ counts, notesMode, disabled, onDigit, onErase, onToggleNotes }: DigitPadProps) {
  return (
    <div className="digit-pad">
      <div className="digits">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <button
            key={d}
            type="button"
            className={`digit${disabled.has(d) ? ' disabled' : ''}`}
            onClick={() => onDigit(d)}
            disabled={disabled.has(d)}
          >
            <span className="digit-value">{d}</span>
            <span className="digit-count">{Math.max(0, counts[d] ?? 0)}</span>
          </button>
        ))}
      </div>
      <div className="pad-actions">
        <button
          type="button"
          className={`pad-btn${notesMode ? ' active' : ''}`}
          onClick={onToggleNotes}
          aria-pressed={notesMode}
          title="Pencil marks"
        >
          Notes
        </button>
        <button type="button" className="pad-btn" onClick={onErase} title="Erase the selected cell">
          Erase
        </button>
      </div>
    </div>
  );
}
