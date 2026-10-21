/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Sum partition tables and bitmask utilities for Kakuro (Cross Sums).
 * Digits 1..9 are represented as bitmasks where bit d (1 << d) corresponds to digit d.
 */

export const ALL_DIGITS_MASK = 0b1111111110; // bits 1..9 (1022)

export interface Partition {
  /** Sorted digits in the partition, e.g. [1, 3] */
  readonly digits: readonly number[];
  /** Bitmask with bit d (1 << d) set for each digit d in digits */
  readonly mask: number;
  /** Number of cells (digits.length) */
  readonly length: number;
  /** Target sum of the digits */
  readonly sum: number;
}

export function digitBit(d: number): number {
  return 1 << d;
}

export function hasDigit(mask: number, d: number): boolean {
  return (mask & (1 << d)) !== 0;
}

export function popcount(mask: number): number {
  let m = mask & ALL_DIGITS_MASK;
  let count = 0;
  while (m !== 0) {
    m &= m - 1;
    count++;
  }
  return count;
}

export function maskSum(mask: number): number {
  let sum = 0;
  for (let d = 1; d <= 9; d++) {
    if ((mask & (1 << d)) !== 0) sum += d;
  }
  return sum;
}

export function maskToDigits(mask: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) {
    if ((mask & (1 << d)) !== 0) out.push(d);
  }
  return out;
}

export function digitsToMask(digits: readonly number[]): number {
  let mask = 0;
  for (const d of digits) {
    if (d >= 1 && d <= 9) mask |= 1 << d;
  }
  return mask;
}

export function formatPartition(digits: readonly number[]): string {
  return `{${digits.join(',')}}`;
}

/** Minimum possible sum of `length` distinct digits from 1..9 */
export function minSumForLength(length: number): number {
  if (length <= 0 || length > 9) return 0;
  return (length * (length + 1)) / 2;
}

/** Maximum possible sum of `length` distinct digits from 1..9 */
export function maxSumForLength(length: number): number {
  if (length <= 0 || length > 9) return 0;
  return (length * (19 - length)) / 2;
}

// Precompute all 511 non-empty subsets of {1..9} grouped by [length][sum]
const PARTITIONS_TABLE: Partition[][][] = Array.from({ length: 10 }, () =>
  Array.from({ length: 46 }, () => []),
);

const UNION_MASKS: number[][] = Array.from({ length: 10 }, () => new Array(46).fill(0));
const INTERSECTION_MASKS: number[][] = Array.from({ length: 10 }, () => new Array(46).fill(0));

(function initPartitions() {
  for (let sub = 1; sub < 512; sub++) {
    const mask = sub << 1;
    const digits = maskToDigits(mask);
    const length = digits.length;
    const sum = maskSum(mask);
    PARTITIONS_TABLE[length][sum].push({
      digits,
      mask,
      length,
      sum,
    });
  }
  // Sort partitions lexicographically by their digits for deterministic ordering
  for (let len = 1; len <= 9; len++) {
    for (let s = 1; s <= 45; s++) {
      const list = PARTITIONS_TABLE[len][s];
      list.sort((a, b) => {
        for (let i = 0; i < len; i++) {
          if (a.digits[i] !== b.digits[i]) return a.digits[i] - b.digits[i];
        }
        return 0;
      });
      if (list.length > 0) {
        let u = 0;
        let inter = ALL_DIGITS_MASK;
        for (const p of list) {
          u |= p.mask;
          inter &= p.mask;
        }
        UNION_MASKS[len][s] = u;
        INTERSECTION_MASKS[len][s] = inter;
      }
    }
  }
})();

/** Return all valid distinct-digit partitions of `sum` using `length` cells. */
export function getPartitions(length: number, sum: number): readonly Partition[] {
  if (length < 1 || length > 9 || sum < 1 || sum > 45) return [];
  return PARTITIONS_TABLE[length][sum];
}

/** Bitmask of all digits that appear in at least one valid partition of `(length, sum)`. */
export function getPartitionUnionMask(length: number, sum: number): number {
  if (length < 1 || length > 9 || sum < 1 || sum > 45) return 0;
  return UNION_MASKS[length][sum];
}

/** Bitmask of digits that appear in EVERY valid partition of `(length, sum)`. */
export function getPartitionIntersectionMask(length: number, sum: number): number {
  if (length < 1 || length > 9 || sum < 1 || sum > 45) return 0;
  return INTERSECTION_MASKS[length][sum];
}

/**
 * True when `(length, sum)` has a unique partition (a "Magic Block", e.g. 4 in 2 = {1,3}, 16 in 2 = {7,9}).
 */
export function isMagicBlock(length: number, sum: number): boolean {
  return length >= 2 && getPartitions(length, sum).length === 1;
}
