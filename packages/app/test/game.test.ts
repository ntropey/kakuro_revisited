import { describe, expect, it } from 'vitest';
import { CELL_COUNT, parseKakuro } from '@kakuro/core';
import {
  allowedDigits,
  blockedDigits,
  cellIsWrong,
  cellLabel,
  clearNotes,
  cloneGame,
  createGame,
  eraseCell,
  filledCount,
  isSolved,
  moveSelection,
  placeDigit,
  redo,
  remainingDigitCounts,
  runPeers,
  selectCell,
  toggleNote,
  undo,
  whiteProgress,
  wrongCells,
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

describe('Board helpers', () => {
  const cells = parseKakuro(SOLUTION_GRID).board.cells;

  it('finds the white cells that share a run', () => {
    expect(runPeers(cells, 10)).toEqual([11, 19]);
    // a cell never lists itself or a block
    expect(runPeers(cells, 69)).toEqual([67, 68, 51, 60, 78]);
  });

  it('names cells the way the panels do', () => {
    expect(cellLabel(10)).toBe('r2c2');
    expect(cellLabel(80)).toBe('r9c9');
    expect(cellLabel(-1)).toBe('-');
  });

  it('counts the digits still to be placed, and goes negative on a surplus', () => {
    const game = createGame(samplePuzzle());
    const fresh = remainingDigitCounts(game);
    expect(Object.values(fresh).reduce((a, b) => a + b, 0)).toBe(whiteProgress(cells, game).total);
    selectCell(game, 10);
    placeDigit(game, 9);
    expect(remainingDigitCounts(game)[9]).toBe(fresh[9] - 1);
    // the same digit in more cells than the solution has overshoots
    const whites = cells.map((c, i) => (c.kind === 'white' ? i : -1)).filter((i) => i >= 0);
    for (let i = 1; i <= fresh[9]; i++) {
      selectCell(game, whites[i]);
      placeDigit(game, 9);
    }
    expect(remainingDigitCounts(game)[9]).toBeLessThan(0);
  });

  it('blocks the digits a run already holds and allows the rest', () => {
    const game = createGame(samplePuzzle());
    expect(blockedDigits(cells, game).size).toBe(0);
    expect(allowedDigits(cells, game)).toEqual([]);
    game.values[11] = 9;
    selectCell(game, 10);
    expect([...blockedDigits(cells, game)]).toEqual([9]);
    expect(allowedDigits(cells, game)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    // a block cell has nothing to allow
    game.selected = 0;
    expect(allowedDigits(cells, game)).toEqual([]);
  });

  it('lists the wrong cells and the progress', () => {
    const game = createGame(samplePuzzle());
    selectCell(game, 10);
    placeDigit(game, 1);
    expect([...wrongCells(game)]).toEqual([10]);
    expect(whiteProgress(cells, game)).toEqual({ filled: 1, total: 26 });
  });

  it('moves the selection over white cells only', () => {
    expect(moveSelection(cells, 10, 'ArrowRight')).toBe(11);
    expect(moveSelection(cells, 10, 'ArrowDown')).toBe(19);
    // block cells are skipped, and the step carries on into the next row
    expect(moveSelection(cells, 11, 'ArrowRight')).toBe(19);
    // nothing above or to the left
    expect(moveSelection(cells, 10, 'ArrowUp')).toBe(-1);
    expect(moveSelection(cells, 10, 'ArrowLeft')).toBe(-1);
    // with nothing selected the search starts at the top left
    expect(moveSelection(cells, -1, 'ArrowRight')).toBe(10);
    expect(moveSelection(cells, -1, 'ArrowLeft')).toBe(-1);
  });
});
