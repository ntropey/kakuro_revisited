/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * Keyboard play: digits, erase, notes and the arrow keys.
 */
import { useEffect, useRef } from 'react';
import { moveSelection, type CellKind, type GameState } from '../game';

export interface KeyboardPlay {
  cells: readonly CellKind[];
  /** The latest game, read when a key is pressed. */
  getGame: () => GameState | null;
  onDigit: (digit: number) => void;
  onErase: () => void;
  onSelect: (cell: number) => void;
  onToggleNotes: () => void;
}

/** Keys typed into a form control belong to the control, not to the board. */
function isTextTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

export function useKeyboardPlay(play: KeyboardPlay): void {
  // The listener is attached once and reads the handlers of the latest render.
  const latest = useRef(play);
  latest.current = play;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTextTarget(e.target)) return;
      const { cells, getGame, onDigit, onErase, onSelect, onToggleNotes } = latest.current;
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        onDigit(Number(e.key));
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        onErase();
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onToggleNotes();
        return;
      }
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      const current = getGame();
      if (!current) return;
      e.preventDefault();
      const next = moveSelection(cells, current.selected, e.key);
      if (next >= 0) onSelect(next);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
