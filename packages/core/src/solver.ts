/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Human-step Kakuro solver, difficulty rater, and exact uniqueness solver.
 */
import { ALL_DIGITS_MASK, digitBit, getPartitionUnionMask, getPartitions, maskToDigits, popcount } from './partitions';
import { CELL_COUNT, KakuroBoard, type StepMark } from './board';
import { analyzeRunCombinations } from './runs';
import { KakuroStepFinder, STEP_CONFIG_MAP, applyStep, type SolutionStep, type SolutionType } from './stepFinder';

export interface PathEntry {
  name: string;
  type: SolutionType;
  slug: string | null;
  count: number;
  score: number;
}

export interface SolveReport {
  /** True when human techniques alone solved the puzzle. */
  solved: boolean;
  /** Filled grid when solved (zeros elsewhere). */
  solution: number[];
  level: number;
  score: number;
  steps: SolutionStep[];
  path: PathEntry[];
}

export interface SolveOptions {
  /** Highest technique level to use (1..5). */
  maxLevel?: number;
  /** Technique types to skip. */
  disabled?: ReadonlySet<string>;
  /** Fall back to the exhaustive solver when human techniques stall. */
  fallbackToExact?: boolean;
}

export const DIFFICULTY_LABELS: readonly string[] = ['Trivial', 'Easy', 'Medium', 'Hard', 'Extreme'];

export function difficultyLabel(level: number): string {
  return DIFFICULTY_LABELS[Math.min(5, Math.max(1, level)) - 1] ?? 'Medium';
}

/**
 * The effort a puzzle took, as a level from 1 to 5.
 *
 * The score counts the points of every deduction, so it grows with the size of the grid and with
 * the price of the techniques used. Dividing by the number of empty cells keeps the rating
 * comparable between a small and a large puzzle.
 */
export function effortLevel(score: number, board: KakuroBoard): number {
  let cells = 0;
  for (let i = 0; i < CELL_COUNT; i++) if (board.isWhite(i)) cells++;
  if (cells === 0) return 1;
  const perCell = score / cells;
  if (perCell < 20) return 1;
  if (perCell < 40) return 2;
  if (perCell < 65) return 3;
  if (perCell < 90) return 4;
  return 5;
}

export class KakuroSolver {
  private readonly finder = new KakuroStepFinder();

  /**
   * The lowest technique level that can crack the puzzle.
   *
   * The step finder always prefers the easiest technique that applies, so the level of a single
   * solve says little about the difficulty. Solving again with a lower technique ceiling shows how
   * hard the puzzle really is: a puzzle that needs a Hidden Single in a run to finish is a Medium
   * even when most of its cells fall to Cross-Run Intersections.
   */
  minimumSolverLevel(board: KakuroBoard, options: SolveOptions = {}): number {
    const natural = this.runSolve(board, { ...options, maxLevel: 5 });
    if (!natural.solved) return 5;
    for (let level = 1; level < natural.maxStepLevel; level++) {
      const attempt = this.runSolve(board, { ...options, maxLevel: level });
      if (attempt.solved) return level;
    }
    return natural.maxStepLevel;
  }

  /** One run of the step finder, without any rating. */
  private runSolve(
    board: KakuroBoard,
    options: SolveOptions,
  ): { solved: boolean; solution: number[]; steps: SolutionStep[]; score: number; maxStepLevel: number } {
    const work = board.clone();
    const steps: SolutionStep[] = [];
    let maxStepLevel = 1;
    let score = 0;

    const maxLevel = options.maxLevel ?? 5;
    const disabled = options.disabled ?? new Set<string>();

    for (let iter = 0; iter < 600 && !work.isSolved(); iter++) {
      const step = this.finder.findNextStep(work, maxLevel, disabled);
      if (!step) break;
      steps.push(step);
      score += step.score;
      if (step.level > maxStepLevel) maxStepLevel = step.level;
      applyStep(work, step);
    }

    let solved = work.isSolved();
    let solution = solved ? work.values.slice() : new Array<number>(CELL_COUNT).fill(0);

    if (!solved && options.fallbackToExact) {
      const exact = this.solveExact(board, 1);
      if (exact.solutions.length > 0) {
        solution = exact.solutions[0];
        maxStepLevel = 5;
        score += 300;
      }
    }

    return { solved, solution, steps, score, maxStepLevel };
  }

  /**
   * Solve `board` step by step using human logical deductions, returning the full step list,
   * difficulty level (1..5), score, and technique summary.
   */
  solveLogical(board: KakuroBoard, options: SolveOptions = {}): SolveReport {
    const run = this.runSolve(board, options);
    const { solved, solution, steps, score } = run;

    // The difficulty is the lowest technique ceiling that still cracks the puzzle, raised by the
    // amount of work the puzzle took: a long grid that needs a dozen sum bounds is harder than a
    // small grid that falls to magic blocks, even when both only need the same techniques.
    const floor = options.maxLevel
      ? Math.min(run.maxStepLevel, options.maxLevel)
      : this.minimumSolverLevel(board, options);
    const level = Math.max(floor, effortLevel(score, board));

    const counts = new Map<SolutionType, number>();
    for (const s of steps) {
      counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
    }
    const path: PathEntry[] = [...counts.entries()]
      .map(([type, count]) => {
        const cfg = STEP_CONFIG_MAP.get(type)!;
        return {
          name: cfg.name,
          type,
          slug: cfg.slug,
          count,
          score: cfg.score,
        };
      })
      .sort((a, b) => b.score - a.score || b.count - a.count);

    return {
      solved,
      solution,
      level,
      score,
      steps,
      path,
    };
  }

  /**
   * Prove what happens when `digit` is placed in `cell`.
   *
   * The candidate is placed on a copy of the board and the human deductions are propagated. When
   * they run into a conflict (a run without a valid partition, a duplicate digit, a run that no
   * longer sums to its clue) the candidate is impossible and the forced placements that led there
   * are returned as the proof chain. When the propagation finds no conflict the exact solver has
   * the last word: a puzzle without any solution with the candidate is impossible as well.
   */
  proveCandidate(
    board: KakuroBoard,
    cell: number,
    digit: number,
  ): {
    cell: number;
    digit: number;
    valid: boolean;
    reason: string;
    chain: StepMark[];
    conflictCells: number[];
  } {
    const trace = this.finder.traceHypothesis(board, cell, digit);
    if (trace.conflict) {
      return {
        cell,
        digit,
        valid: false,
        reason: trace.reason,
        chain: trace.chain,
        conflictCells: trace.conflictCells,
      };
    }
    const work = board.clone();
    work.setCell(cell, digit);
    const exact = this.solveExact(work, 1);
    if (exact.count === 0) {
      return {
        cell,
        digit,
        valid: false,
        reason: 'the puzzle has no solution once this digit is placed',
        chain: trace.chain,
        conflictCells: [],
      };
    }
    return {
      cell,
      digit,
      valid: true,
      reason: 'the puzzle still has a solution with this digit',
      chain: trace.chain,
      conflictCells: [],
    };
  }

  /**
   * Exact solver with sum-partition pruning and MRV cell selection.
   * Finds up to `maxSolutions` (default 2, to verify uniqueness).
   *
   * The solver ignores the solver's own candidate notes: only the placed digits are treated as
   * givens, so the result reflects the puzzle itself and not the player's marks.
   */
  solveExact(board: KakuroBoard, maxSolutions = 2): { solutions: number[][]; count: number } {
    const values = board.values.slice();
    const cands = new Array<number>(CELL_COUNT).fill(0);
    const whiteCells: number[] = [];

    for (let i = 0; i < CELL_COUNT; i++) {
      if (!board.isWhite(i)) continue;
      whiteCells.push(i);
      cands[i] = ALL_DIGITS_MASK;
    }
    for (const i of whiteCells) {
      const v = values[i];
      if (v < 1 || v > 9) continue;
      cands[i] = 0;
      const bit = digitBit(v);
      for (const peer of board.peersOf[i]) cands[peer] &= ~bit;
    }

    const numRuns = board.runs.length;
    const runEmpty = new Int32Array(numRuns);
    const runResidual = new Int32Array(numRuns);
    const runMask = new Int32Array(numRuns);

    for (let r = 0; r < numRuns; r++) {
      const st = board.runState(board.runs[r]);
      if (st.hasDuplicate) return { solutions: [], count: 0 };
      runEmpty[r] = st.emptyCells.length;
      runResidual[r] = st.residualSum;
      runMask[r] = st.placedMask;
      if (st.emptyCells.length === 0 && st.residualSum !== 0) return { solutions: [], count: 0 };
      if (!runHasPartition(st.emptyCells.length, st.residualSum, st.placedMask)) {
        return { solutions: [], count: 0 };
      }
    }

    const solutions: number[][] = [];

    /** Digits a cell may still take, using the cheap partition-union pruning. */
    const cheapMask = (cell: number): number => {
      let mask = cands[cell];
      const hId = board.acrossRunOf[cell];
      const vId = board.downRunOf[cell];
      if (hId !== null) {
        mask &= getPartitionUnionMask(runEmpty[hId], runResidual[hId]) & ~runMask[hId];
      }
      if (vId !== null) {
        mask &= getPartitionUnionMask(runEmpty[vId], runResidual[vId]) & ~runMask[vId];
      }
      return mask;
    };

    /** Digits a cell may still take, using exact per-cell feasibility inside both runs. */
    const strongMask = (cell: number): number => {
      let mask = cands[cell];
      for (const r of [board.acrossRunOf[cell], board.downRunOf[cell]]) {
        if (r === null) continue;
        const run = board.runs[r];
        const emptyCells: number[] = [];
        let placedSum = 0;
        let placedMask = 0;
        for (const c of run.cells) {
          const v = values[c];
          if (v === 0) emptyCells.push(c);
          else {
            placedSum += v;
            placedMask |= digitBit(v);
          }
        }
        const idx = emptyCells.indexOf(cell);
        if (idx < 0) return 0;
        const analysis = analyzeRunCombinations(
          run.sum - placedSum,
          emptyCells.map((c) => cands[c]),
          placedMask,
        );
        if (analysis.validPartitions.length === 0) return 0;
        mask &= analysis.feasibleCellMasks[idx];
      }
      return mask;
    };

    const search = (): void => {
      if (solutions.length >= maxSolutions) return;

      let bestCell = -1;
      let bestMask = 0;
      let bestCount = 10;

      for (const c of whiteCells) {
        if (values[c] !== 0) continue;
        const m = cheapMask(c);
        const cnt = popcount(m);
        if (cnt === 0) return; // dead end
        if (cnt < bestCount) {
          bestCount = cnt;
          bestCell = c;
          bestMask = m;
          if (cnt === 1) break;
        }
      }

      if (bestCell === -1) {
        for (let r = 0; r < numRuns; r++) {
          if (runEmpty[r] !== 0 || runResidual[r] !== 0) return;
        }
        solutions.push(values.slice());
        return;
      }

      const mask = bestCount > 1 ? strongMask(bestCell) & bestMask : bestMask;
      if (mask === 0) return;

      const hId = board.acrossRunOf[bestCell];
      const vId = board.downRunOf[bestCell];
      const peers = board.peersOf[bestCell];
      const savedPeerMasks = peers.map((p) => cands[p]);
      const savedCellMask = cands[bestCell];

      for (const d of maskToDigits(mask)) {
        const bit = digitBit(d);
        values[bestCell] = d;
        cands[bestCell] = 0;
        let valid = true;
        for (const peer of peers) cands[peer] &= ~bit;

        if (hId !== null) {
          if (runMask[hId] & bit) valid = false;
          runEmpty[hId]--;
          runResidual[hId] -= d;
          runMask[hId] |= bit;
        }
        if (vId !== null) {
          if (runMask[vId] & bit) valid = false;
          runEmpty[vId]--;
          runResidual[vId] -= d;
          runMask[vId] |= bit;
        }

        if (valid) {
          for (const r of [hId, vId]) {
            if (r === null) continue;
            if (runEmpty[r] === 0) {
              if (runResidual[r] !== 0) valid = false;
            } else if (!runHasPartition(runEmpty[r], runResidual[r], runMask[r])) {
              valid = false;
            }
          }
        }

        if (valid) search();

        peers.forEach((peer, i) => {
          cands[peer] = savedPeerMasks[i];
        });
        cands[bestCell] = savedCellMask;
        if (hId !== null) {
          runEmpty[hId]++;
          runResidual[hId] += d;
          runMask[hId] &= ~bit;
        }
        if (vId !== null) {
          runEmpty[vId]++;
          runResidual[vId] += d;
          runMask[vId] &= ~bit;
        }
        values[bestCell] = 0;

        if (solutions.length >= maxSolutions) return;
      }
    };

    search();
    return { solutions, count: solutions.length };
  }
}

/** True when some partition of `sum` into `length` distinct digits avoids the used digits. */
function runHasPartition(length: number, sum: number, usedMask: number): boolean {
  if (length <= 0) return sum === 0;
  for (const p of getPartitions(length, sum)) {
    if ((p.mask & usedMask) === 0) return true;
  }
  return false;
}
