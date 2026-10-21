import { describe, expect, it } from 'vitest';
import {
  ALL_DIGITS_MASK,
  KAKURO_TEMPLATES,
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
  feasibleDigits,
  formatKakuro,
  getPartitions,
  hasPerfectMatching,
  isMagicBlock,
  layoutStats,
  maskToDigits,
  parseKakuro,
  pickFromBank,
  sumBounds,
  validateLayout,
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
    expect(maskToDigits(res.unionMask)).toEqual([1, 2, 3, 4, 5]);
  });

  it('computes cell set sum bounds without duplicate digits', () => {
    const bounds = computeCellSetSumBounds([
      digitsToMask([1, 2, 3]),
      digitsToMask([1, 2, 3]),
    ]);
    expect(bounds).toEqual({ minSum: 3, maxSum: 5 });
  });
});

describe('Matching & Sum Bounds', () => {
  it('finds a perfect matching between digits and cells', () => {
    expect(hasPerfectMatching(digitsToMask([1, 2]), [digitsToMask([1, 2]), digitsToMask([1, 2])])).toBe(
      true,
    );
    // Digit 2 has nowhere to go, so no matching exists.
    expect(hasPerfectMatching(digitsToMask([1, 2]), [digitsToMask([1]), digitsToMask([1])])).toBe(
      false,
    );
  });

  it('reports the digits a cell may hold inside a partition', () => {
    // Digits {1,2} can only go into the cell that accepts 1.
    const feasible = feasibleDigits(digitsToMask([1, 2]), [digitsToMask([1]), digitsToMask([1, 2])]);
    expect(maskToDigits(feasible[0])).toEqual([1]);
    expect(maskToDigits(feasible[1])).toEqual([2]);
  });

  it('forces a cell when the other cell has no digit left', () => {
    // Cell A only accepts 2 out of {2,3}, so cell B has to take 3.
    const feasible = feasibleDigits(digitsToMask([2, 3]), [digitsToMask([1, 2]), digitsToMask([2, 3])]);
    expect(maskToDigits(feasible[0])).toEqual([2]);
    expect(maskToDigits(feasible[1])).toEqual([3]);
  });

  it('keeps every digit when both cells accept both digits', () => {
    const feasible = feasibleDigits(digitsToMask([1, 2]), [digitsToMask([1, 2]), digitsToMask([1, 2])]);
    expect(maskToDigits(feasible[0])).toEqual([1, 2]);
    expect(maskToDigits(feasible[1])).toEqual([1, 2]);
  });

  it('bounds the sum of a set of cells with distinct digits', () => {
    // Both cells accept {1,9} but the digits must differ, so the sum is always 10.
    expect(sumBounds([digitsToMask([1, 9]), digitsToMask([1, 9])])).toEqual({
      minSum: 10,
      maxSum: 10,
    });
    // Three cells over {1..9}: the smallest sum is 1+2+3, the largest 7+8+9.
    expect(sumBounds([ALL_DIGITS_MASK, ALL_DIGITS_MASK, ALL_DIGITS_MASK])).toEqual({
      minSum: 6,
      maxSum: 24,
    });
  });
});

describe('Layouts', () => {
  it('accepts every built-in layout', () => {
    for (const layout of KAKURO_TEMPLATES) {
      expect(validateLayout(layout).ok).toBe(true);
      const stats = layoutStats(layout);
      expect(stats.whiteCells).toBeGreaterThan(0);
      expect(stats.longestRun).toBeGreaterThanOrEqual(2);
    }
  });

  it('rejects a broken layout', () => {
    expect(validateLayout('#'.repeat(80)).ok).toBe(false);
    expect(validateLayout(`#${'.'.repeat(80)}`).ok).toBe(false);
  });
});

describe('Board Parsing, Encoding & Human Step Solver', () => {
  const sampleTemplate = [
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

  it('never places a wrong digit', () => {
    const { board } = parseKakuro(sampleTemplate);
    const solver = new KakuroSolver();
    const report = solver.solveLogical(board);
    // The template is the solution grid, so the digits of the grid are the truth.
    const truth = [...sampleTemplate].map((ch) => (ch === '#' ? 0 : Number(ch)));
    expect(report.solved).toBe(true);
    for (const step of report.steps) {
      for (const place of step.marks.place) {
        expect(truth[place.cell]).toBe(place.digit);
      }
    }
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
});

describe('Generator', () => {
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

  it('generates puzzles with a single solution and a human solution path', () => {
    const gen = new KakuroGenerator();
    const solver = new KakuroSolver();
    for (const level of [1, 2, 3, 4, 5]) {
      const g = gen.generate(level, 4242 + level);
      const { board } = parseKakuro(g.puzzle);
      const exact = solver.solveExact(board, 3);
      expect(exact.count).toBe(1);
      const report = solver.solveLogical(board);
      expect(report.solved).toBe(true);
      expect(report.level).toBeGreaterThanOrEqual(1);
      expect(report.level).toBeLessThanOrEqual(5);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = new KakuroGenerator().generate(3, 90210);
    const b = new KakuroGenerator().generate(3, 90210);
    expect(a.puzzle).toBe(b.puzzle);
    expect(a.level).toBe(b.level);
  });
});
