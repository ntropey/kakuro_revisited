/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The running game: loading a puzzle, the clock, saving, and every move the player can make.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CELL_COUNT, parseKakuro, type KakuroCellDef, type StepMarks } from '@kakuro/core';
import {
  clearNotes,
  cloneGame,
  createGame,
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
import type { PuzzleInfo } from '../protocol';
import { isCancelled, type SolverClient } from '../solverClient';
import { loadGame, loadSeen, restoreGame, saveGame, saveSeen } from '../store';
import { todayString, type Settings } from '../ui';

export interface GameSessionOptions {
  settings: Settings;
  getClient: () => SolverClient;
  setBusy: (busy: boolean) => void;
  setStatus: (status: string) => void;
  /** Called when a new puzzle replaces the current one, so tools can drop what they showed. */
  onPuzzleStart: () => void;
  /** Called once a move completes the puzzle, with the finished game and the time it took. */
  onSolved: (game: GameState, elapsedMs: number) => void;
}

export function useGameSession({
  settings,
  getClient,
  setBusy,
  setStatus,
  onPuzzleStart,
  onSolved,
}: GameSessionOptions) {
  const [game, setGame] = useState<GameState | null>(() => {
    const saved = loadGame(window.localStorage);
    return saved ? restoreGame(saved) : null;
  });
  const [solved, setSolved] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const startedAt = useRef(Date.now());
  /** The latest game, so a move can act on it without waiting for a render. */
  const gameRef = useRef<GameState | null>(game);
  /** Cells whose pencil marks the player changed by hand; the solver leaves them alone. */
  const editedNotes = useRef<Set<number>>(
    new Set(game ? game.notes.map((mask, i) => (mask ? i : -1)).filter((i) => i >= 0) : []),
  );
  const onPuzzleStartRef = useRef(onPuzzleStart);
  onPuzzleStartRef.current = onPuzzleStart;
  const onSolvedRef = useRef(onSolved);
  onSolvedRef.current = onSolved;

  // The timer.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const cells = useMemo<readonly KakuroCellDef[]>(
    () => (game ? parseKakuro(game.puzzle).board.cells : []),
    [game?.puzzle],
  );

  const elapsedMs = game ? game.elapsedMs + (solved ? 0 : Math.max(0, now - startedAt.current)) : 0;

  const startPuzzle = useCallback((info: PuzzleInfo) => {
    const next = createGame(info);
    gameRef.current = next;
    setGame(next);
    setSolved(false);
    onPuzzleStartRef.current();
    setStatus('');
    editedNotes.current = new Set();
    startedAt.current = Date.now();
    setNow(Date.now());
  }, [setStatus]);

  const loadPuzzle = useCallback(
    async (kind: 'new' | 'daily' | 'bank') => {
      setBusy(true);
      setStatus('Finding a puzzle…');
      try {
        let info: PuzzleInfo;
        if (kind === 'daily') {
          info = await getClient().daily(todayString(), settings.dailyLevel);
        } else if (kind === 'bank') {
          const seen = loadSeen(window.localStorage);
          const key = String(settings.puzzleLevel);
          const used = seen[key] ?? [];
          info = await getClient().fromBank(settings.puzzleLevel, used);
          if (info.bankIndex !== undefined) {
            saveSeen(window.localStorage, { ...seen, [key]: [...new Set([...used, info.bankIndex])] });
          }
        } else {
          info = await getClient().generate(settings.puzzleLevel);
        }
        startPuzzle(info);
      } catch (e) {
        if (!isCancelled(e)) setStatus(e instanceof Error ? e.message : 'The puzzle could not be loaded.');
      } finally {
        setBusy(false);
      }
    },
    [getClient, settings.dailyLevel, settings.puzzleLevel, setBusy, setStatus, startPuzzle],
  );

  // The first puzzle of a fresh visit.
  useEffect(() => {
    if (game) return;
    // The Daily Puzzle can be linked directly: /play/?daily=1
    const daily = new URLSearchParams(window.location.search).get('daily') === '1';
    void loadPuzzle(daily ? 'daily' : 'new');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The game is stored whenever it changes; the clock is topped up when the page is hidden.
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsedMs;
  useEffect(() => {
    if (!game) return;
    saveGame(window.localStorage, game, elapsedRef.current);
  }, [game]);

  useEffect(() => {
    const save = () => {
      if (gameRef.current) saveGame(window.localStorage, gameRef.current, elapsedRef.current);
    };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', save);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', save);
    };
  }, []);

  /** Apply a change to a copy of the game and return the new state, so the caller can react to it. */
  const update = useCallback((fn: (g: GameState) => void): GameState | null => {
    const cur = gameRef.current;
    if (!cur) return null;
    const next = cloneGame(cur);
    fn(next);
    gameRef.current = next;
    setGame(next);
    return next;
  }, []);

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
    [getClient, settings.autoNotes, update],
  );

  const afterMove = useCallback(
    (g: GameState) => {
      if (isSolved(g)) {
        setSolved(true);
        onSolvedRef.current(g, elapsedMs);
        update((cur) => {
          cur.elapsedMs = elapsedMs;
        });
        return;
      }
      void refreshNotes(g);
    },
    [elapsedMs, refreshNotes, update],
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

  return {
    game,
    getGame: () => gameRef.current,
    cells,
    elapsedMs,
    solved,
    setSolved,
    loadPuzzle,
    onSelect,
    onDigit,
    onErase,
    onUndo,
    onRedo,
    onClearNotes,
    onToggleNotes,
    applyMarks,
  };
}
