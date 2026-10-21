/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Bipartite assignment helpers.
 *
 * A Kakuro run constrains a set of cells: each cell holds one digit 1..9, the digits are distinct
 * inside the run and their sum equals the clue. That is exactly a bipartite matching problem
 * between the cells and the digits of a valid sum partition, so the useful questions are
 *
 *   - can the digits of a partition be assigned to the cells at all?          (perfect matching)
 *   - which digits can a given cell take in *some* assignment?               (feasible digits)
 *   - what is the smallest / largest sum the cells can reach?                (sum bounds)
 *
 * All three are answered here with polynomial algorithms (Kuhn's algorithm plus
 * alternating-cycle reachability, and a subset dynamic program), never by brute force.
 */
import { digitBit, hasDigit, maskToDigits, popcount } from './partitions';

/**
 * True when the digits of `mask` can be assigned one-to-one to `cellMasks`.
 * `cellMasks[i]` holds the digits cell `i` may still take.
 */
export function hasPerfectMatching(mask: number, cellMasks: readonly number[]): boolean {
  if (popcount(mask) !== cellMasks.length) return false;
  const owner = new Map<number, number>();
  const augment = (cell: number, seen: Set<number>): boolean => {
    for (const d of maskToDigits(cellMasks[cell] & mask)) {
      if (seen.has(d)) continue;
      seen.add(d);
      const prev = owner.get(d);
      if (prev === undefined || augment(prev, seen)) {
        owner.set(d, cell);
        return true;
      }
    }
    return false;
  };
  for (let i = 0; i < cellMasks.length; i++) {
    if (!augment(i, new Set())) return false;
  }
  return true;
}

/**
 * For every cell, the digits of `mask` that appear in at least one perfect matching.
 *
 * Uses the classical result that a non-matching edge of a bipartite graph belongs to some perfect
 * matching exactly when it lies on an alternating cycle. Contracting the matching turns that into
 * a reachability question on the digits, which is solved here with a Floyd-Warshall closure over
 * at most nine nodes.
 *
 * Returns an all-zero mask per cell when no perfect matching exists.
 */
export function feasibleDigits(mask: number, cellMasks: readonly number[]): number[] {
  const k = cellMasks.length;
  const out = new Array<number>(k).fill(0);
  if (k === 0 || popcount(mask) !== k) return out;

  const digits = maskToDigits(mask);
  const cellToDigit = new Array<number>(k).fill(0);
  const owner = new Map<number, number>();
  const augment = (cell: number, seen: Set<number>): boolean => {
    for (const d of digits) {
      if (!hasDigit(cellMasks[cell], d)) continue;
      if (seen.has(d)) continue;
      seen.add(d);
      const prev = owner.get(d);
      if (prev === undefined || augment(prev, seen)) {
        owner.set(d, cell);
        cellToDigit[cell] = d;
        return true;
      }
    }
    return false;
  };
  for (let i = 0; i < k; i++) {
    if (!augment(i, new Set())) return out; // no perfect matching at all
  }

  const digitToCell = new Map<number, number>();
  for (let i = 0; i < k; i++) digitToCell.set(cellToDigit[i], i);

  // Directed graph on digits: x -> y when the cell holding x may also take y (a non-matching edge).
  const reach = new Map<number, Set<number>>();
  for (const x of digits) {
    const cell = digitToCell.get(x)!;
    const set = new Set<number>();
    for (const y of digits) {
      if (y === cellToDigit[cell]) continue;
      if (!hasDigit(cellMasks[cell], y)) continue;
      set.add(y);
    }
    reach.set(x, set);
  }
  for (const mid of digits) {
    for (const a of digits) {
      if (!reach.get(a)!.has(mid)) continue;
      for (const b of digits) {
        if (reach.get(mid)!.has(b)) reach.get(a)!.add(b);
      }
    }
  }

  // Cell `i` may take digit `d` when the alternating cycle through that edge exists, that is
  // when `d` reaches the digit currently matched to `i`.
  for (const d of digits) {
    for (let i = 0; i < k; i++) {
      if (cellToDigit[i] === d) {
        out[i] |= digitBit(d);
        continue;
      }
      if (!hasDigit(cellMasks[i], d)) continue;
      if (reach.get(d)!.has(cellToDigit[i])) out[i] |= digitBit(d);
    }
  }
  return out;
}

/**
 * Exact smallest and largest sum reachable by assigning distinct digits to `cellMasks`.
 * Digits in `forbiddenMask` (already placed in the run) may not be used.
 *
 * Solved with a subset dynamic program over the digits: `dp[mask]` is the best sum for the first
 * `popcount(mask)` cells using exactly the digits in `mask`.
 */
export function sumBounds(
  cellMasks: readonly number[],
  forbiddenMask = 0,
): { minSum: number; maxSum: number } | null {
  const k = cellMasks.length;
  if (k === 0) return { minSum: 0, maxSum: 0 };
  const allowed = cellMasks.map((m) => m & ~forbiddenMask);
  const size = 1 << 10; // bit d holds digit d
  const minDp = new Array<number>(size).fill(Infinity);
  const maxDp = new Array<number>(size).fill(-Infinity);
  minDp[0] = 0;
  maxDp[0] = 0;
  for (let mask = 0; mask < size; mask++) {
    if (minDp[mask] === Infinity) continue;
    const cell = popcount(mask);
    if (cell >= k) continue;
    const options = maskToDigits(allowed[cell]);
    for (const d of options) {
      const bit = digitBit(d);
      if ((mask & bit) !== 0) continue;
      const next = mask | bit;
      const minVal = minDp[mask] + d;
      const maxVal = maxDp[mask] + d;
      if (minVal < minDp[next]) minDp[next] = minVal;
      if (maxVal > maxDp[next]) maxDp[next] = maxVal;
    }
  }
  let minSum = Infinity;
  let maxSum = -Infinity;
  for (let mask = 0; mask < size; mask++) {
    if (popcount(mask) !== k) continue;
    if (minDp[mask] < minSum) minSum = minDp[mask];
    if (maxDp[mask] > maxSum) maxSum = maxDp[mask];
  }
  if (minSum === Infinity) return null;
  return { minSum, maxSum };
}
