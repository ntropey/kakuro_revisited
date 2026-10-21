/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Run-level analysis: which digits may a run hold, and what do they sum to.
 */
import { ALL_DIGITS_MASK, getPartitions, maskToDigits, type Partition } from './partitions';
import { feasibleDigits, hasPerfectMatching, sumBounds } from './matching';

export interface RunAnalysis {
  /** Partitions of the residual sum that avoid the placed digits and fit the cells. */
  readonly validPartitions: Partition[];
  /** For every empty cell of the run, the digits it may hold in at least one valid assignment. */
  readonly feasibleCellMasks: number[];
  /** Digits that appear in every valid partition. */
  readonly mandatoryMask: number;
  /** Every digit that appears in at least one valid partition. */
  readonly unionMask: number;
}

/**
 * Check whether the digits in `partitionMask` (of popcount `k = cellMasks.length`) can be assigned
 * bijectively to the `k` cells with candidate bitmasks `cellMasks`.
 */
export function canAssignPartitionToCells(partitionMask: number, cellMasks: readonly number[]): boolean {
  return hasPerfectMatching(partitionMask, cellMasks);
}

/**
 * Given a run's residual target sum (`residualSum`), the candidate bitmasks of its `k` empty cells
 * (`cellMasks`), and the bitmask of digits already placed in the run (`placedMask`), compute:
 * - `validPartitions`: all partitions of `residualSum` in `k` cells that do not overlap `placedMask`
 *   and can be assigned to `cellMasks`
 * - `feasibleCellMasks`: for each of the `k` empty cells, the bitmask of digits that appear in at
 *   least one valid assignment
 * - `mandatoryMask`: bitmask of digits that appear in EVERY valid partition
 */
export function analyzeRunCombinations(
  residualSum: number,
  cellMasks: readonly number[],
  placedMask = 0,
): RunAnalysis {
  const k = cellMasks.length;
  const feasibleCellMasks = new Array<number>(k).fill(0);
  if (k === 0) {
    return { validPartitions: [], feasibleCellMasks, mandatoryMask: 0, unionMask: 0 };
  }
  const basePartitions = getPartitions(k, residualSum);
  const validPartitions: Partition[] = [];
  let mandatoryMask = ALL_DIGITS_MASK;
  let unionMask = 0;

  for (const p of basePartitions) {
    if ((p.mask & placedMask) !== 0) continue;
    const feasible = feasibleDigits(p.mask, cellMasks);
    let assigned = false;
    for (let i = 0; i < k; i++) {
      if (feasible[i] !== 0) {
        assigned = true;
        break;
      }
    }
    if (!assigned) continue;

    validPartitions.push(p);
    for (let i = 0; i < k; i++) feasibleCellMasks[i] |= feasible[i];
    mandatoryMask &= p.mask;
    unionMask |= p.mask;
  }

  if (validPartitions.length === 0) mandatoryMask = 0;
  return { validPartitions, feasibleCellMasks, mandatoryMask, unionMask };
}

/**
 * Compute minimum and maximum achievable sums using `k` distinct digits assigned to `cellMasks`
 * without using any digit in `forbiddenMask`.
 * Returns `{ minSum, maxSum }` or `null` if no valid assignment of `k` distinct digits exists.
 */
export function computeCellSetSumBounds(
  cellMasks: readonly number[],
  forbiddenMask = 0,
): { minSum: number; maxSum: number } | null {
  return sumBounds(cellMasks, forbiddenMask);
}

/**
 * Digits that may be removed from `cellMasks` because the run can no longer reach `residualSum`.
 * Returns the eliminated mask per cell.
 */
export function infeasibleCellMasks(
  residualSum: number,
  cellMasks: readonly number[],
  placedMask = 0,
): number[] {
  const k = cellMasks.length;
  const analysis = analyzeRunCombinations(residualSum, cellMasks, placedMask);
  if (analysis.validPartitions.length === 0) return cellMasks.map(() => 0);
  return cellMasks.map((m, i) => m & ~analysis.feasibleCellMasks[i]);
}

/** Digits of a run that are used by every valid partition. */
export function mandatoryRunDigits(residualSum: number, cellMasks: readonly number[], placedMask = 0): number[] {
  return maskToDigits(analyzeRunCombinations(residualSum, cellMasks, placedMask).mandatoryMask);
}
