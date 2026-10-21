/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * Every move the player can make, and the pencil marks that follow the solver after a move.
 */
import { useCallback, type MutableRefObject } from 'react';
import { CELL_COUNT, type StepMarks } from '@kakuro/core';
import {
  clearNotes,
  eraseCell,
  isSolved,
  placeDigit,
  pushHistory,
  redo,
  selectCell,
  setNotesMode,
  toggleNote,
  undo,
  type GameState,
} from '../game';
import type { SolverClient } from '../solverClient';
import type { Settings } from '../ui';

export interface MovesOptions {
  game: GameState | null;
  /** Apply a change to a copy of the game and return the new state. */
  update: (fn: (g: GameState) => void) => GameState | null;
  settings: Settings;
  getClient: () => SolverClient;
  elapsedMs: number;
  /** Cells whose pencil marks the player changed by hand; the solver leaves them alone. */
  editedNotes: MutableRefObject<Set<number>>;
  /** Called once a move completes the puzzle. */
  onSolved: (game: GameState, elapsedMs: number) => void;
  setSolved: (solved: boolean) => void;
}

export function useMoves({ game, update, settings, getClient, elapsedMs, editedNotes, onSolved, setSolved }: MovesOptions) {
  // The pencil marks follow the solver when the setting is on.
  const refreshNotes = useCallback(
    async (g: GameState) => {
      if (!settings.autoNotes) return;
      try {
        const cands = await getClient().candidates(g.puzzle, g.values);
        update((cur) => {
          for (let i = 0; i < CELL_COUNT; i++) {
            if (cur.values[i] > 0) {
              cur.notes[i] = 0;
              continue;
            }
            if (!settings.autoNotes || editedNotes.current.has(i)) continue;
            cur.notes[i] = cands[i] ?? 0;
          }
        });
      } catch {
        /* the marks are a convenience, not a must */
      }
    },
    [editedNotes, getClient, settings.autoNotes, update],
  );

  const afterMove = useCallback(
    (g: GameState) => {
      if (isSolved(g)) {
        setSolved(true);
        onSolved(g, elapsedMs);
        update((cur) => {
          cur.elapsedMs = elapsedMs;
        });
        return;
      }
      void refreshNotes(g);
    },
    [elapsedMs, onSolved, refreshNotes, setSolved, update],
  );

  const onSelect = (cell: number) => {
    update((g) => {
      selectCell(g, cell);
    });
  };

  const onDigit = (digit: number) => {
    if (!game) return;
    if (game.notesMode) {
      update((g) => {
        const cell = g.selected;
        toggleNote(g, digit);
        if (cell >= 0) editedNotes.current.add(cell);
      });
      return;
    }
    const cell = game.selected;
    if (cell < 0) return;
    const wrong = game.solution[cell] > 0 && game.solution[cell] !== digit;
    if (wrong && settings.confirmOnMistake && !window.confirm(`${digit} does not fit in this cell. Write it anyway?`)) {
      return;
    }
    const next = update((g) => {
      placeDigit(g, digit);
    });
    if (next) afterMove(next);
  };

  const onErase = () => {
    const next = update((g) => {
      eraseCell(g);
    });
    if (next) afterMove(next);
  };

  const onUndo = () => {
    update((g) => {
      undo(g);
    });
  };

  const onRedo = () => {
    update((g) => {
      redo(g);
    });
  };

  const onClearNotes = () => {
    update((g) => {
      clearNotes(g);
    });
  };

  const onToggleNotes = () => {
    update((g) => {
      setNotesMode(g, !g.notesMode);
    });
  };

  /** Write the digits of a coach step into the board and strike its eliminated pencil marks. */
  const applyMarks = (marks: StepMarks) => {
    if (!game) return;
    const next = update((g) => {
      pushHistory(g);
      for (const m of marks.place) {
        if (g.values[m.cell] === 0) g.values[m.cell] = m.digit;
      }
      for (const m of marks.elim) {
        if (g.values[m.cell] === 0) g.notes[m.cell] &= ~(1 << m.digit);
      }
      g.hintsUsed += 1;
    });
    if (next) afterMove(next);
  };

  return { onSelect, onDigit, onErase, onUndo, onRedo, onClearNotes, onToggleNotes, applyMarks };
}
