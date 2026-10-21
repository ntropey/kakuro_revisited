/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The pure game state: values, pencil marks, selection and undo history.
 *
 * Nothing in here touches React, the DOM or the solver, so every rule can be unit tested.
 */
import { ALL_DIGITS_MASK, CELL_COUNT, GRID_SIZE, digitBit, maskToDigits } from '@kakuro/core';
import type { PathEntry, PuzzleInfo } from './protocol';

export interface GameSnapshot {
  values: number[];
  notes: number[];
  selected: number;
  hintsUsed: number;
  elapsedMs: number;
}

export interface GameState {
  /** Canonical puzzle string with the clue sums. */
  puzzle: string;
  /** The digits the player has entered, 81 entries, 0 for empty. */
  values: number[];
  /** The digits the solver still allows, one bitmask per cell (bit d = digit d). */
  cands: number[];
  /** The pencil marks the player has set, one bitmask per cell. */
  notes: number[];
  /** The unique solution, used to check mistakes and to share the result. */
  solution: number[];
  level: number;
  score: number;
  path: PathEntry[];
  daily?: string;
  layout?: string;
  /** The cell the player is working on, -1 when nothing is selected. */
  selected: number;
  /** True while the digit pad writes pencil marks instead of digits. */
  notesMode: boolean;
  hintsUsed: number;
  /** Milliseconds the player has been working on this puzzle. */
  elapsedMs: number;
  past: GameSnapshot[];
  future: GameSnapshot[];
}

export function createGame(info: PuzzleInfo): GameState {
  const values = new Array<number>(CELL_COUNT).fill(0);
  const cands = new Array<number>(CELL_COUNT).fill(ALL_DIGITS_MASK);
  const notes = new Array<number>(CELL_COUNT).fill(0);
  return {
    puzzle: info.puzzle,
    values,
    cands,
    notes,
    solution: info.solution.slice(),
    level: info.level,
    score: info.score,
    path: info.path ?? [],
    daily: info.daily,
    layout: info.layout,
    selected: -1,
    notesMode: false,
    hintsUsed: 0,
    elapsedMs: 0,
    past: [],
    future: [],
  };
}

/** A copy of the state, so React sees a new object and the solver can mutate it freely. */
export function cloneGame(state: GameState): GameState {
  return {
    ...state,
    values: state.values.slice(),
    cands: state.cands.slice(),
    notes: state.notes.slice(),
    solution: state.solution.slice(),
    past: state.past.slice(),
    future: state.future.slice(),
  };
}

/** The part of the state that undo and redo restore. */
function snapshot(state: GameState): GameSnapshot {
  return {
    values: state.values.slice(),
    notes: state.notes.slice(),
    selected: state.selected,
    hintsUsed: state.hintsUsed,
    elapsedMs: state.elapsedMs,
  };
}

/** Push the current state onto the undo stack and clear the redo stack. */
export function pushHistory(state: GameState): void {
  state.past.push(snapshot(state));
  if (state.past.length > 200) state.past.shift();
  state.future = [];
}

/** Undo the last move. */
export function undo(state: GameState): void {
  const prev = state.past.pop();
  if (!prev) return;
  state.future.push(snapshot(state));
  state.values = prev.values;
  state.notes = prev.notes;
  state.selected = prev.selected;
  state.hintsUsed = prev.hintsUsed;
  state.elapsedMs = prev.elapsedMs;
}

/** Redo the last undone move. */
export function redo(state: GameState): void {
  const next = state.future.pop();
  if (!next) return;
  state.past.push(snapshot(state));
  state.values = next.values;
  state.notes = next.notes;
  state.selected = next.selected;
  state.hintsUsed = next.hintsUsed;
  state.elapsedMs = next.elapsedMs;
}

/** Select a cell; selecting the same cell again clears the selection. */
export function selectCell(state: GameState, cell: number): void {
  state.selected = state.selected === cell ? -1 : cell;
}

/**
 * Write a digit into the selected cell.
 *
 * A cell that already holds the digit is cleared, so the digit pad doubles as an eraser. The
 * pencil marks of the cell are dropped, because they no longer describe the cell.
 */
export function placeDigit(state: GameState, digit: number): void {
  const cell = state.selected;
  if (cell < 0 || cell >= CELL_COUNT) return;
  pushHistory(state);
  if (state.values[cell] === digit) {
    state.values[cell] = 0;
  } else {
    state.values[cell] = digit;
    state.notes[cell] = 0;
  }
  state.selected = cell;
}

/** Clear the digit of the selected cell. */
export function eraseCell(state: GameState): void {
  const cell = state.selected;
  if (cell < 0 || cell >= CELL_COUNT || state.values[cell] === 0) return;
  pushHistory(state);
  state.values[cell] = 0;
}

/** Toggle a pencil mark in the selected cell. */
export function toggleNote(state: GameState, digit: number): void {
  const cell = state.selected;
  if (cell < 0 || cell >= CELL_COUNT || state.values[cell] !== 0) return;
  pushHistory(state);
  const bit = digitBit(digit);
  if ((state.notes[cell] & bit) !== 0) state.notes[cell] &= ~bit;
  else state.notes[cell] |= bit;
}

/** Turn the pencil marks on or off. */
export function setNotesMode(state: GameState, on: boolean): void {
  state.notesMode = on;
}

/** Remove every pencil mark. */
export function clearNotes(state: GameState): void {
  pushHistory(state);
  state.notes = new Array<number>(CELL_COUNT).fill(0);
}

/** Replace the pencil marks of one cell. */
export function setCellNotes(state: GameState, cell: number, mask: number): void {
  if (cell < 0 || cell >= CELL_COUNT) return;
  pushHistory(state);
  state.notes[cell] = mask;
}

/** True when every cell of the puzzle holds a digit. */
export function isSolved(state: GameState): boolean {
  for (let i = 0; i < CELL_COUNT; i++) {
    if (state.values[i] === 0 && state.solution[i] > 0) return false;
  }
  return true;
}

/** True when the digit in `cell` differs from the solution. */
export function cellIsWrong(state: GameState, cell: number): boolean {
  const v = state.values[cell];
  return v > 0 && state.solution[cell] > 0 && v !== state.solution[cell];
}

/** How many cells are filled. */
export function filledCount(state: GameState): number {
  let n = 0;
  for (let i = 0; i < CELL_COUNT; i++) if (state.values[i] > 0) n++;
  return n;
}

/** The pencil marks of a cell as a list of digits. */
export function noteDigits(state: GameState, cell: number): number[] {
  return maskToDigits(state.notes[cell]);
}

/** The candidates the solver allows in a cell as a list of digits. */
export function candidateDigits(state: GameState, cell: number): number[] {
  return maskToDigits(state.cands[cell]);
}

/** The least a board cell must say about itself for the helpers below. */
export interface CellKind {
  kind: 'block' | 'white';
}

/** The white cells that share an Across or Down run with `cell`, not counting `cell` itself. */
export function runPeers(cells: readonly CellKind[], cell: number): number[] {
  const out: number[] = [];
  const row = Math.floor(cell / GRID_SIZE);
  const col = cell % GRID_SIZE;
  for (let c = 0; c < GRID_SIZE; c++) {
    const idx = row * GRID_SIZE + c;
    if (idx !== cell && cells[idx]?.kind === 'white') out.push(idx);
  }
  for (let r = 0; r < GRID_SIZE; r++) {
    const idx = r * GRID_SIZE + col;
    if (idx !== cell && cells[idx]?.kind === 'white') out.push(idx);
  }
  return out;
}

/** A cell as `r2c3`, or `-` when nothing is selected. */
export function cellLabel(cell: number): string {
  if (cell < 0) return '-';
  return `r${Math.floor(cell / GRID_SIZE) + 1}c${(cell % GRID_SIZE) + 1}`;
}

/**
 * How many of each digit are still to be placed: the digit's count in the solution minus the
 * count on the board. It goes negative when the player has written a digit too often.
 */
export function remainingDigitCounts(state: GameState): Record<number, number> {
  const out: Record<number, number> = {};
  for (let i = 0; i < CELL_COUNT; i++) {
    const v = state.solution[i] ?? 0;
    if (v > 0) out[v] = (out[v] ?? 0) + 1;
  }
  for (let i = 0; i < CELL_COUNT; i++) {
    const v = state.values[i] ?? 0;
    if (v > 0) out[v] = (out[v] ?? 0) - 1;
  }
  return out;
}

/** The digits the selected cell cannot take because a run it sits in already holds them. */
export function blockedDigits(cells: readonly CellKind[], state: GameState): Set<number> {
  const out = new Set<number>();
  if (state.selected < 0 || cells[state.selected]?.kind !== 'white') return out;
  for (const other of runPeers(cells, state.selected)) {
    const v = state.values[other] ?? 0;
    if (v > 0) out.add(v);
  }
  return out;
}

/** The digits that can still go in the selected cell; empty when no white cell is selected. */
export function allowedDigits(cells: readonly CellKind[], state: GameState): number[] {
  if (state.selected < 0 || cells[state.selected]?.kind !== 'white') return [];
  const blocked = blockedDigits(cells, state);
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (!blocked.has(d)) out.push(d);
  return out;
}

/** The cells whose digit differs from the solution. */
export function wrongCells(state: GameState): Set<number> {
  const out = new Set<number>();
  for (let i = 0; i < CELL_COUNT; i++) if (cellIsWrong(state, i)) out.add(i);
  return out;
}

/** How many white cells hold a digit, and how many white cells there are. */
export function whiteProgress(cells: readonly CellKind[], state: GameState): { filled: number; total: number } {
  let total = 0;
  let filled = 0;
  for (let i = 0; i < CELL_COUNT; i++) {
    if (cells[i]?.kind !== 'white') continue;
    total++;
    if ((state.values[i] ?? 0) > 0) filled++;
  }
  return { filled, total };
}

/**
 * The white cell an arrow key moves the selection to, or -1 when there is none.
 *
 * Left and right step one cell, up and down step one row, and block cells are skipped. With
 * nothing selected the search starts at the first cell of the board.
 */
export function moveSelection(
  cells: readonly CellKind[],
  selected: number,
  key: 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown',
): number {
  const step = key === 'ArrowLeft' ? -1 : key === 'ArrowRight' ? 1 : key === 'ArrowUp' ? -GRID_SIZE : GRID_SIZE;
  let i = selected < 0 ? 0 : selected + step;
  while (i >= 0 && i < CELL_COUNT && cells[i]?.kind !== 'white') i += step;
  return i >= 0 && i < CELL_COUNT ? i : -1;
}
