/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Human-step Kakuro solver, difficulty rater, and exact uniqueness solver.
 */
import { ALL_DIGITS_MASK, digitBit, getPartitionUnionMask, maskToDigits, popcount } from './partitions';
import { CELL_COUNT, KakuroBoard } from './board';
import { KakuroStepFinder, STEP_CONFIG_MAP, applyStep, type SolutionStep, type SolutionType } from './stepFinder';

export interface PathEntry {
  name: string;
  type: SolutionType;
  slug: string | null;
  count: number;
  score: number;
}

export interface SolveReport {
  solved: boolean;
  solution: number[];
  level: number;
  score: number;
  steps: SolutionStep[];
  path: PathEntry[];
}

export class KakuroSolver {
  private readonly finder = new KakuroStepFinder();

  /**
   * Solve `board` step-by-step using human logical deductions, returning the full step list,
   * difficulty level (1..5), score, and technique summary.
   */
  solveLogical(board: KakuroBoard): SolveReport {
    const work = board.clone();
    const steps: SolutionStep[] = [];
    let maxStepLevel = 1;
    let score = 0;

    for (let iter = 0; iter < 500 && !work.isSolved(); iter++) {
      const step = this.finder.findNextStep(work, 5);
      if (!step) break;
      steps.push(step);
      score += step.score;
      if (step.level > maxStepLevel) maxStepLevel = step.level;
      applyStep(work, step);
    }

    const solved = work.isSolved();
    let solution = work.values.slice();
    if (!solved) {
      const exact = this.solveExact(board, 1);
      if (exact.solutions.length > 0) {
        solution = exact.solutions[0];
        maxStepLevel = 5;
        score += 300;
      }
    }

    // Compute difficulty level (1..5) from hardest step level and cumulative score
    let level = maxStepLevel;
    if (level === 1 && score > 220) level = 2;
    else if (level === 2 && score > 480) level = 3;
    else if (level === 3 && score > 850) level = 4;

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
   * Fast exact backtracking solver with sum-partition bitmask pruning and MRV cell selection.
   * Finds up to `maxSolutions` (default 2, to verify uniqueness).
   */
  solveExact(board: KakuroBoard, maxSolutions = 2): { solutions: number[][]; count: number } {
    const values = board.values.slice();
    const whiteCells: number[] = [];
    for (let i = 0; i < CELL_COUNT; i++) {
      if (board.isWhite(i)) whiteCells.push(i);
    }

    // Track per-run state: emptyCount, residualSum, placedMask
    const numRuns = board.runs.length;
    const runEmpty = new Int32Array(numRuns);
    const runResidual = new Int32Array(numRuns);
    const runMask = new Int32Array(numRuns);

    for (let r = 0; r < numRuns; r++) {
      const run = board.runs[r];
      const st = board.runState(run);
      if (st.hasDuplicate) return { solutions: [], count: 0 };
      runEmpty[r] = st.emptyCells.length;
      runResidual[r] = st.residualSum;
      runMask[r] = st.placedMask;
      if (st.emptyCells.length === 0 && st.residualSum !== 0) {
        return { solutions: [], count: 0 };
      }
    }

    const solutions: number[][] = [];

    const allowedMaskForCell = (cell: number): number => {
      const hId = board.acrossRunOf[cell];
      const vId = board.downRunOf[cell];
      let mask = ALL_DIGITS_MASK;
      if (hId !== null) {
        const hEmpty = runEmpty[hId];
        const hRes = runResidual[hId];
        const hUsed = runMask[hId];
        const hUnion = getPartitionUnionMask(hEmpty, hRes);
        mask &= hUnion & ~hUsed;
      }
      if (vId !== null) {
        const vEmpty = runEmpty[vId];
        const vRes = runResidual[vId];
        const vUsed = runMask[vId];
        const vUnion = getPartitionUnionMask(vEmpty, vRes);
        mask &= vUnion & ~vUsed;
      }
      return mask;
    };

    const search = (): void => {
      if (solutions.length >= maxSolutions) return;

      // Pick the empty white cell with the fewest allowed candidates (MRV)
      let bestCell = -1;
      let bestMask = 0;
      let bestCount = 10;

      for (const c of whiteCells) {
        if (values[c] !== 0) continue;
        const m = allowedMaskForCell(c);
        const cnt = popcount(m);
        if (cnt === 0) return; // Dead end
        if (cnt < bestCount) {
          bestCount = cnt;
          bestCell = c;
          bestMask = m;
          if (cnt === 1) break;
        }
      }

      if (bestCell === -1) {
        // All white cells filled; verify all runs have residualSum === 0
        for (let r = 0; r < numRuns; r++) {
          if (runResidual[r] !== 0) return;
        }
        solutions.push(values.slice());
        return;
      }

      const hId = board.acrossRunOf[bestCell];
      const vId = board.downRunOf[bestCell];

      for (const d of maskToDigits(bestMask)) {
        const bit = digitBit(d);
        values[bestCell] = d;
        if (hId !== null) {
          runEmpty[hId]--;
          runResidual[hId] -= d;
          runMask[hId] |= bit;
        }
        if (vId !== null) {
          runEmpty[vId]--;
          runResidual[vId] -= d;
          runMask[vId] |= bit;
        }

        // Check immediate run validity
        let valid = true;
        if (hId !== null) {
          if (runEmpty[hId] === 0 ? runResidual[hId] !== 0 : getPartitionUnionMask(runEmpty[hId], runResidual[hId]) === 0) {
            valid = false;
          }
        }
        if (valid && vId !== null) {
          if (runEmpty[vId] === 0 ? runResidual[vId] !== 0 : getPartitionUnionMask(runEmpty[vId], runResidual[vId]) === 0) {
            valid = false;
          }
        }

        if (valid) search();

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
