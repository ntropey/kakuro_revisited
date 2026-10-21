/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The running game: it holds the state and puts the clock, saving, puzzle loading and moves together.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import { parseKakuro, type KakuroCellDef } from '@kakuro/core';
import { cloneGame, createGame, type GameState } from '../game';
import type { PuzzleInfo } from '../protocol';
import type { SolverClient } from '../solverClient';
import { loadGame, restoreGame } from '../store';
import type { Settings } from '../ui';
import { useGameClock } from './useGameClock';
import { useGamePersistence } from './useGamePersistence';
import { useMoves } from './useMoves';
import { usePuzzleLoader } from './usePuzzleLoader';

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

  const cells = useMemo<readonly KakuroCellDef[]>(
    () => (game ? parseKakuro(game.puzzle).board.cells : []),
    [game?.puzzle],
  );

  const { elapsedMs, restart } = useGameClock(game, solved);
  useGamePersistence(game, gameRef, elapsedMs);

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

  const startPuzzle = useCallback(
    (info: PuzzleInfo) => {
      const next = createGame(info);
      gameRef.current = next;
      setGame(next);
      setSolved(false);
      onPuzzleStartRef.current();
      setStatus('');
      editedNotes.current = new Set();
      restart();
    },
    [restart, setStatus],
  );

  const { loadPuzzle } = usePuzzleLoader({ settings, getClient, setBusy, setStatus, hasGame: !!game, startPuzzle });

  const handleSolved = useCallback((finished: GameState, ms: number) => onSolvedRef.current(finished, ms), []);

  const moves = useMoves({
    game,
    update,
    settings,
    getClient,
    elapsedMs,
    editedNotes,
    onSolved: handleSolved,
    setSolved,
  });

  return {
    game,
    getGame: () => gameRef.current,
    cells,
    elapsedMs,
    solved,
    setSolved,
    loadPuzzle,
    ...moves,
  };
}
