/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The player's history and statistics, and the outcome of the solve that just happened.
 */
import { useMemo, useState } from 'react';
import type { GameState } from '../game';
import { activeStreak, loadHistory, loadStats, recordSolve, type SolveRecord } from '../store';
import { todayString } from '../ui';

export function useRecords() {
  const [stats, setStats] = useState(() => loadStats(window.localStorage));
  const [history, setHistory] = useState(() => loadHistory(window.localStorage));
  const [lastSolve, setLastSolve] = useState<SolveRecord | null>(null);

  /** The Daily streak as it stands today; it lapses when a day is missed. */
  const streak = useMemo(() => activeStreak(window.localStorage, todayString()), [stats, history]);

  /** Count the puzzle the player just finished. */
  const recordSolved = (game: GameState, elapsedMs: number) => {
    const rec = recordSolve(window.localStorage, {
      puzzle: game.puzzle,
      level: game.level,
      score: game.score,
      seconds: Math.round(elapsedMs / 1000),
      daily: game.daily,
      hintsUsed: game.hintsUsed,
      today: todayString(),
      at: Date.now(),
    });
    setLastSolve(rec);
    setStats(rec.stats);
    setHistory(loadHistory(window.localStorage));
  };

  return { stats, history, streak, lastSolve, recordSolved };
}

export type Records = ReturnType<typeof useRecords>;
