/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The share card of a finished puzzle.
 */
import { CELL_COUNT, GRID_SIZE } from '@kakuro/core';

export interface ShareInfo {
  /** The solution grid, 81 entries, 0 for the block cells. */
  solution: readonly number[];
  /** The difficulty level of the puzzle. */
  level: number;
  /** The name of the difficulty level. */
  levelName: string;
  /** How long the player needed. */
  elapsedMs: number;
  /** The date of a Daily Puzzle, `YYYY-MM-DD`. */
  daily?: string;
  /** How many hints were used. */
  hintsUsed: number;
  /** The name of the layout the puzzle was built on. */
  layout?: string;
}

/** The solved grid as text: block cells become `#`, the white cells become their digit. */
export function buildShareGrid(solution: readonly number[]): string {
  const lines: string[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const cells: string[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const v = solution[r * GRID_SIZE + c] ?? 0;
      cells.push(v > 0 ? String(v) : '#');
    }
    lines.push(cells.join(' '));
  }
  return lines.join('\n');
}

/** The full text of the share card. */
export function buildShareText(info: ShareInfo): string {
  const total = Math.floor(info.elapsedMs / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const time = `${m}:${String(s).padStart(2, '0')}`;
  const head = info.daily
    ? `Kakuro Revisited · Daily ${info.daily}`
    : 'Kakuro Revisited';
  const meta = [
    info.levelName,
    time,
    info.hintsUsed > 0 ? `${info.hintsUsed} hints` : null,
    info.layout ? `layout: ${info.layout}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return `${head}\n${meta}\n\n${buildShareGrid(info.solution)}\n\nhttps://kakurorevisited.com/play/`;
}

/** The number of white cells of a solution grid. */
export function whiteCount(solution: readonly number[]): number {
  let n = 0;
  for (let i = 0; i < CELL_COUNT; i++) if ((solution[i] ?? 0) > 0) n++;
  return n;
}
