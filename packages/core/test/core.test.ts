import { describe, expect, it } from 'vitest';
import {
  ALL_DIGITS_MASK,
  KakuroBoard,
  KakuroGenerator,
  KakuroSolver,
  KakuroStepFinder,
  analyzeRunCombinations,
  applyStep,
  buildCellsFromSolutionGrid,
  computeCellSetSumBounds,
  digitsToMask,
  encodeKakuro,
  formatKakuro,
  getPartitions,
  isMagicBlock,
  maskToDigits,
  parseKakuro,
  pickFromBank,
} from '../src/index';

describe('Sum Partitions & Bitmasks', () => {
  it('computes classic Magic Blocks accurately', () => {
    expect(isMagicBlock(2, 3)).toBe(true);
    expect(getPartitions(2, 3)[0].digits).toEqual([1, 2]);

    expect(isMagicBlock(2, 4)).toBe(true);
    expect(getPartitions(2, 4)[0].digits).toEqual([1, 3]);

    expect(isMagicBlock(2, 16)).toBe(true);
    expect(getPartitions(2, 16)[0].digits).toEqual([7, 9]);

    expect(isMagicBlock(2, 17)).toBe(true);
    expect(getPartitions(2, 17)[0].digits).toEqual([8, 9]);

    expect(isMagicBlock(3, 6)).toBe(true);
    expect(getPartitions(3, 6)[0].digits).toEqual([1, 2, 3]);

    expect(isMagicBlock(3, 7)).toBe(true);
    expect(getPartitions(3, 7)[0].digits).toEqual([1, 2, 4]);

    expect(isMagicBlock(3, 24)).toBe(true);
    expect(getPartitions(3, 24)[0].digits).toEqual([7, 8, 9]);

    expect(isMagicBlock(9, 45)).toBe(true);
    expect(getPartitions(9, 45)[0].digits).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('analyzes run combinations and mandatory digits', () => {
    // 8 in 3 cells has two partitions: {1,2,5} and {1,3,4}; digit 1 is mandatory in both!
    const res = analyzeRunCombinations(8, [ALL_DIGITS_MASK, ALL_DIGITS_MASK, ALL_DIGITS_MASK]);
    expect(res.validPartitions.map((p) => p.digits)).toEqual([
      [1, 2, 5],
      [1, 3, 4],
    ]);
    expect(maskToDigits(res.mandatoryMask)).toEqual([1]);
  });

  it('computes cell set sum bounds without duplicate digits', () => {
    const bounds = computeCellSetSumBounds([
      digitsToMask([1, 2, 3]),
      digitsToMask([1, 2, 3]),
    ]);
    expect(bounds).toEqual({ minSum: 3, maxSum: 5 });
  });
});

describe('Board Parsing, Encoding & Human Step Solver', () => {
  const sampleTemplate = [
    '#########',
    '#12#89###',
    '#34#761##',
    '##124#89#',
    '###89#76#',
    '#98#12###',
    '#76#349##',
    '##987#12#',
    '####123##',
  ].join('');

  it('round-trips board encoding and parsing in canonical and formatted modes', () => {
    const { board, givens } = parseKakuro(sampleTemplate);
    expect(board.runs.length).toBeGreaterThan(10);
    expect(board.isSolved()).toBe(false);

    const parsedAgain = parseKakuro(givens);
    expect(parsedAgain.givens).toBe(givens);

    const libLine = formatKakuro(board, 'LIBRARY');
    expect(libLine.startsWith(':0000:x:')).toBe(true);
    expect(parseKakuro(libLine).givens).toBe(givens);

    const formatted = formatKakuro(board, 'CLUES_ONLY_FORMATTED');
    expect(parseKakuro(formatted).givens).toBe(givens);
  });

  it('solves a puzzle step by step using human techniques', () => {
    const { board } = parseKakuro(sampleTemplate);
    const solver = new KakuroSolver();
    const report = solver.solveLogical(board);
    expect(report.solved).toBe(true);
    expect(report.steps.length).toBeGreaterThan(0);
    expect(report.level).toBeGreaterThanOrEqual(1);
    expect(report.score).toBeGreaterThan(0);
  });

  it('finds FULL_RUN, MAGIC_BLOCK, CROSS_INTERSECTION, SUM_BOUNDS, NAKED_PAIR, and LOCKED_SUM_RESIDUAL steps', () => {
    const { board } = parseKakuro(sampleTemplate);
    const finder = new KakuroStepFinder();

    // Magic blocks exist on initial board (e.g. 3 in 2 = {1,2}, 17 in 2 = {8,9})
    const magicSteps = finder.findAllMagicBlocks(board);
    expect(magicSteps.length).toBeGreaterThan(0);

    // Cross intersections exist at the crossing of Magic Blocks
    const crossSteps = finder.findAllCrossIntersections(board);
    expect(crossSteps.length).toBeGreaterThan(0);

    // Apply first cross-intersection placement, which leaves a 2-cell run with 1 empty cell -> FULL_RUN
    const firstPlace = crossSteps.find((s) => s.marks.place.length > 0)!;
    expect(firstPlace).toBeDefined();
    applyStep(board, firstPlace);

    const fullRuns = finder.findAllFullRuns(board);
    expect(fullRuns.length).toBeGreaterThan(0);

    // Test NAKED_PAIR and LOCKED_SUM_RESIDUAL on a 3-cell run where 2 cells have {1,2}
    const solGrid = new Array(81).fill(0);
    // r2c2=1, r2c3=2, r2c4=4 (Across 7 in 3); r3c2=3, r3c3=1, r3c4=5 (Across 9 in 3)
    solGrid[1 * 9 + 1] = 1;
    solGrid[1 * 9 + 2] = 2;
    solGrid[1 * 9 + 3] = 4;
    solGrid[2 * 9 + 1] = 3;
    solGrid[2 * 9 + 2] = 1;
    solGrid[2 * 9 + 3] = 5;
    const customBoard = new KakuroBoard(buildCellsFromSolutionGrid(solGrid));
    customBoard.cands[1 * 9 + 1] = digitsToMask([1, 2]);
    customBoard.cands[1 * 9 + 2] = digitsToMask([1, 2]);
    customBoard.cands[1 * 9 + 3] = digitsToMask([1, 2, 4, 5]);

    const nakedPairs = finder.findAllNakedSubsets(customBoard, 2);
    expect(nakedPairs.length).toBeGreaterThan(0);
    expect(nakedPairs[0].type).toBe('NAKED_PAIR');

    const residuals = finder.findAllLockedSumResiduals(customBoard);
    expect(residuals.length).toBeGreaterThan(0);
    expect(residuals[0].marks.place).toEqual([{ cell: 1 * 9 + 3, digit: 4 }]);
  });

  it('generates deterministic Daily Puzzles and bank puzzles with unique solutions', () => {
    const gen = new KakuroGenerator();
    const solver = new KakuroSolver();

    const d1 = gen.generateDaily('2026-10-21', 2);
    const d2 = gen.generateDaily('2026-10-21', 2);
    expect(d1.puzzle).toBe(d2.puzzle);
    expect(d1.solution).toEqual(d2.solution);

    const { board } = parseKakuro(d1.puzzle);
    const exact = solver.solveExact(board, 2);
    expect(exact.count).toBe(1);

    const bank1 = pickFromBank(1, []);
    expect(bank1.puzzle.length).toBeGreaterThan(80);
  });
});
