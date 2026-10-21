/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * What the board and the digit pad show about the game: digits left, blocked digits, wrong cells.
 */
import { useMemo } from 'react';
import type { KakuroCellDef } from '@kakuro/core';
import { blockedDigits, remainingDigitCounts, wrongCells, type GameState } from '../game';

export function useBoardView(game: GameState | null, cells: readonly KakuroCellDef[]) {
  const counts = useMemo(() => (game ? remainingDigitCounts(game) : {}), [game]);
  const disabledDigits = useMemo(() => (game ? blockedDigits(cells, game) : new Set<number>()), [game, cells]);
  const wrong = useMemo(() => (game ? wrongCells(game) : new Set<number>()), [game]);
  return { counts, disabledDigits, wrong };
}
