/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The worker API must stay sound: a candidate mask from the UI can never hide a digit the board
 * still allows.
 */
import { describe, expect, it } from 'vitest';
import { CELL_COUNT, ALL_DIGITS_MASK, parseKakuro } from '@kakuro/core';
import { buildBoard, candidates, hint } from '../src/solverApi';

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

const { givens } = parseKakuro(SOLUTION_GRID);
const solution = [...SOLUTION_GRID].map((ch) => (ch === '#' ? 0 : Number(ch)));

/** Every cell but r2c2 filled in. */
function almostDone(): number[] {
  const values = solution.slice();
  values[10] = 0;
  return values;
}

describe('Solver worker API', () => {
  it('builds the candidate masks from the values alone', () => {
    const values = almostDone();
    const board = buildBoard(givens, values);
    expect(board.cands[10] & (1 << 9)).toBe(1 << 9);
    // r2c3 already holds 1, so 1 cannot sit next to it in the same run.
    expect(board.cands[10] & (1 << 1)).toBe(0);
  });

  it('keeps the true digit in the candidate list of a nearly finished board', () => {
    const cands = candidates(givens, almostDone());
    expect(cands[10] & (1 << 9)).toBe(1 << 9);
  });

  it('gives the same first hint whatever candidate masks the caller sends', () => {
    const values = new Array<number>(CELL_COUNT).fill(0);
    const a = hint(givens, values, new Array<number>(CELL_COUNT).fill(0), 1);
    const b = hint(givens, values, new Array<number>(CELL_COUNT).fill(ALL_DIGITS_MASK), 1);
    expect(a?.name).toBe(b?.name);
    expect(a?.marks).toEqual(b?.marks);
  });

  it('only ever places digits the solution agrees with', () => {
    const values = new Array<number>(CELL_COUNT).fill(0);
    let steps = 0;
    while (steps < 200) {
      const step = hint(givens, values, new Array<number>(CELL_COUNT).fill(ALL_DIGITS_MASK), 5);
      if (!step) break;
      for (const place of step.marks?.place ?? []) {
        expect(place.digit).toBe(solution[place.cell]);
        values[place.cell] = place.digit;
      }
      for (const elim of step.marks?.elim ?? []) {
        expect(elim.digit).not.toBe(solution[elim.cell]);
      }
      steps++;
      if ((step.marks?.place ?? []).length === 0) break;
    }
    expect(steps).toBeGreaterThan(0);
  });
});
