import { describe, expect, it } from 'vitest';
import { CELL_COUNT, parseKakuro } from '@kakuro/core';
import {
  cellIsWrong,
  clearNotes,
  cloneGame,
  createGame,
  eraseCell,
  filledCount,
  isSolved,
  placeDigit,
  redo,
  selectCell,
  toggleNote,
  undo,
} from '../src/game';
import type { PuzzleInfo } from '../src/protocol';

const SOLUTION_GRID = [
  '#########',
  '#91######',
  '#83######',
  '##98###19',
  '##21###27',
  '###98#19#',
  '###29#27#',
  '####379##',
  '####138##',
].join('');

function samplePuzzle(): PuzzleInfo {
  const { givens } = parseKakuro(SOLUTION_GRID);
  return {
    puzzle: givens,
    solution: [...SOLUTION_GRID].map((ch) => (ch === '#' ? 0 : Number(ch))),
    level: 2,
    score: 520,
    path: [],
  };
}

function sampleGame() {
  return createGame(samplePuzzle());
}

/** The first empty white cell of the board. */
function firstWhite(game: ReturnType<typeof sampleGame>): number {
  for (let i = 0; i < CELL_COUNT; i++) if (game.solution[i] > 0) return i;
  return -1;
}

describe('Game state', () => {
  it('starts empty and unsolved', () => {
    const game = sampleGame();
    expect(game.values).toHaveLength(CELL_COUNT);
    expect(game.values.every((v) => v === 0)).toBe(true);
    expect(filledCount(game)).toBe(0);
    expect(isSolved(game)).toBe(false);
  });

  it('writes a digit into the selected cell', () => {
    const game = sampleGame();
    const cell = firstWhite(game);
    selectCell(game, cell);
    placeDigit(game, 4);
    expect(game.values[cell]).toBe(4);
    expect(filledCount(game)).toBe(1);
  });

  it('clears the cell when the same digit is written twice', () => {
    const game = sampleGame();
    const cell = firstWhite(game);
    selectCell(game, cell);
    placeDigit(game, 4);
    placeDigit(game, 4);
    expect(game.values[cell]).toBe(0);
  });

  it('erases the selected cell', () => {
    const game = sampleGame();
    const cell = firstWhite(game);
    selectCell(game, cell);
    placeDigit(game, 5);
    eraseCell(game);
    expect(game.values[cell]).toBe(0);
  });

  it('toggles pencil marks and clears them when a digit is written', () => {
    const game = sampleGame();
    const cell = firstWhite(game);
    selectCell(game, cell);
    toggleNote(game, 3);
    toggleNote(game, 7);
    expect(game.notes[cell]).toBe((1 << 3) | (1 << 7));
    toggleNote(game, 7);
    expect(game.notes[cell]).toBe(1 << 3);
    placeDigit(game, 9);
    expect(game.notes[cell]).toBe(0);
  });

  it('clears every pencil mark', () => {
    const game = sampleGame();
    const cell = firstWhite(game);
    selectCell(game, cell);
    toggleNote(game, 1);
    clearNotes(game);
    expect(game.notes.every((n) => n === 0)).toBe(true);
  });

  it('undoes and redoes a move', () => {
    const game = sampleGame();
    const cell = firstWhite(game);
    selectCell(game, cell);
    placeDigit(game, 6);
    expect(game.values[cell]).toBe(6);
    undo(game);
    expect(game.values[cell]).toBe(0);
    redo(game);
    expect(game.values[cell]).toBe(6);
  });

  it('reports a wrong digit against the solution', () => {
    const game = sampleGame();
    const cell = firstWhite(game);
    selectCell(game, cell);
    const truth = game.solution[cell];
    placeDigit(game, truth === 1 ? 2 : 1);
    expect(cellIsWrong(game, cell)).toBe(true);
    placeDigit(game, truth);
    expect(cellIsWrong(game, cell)).toBe(false);
  });

  it('is solved only when every white cell holds a digit', () => {
    const game = sampleGame();
    for (let i = 0; i < CELL_COUNT; i++) {
      if (game.solution[i] === 0) continue;
      game.selected = i;
      placeDigit(game, game.solution[i]);
    }
    expect(filledCount(game)).toBeGreaterThan(0);
    expect(isSolved(game)).toBe(true);
  });

  it('copies the state, so a move on the copy leaves the original alone', () => {
    const game = sampleGame();
    const cell = firstWhite(game);
    selectCell(game, cell);
    const copy = cloneGame(game);
    placeDigit(copy, 7);
    expect(copy.values[cell]).toBe(7);
    expect(game.values[cell]).toBe(0);
    expect(game.past).toHaveLength(0);
    expect(copy.past).toHaveLength(1);
  });
});
