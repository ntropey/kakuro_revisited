/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * Keeps the running game in localStorage: after every change, and when the page is hidden so the
 * seconds since the last move are not lost.
 */
import { useEffect, useRef, type MutableRefObject } from 'react';
import type { GameState } from '../game';
import { saveGame } from '../store';

export function useGamePersistence(
  game: GameState | null,
  gameRef: MutableRefObject<GameState | null>,
  elapsedMs: number,
): void {
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
  }, [gameRef]);
}
