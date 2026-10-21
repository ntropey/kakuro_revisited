/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Board layouts ("templates") for Kakuro grids.
 *
 * A layout is an 81 character string where `#` marks a clue or block cell and `.` marks a white
 * cell. Every white cell must sit in a horizontal run of at least two cells (so it has an Across
 * clue) and in a vertical run of at least two cells (so it has a Down clue). Row 0 and column 0
 * are always blocks, which makes the clue cells of the first row and column the sum headers.
 */
import { CELL_COUNT, GRID_SIZE } from './board';

export interface LayoutStats {
  /** Number of white cells. */
  whiteCells: number;
  /** Number of clue cells. */
  clueCells: number;
  /** Histogram of run lengths, e.g. `{ 2: 8, 3: 4 }`. */
  runLengths: Record<number, number>;
  /** Longest run in the layout. */
  longestRun: number;
  /** True when the layout is symmetric under a 180 degree rotation. */
  symmetric: boolean;
}

export interface LayoutValidation {
  ok: boolean;
  reason: string | null;
}

/** The classic staircase layout: only two-cell runs, ideal for Easy puzzles. */
export const LAYOUT_STAIRCASE =
  '#########' + '#..######' + '#..######' + '##..#####' + '##..#####' + '###..#..#' + '###..#..#' + '####...##' + '####...##';

/** Diagonal staircase with three-cell runs at the edges. */
export const LAYOUT_DIAGONAL =
  '#########' + '#..######' + '#..######' + '##..#####' + '##..#####' + '###...###' + '###...###' + '#####...#' + '#####...#';

/** Open diagonal with long runs. */
export const LAYOUT_OPEN =
  '#########' + '#..######' + '#..######' + '#...#####' + '#...#####' + '###...###' + '###...###' + '####...##' + '####...##';

/** Three-cell runs throughout, wider board. */
export const LAYOUT_WIDE =
  '#########' + '#...#####' + '#...#####' + '##...####' + '##...####' + '####...##' + '####...##' + '#####...#' + '#####...#';

/** Alternating staircase with a right-hand column of runs. */
export const LAYOUT_RIGHT =
  '#########' + '#..######' + '#..######' + '##..###..' + '##..###..' + '###..#..#' + '###..#..#' + '####...##' + '####...##';

/** Longest staircase, hardest of the built-in layouts. */
export const LAYOUT_LONG =
  '#########' + '#..######' + '#..######' + '#...###..' + '#...###..' + '###..#...' + '###..#...' + '####...##' + '####...##';

/** All built-in layouts, ordered from easiest to hardest. */
export const KAKURO_TEMPLATES: readonly string[] = [
  LAYOUT_STAIRCASE,
  LAYOUT_DIAGONAL,
  LAYOUT_OPEN,
  LAYOUT_WIDE,
  LAYOUT_RIGHT,
  LAYOUT_LONG,
];

/** Human readable names for the built-in layouts. */
export const TEMPLATE_NAMES: readonly string[] = [
  'Staircase',
  'Diagonal',
  'Open Diagonal',
  'Wide',
  'Right Column',
  'Long Staircase',
];

/**
 * Check a layout for structural validity.
 * A layout is valid when it has 81 cells, uses only `#` and `.`, keeps row 0 and column 0 solid,
 * and gives every white cell a horizontal and a vertical run of at least two cells.
 */
export function validateLayout(layout: string): LayoutValidation {
  if (layout.length !== CELL_COUNT) {
    return { ok: false, reason: `Layout must have ${CELL_COUNT} cells, got ${layout.length}.` };
  }
  for (let i = 0; i < CELL_COUNT; i++) {
    const ch = layout[i];
    if (ch !== '#' && ch !== '.') {
      return { ok: false, reason: `Layout cell ${i} must be '#' or '.', got '${ch}'.` };
    }
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    if (layout[c] !== '#') return { ok: false, reason: `Row 1 must be solid blocks (cell ${c}).` };
  }
  for (let r = 0; r < GRID_SIZE; r++) {
    if (layout[r * GRID_SIZE] !== '#') {
      return { ok: false, reason: `Column 1 must be solid blocks (row ${r + 1}).` };
    }
  }
  for (let r = 0; r < GRID_SIZE; r++) {
    let c = 0;
    while (c < GRID_SIZE) {
      if (layout[r * GRID_SIZE + c] !== '.') {
        c++;
        continue;
      }
      const start = c;
      while (c < GRID_SIZE && layout[r * GRID_SIZE + c] === '.') c++;
      if (c - start < 2) {
        return { ok: false, reason: `Row ${r + 1} has a run of ${c - start} cell(s); runs need at least two.` };
      }
    }
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let r = 0;
    while (r < GRID_SIZE) {
      if (layout[r * GRID_SIZE + c] !== '.') {
        r++;
        continue;
      }
      const start = r;
      while (r < GRID_SIZE && layout[r * GRID_SIZE + c] === '.') r++;
      if (r - start < 2) {
        return { ok: false, reason: `Column ${c + 1} has a run of ${r - start} cell(s); runs need at least two.` };
      }
    }
  }
  return { ok: true, reason: null };
}

/** Collect statistics about a layout. */
export function layoutStats(layout: string): LayoutStats {
  const runLengths: Record<number, number> = {};
  let whiteCells = 0;
  let longestRun = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    let c = 0;
    while (c < GRID_SIZE) {
      if (layout[r * GRID_SIZE + c] !== '.') {
        c++;
        continue;
      }
      const start = c;
      while (c < GRID_SIZE && layout[r * GRID_SIZE + c] === '.') c++;
      const len = c - start;
      runLengths[len] = (runLengths[len] ?? 0) + 1;
      whiteCells += len;
      if (len > longestRun) longestRun = len;
    }
  }
  for (let c = 0; c < GRID_SIZE; c++) {
    let r = 0;
    while (r < GRID_SIZE) {
      if (layout[r * GRID_SIZE + c] !== '.') {
        r++;
        continue;
      }
      const start = r;
      while (r < GRID_SIZE && layout[r * GRID_SIZE + c] === '.') r++;
      const len = r - start;
      runLengths[len] = (runLengths[len] ?? 0) + 1;
      whiteCells += len;
      if (len > longestRun) longestRun = len;
    }
  }
  const rotated = rotate180(layout);
  return {
    whiteCells: whiteCells / 2,
    clueCells: CELL_COUNT - whiteCells / 2,
    runLengths,
    longestRun,
    symmetric: rotated === layout,
  };
}

/** Rotate a layout by 180 degrees. */
export function rotate180(layout: string): string {
  const rows: string[] = [];
  for (let r = GRID_SIZE - 1; r >= 0; r--) {
    let row = '';
    for (let c = GRID_SIZE - 1; c >= 0; c--) row += layout[r * GRID_SIZE + c];
    rows.push(row);
  }
  return rows.join('');
}
