/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The clock of the running game: time already played plus the time since the puzzle came up.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from '../game';

export function useGameClock(game: GameState | null, solved: boolean) {
  const [now, setNow] = useState(() => Date.now());
  const startedAt = useRef(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsedMs = game ? game.elapsedMs + (solved ? 0 : Math.max(0, now - startedAt.current)) : 0;

  /** Start counting from zero, for a new puzzle. */
  const restart = useCallback(() => {
    startedAt.current = Date.now();
    setNow(Date.now());
  }, []);

  return { elapsedMs, restart };
}
