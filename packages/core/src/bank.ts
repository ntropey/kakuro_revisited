/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Pre-seeded puzzle bank across all 5 difficulty levels and training lookup helpers.
 *
 * The bank is generated on demand: a puzzle is created the first time it is asked for and then
 * cached, so opening the app costs nothing until the player picks a level.
 */
import { KakuroGenerator, hashSeed, type GeneratedKakuro } from './generator';

const BANK_CACHE = new Map<string, GeneratedKakuro>();

const SEEDS_PER_LEVEL: Record<number, number[]> = {
  1: [101, 107, 113, 127, 131, 139, 149, 157],
  2: [211, 223, 229, 233, 241, 251, 263, 271],
  3: [307, 313, 331, 347, 353, 367, 379, 389],
  4: [401, 419, 431, 443, 457, 463, 479, 491],
  5: [503, 521, 541, 557, 569, 577, 593, 601],
};

function clampLevel(level: number): number {
  return Math.min(5, Math.max(1, Math.round(level)));
}

/** The number of bank puzzles stored for a level. */
export function bankSize(level: number): number {
  return (SEEDS_PER_LEVEL[clampLevel(level)] ?? SEEDS_PER_LEVEL[2]).length;
}

/**
 * The bank puzzle at `index` for `level`. The puzzle is generated on first use and cached.
 */
export function bankPuzzle(level: number, index: number): GeneratedKakuro {
  const lv = clampLevel(level);
  const seeds = SEEDS_PER_LEVEL[lv] ?? SEEDS_PER_LEVEL[2];
  const idx = ((index % seeds.length) + seeds.length) % seeds.length;
  const key = `${lv}:${idx}`;
  const cached = BANK_CACHE.get(key);
  if (cached) return cached;

  const gen = new KakuroGenerator();
  const item = gen.generate(lv, hashSeed(`kakuro-bank:v1:L${lv}:${seeds[idx]}`));
  const entry: GeneratedKakuro = { ...item, level: lv, bankIndex: idx };
  BANK_CACHE.set(key, entry);
  return entry;
}

/** Every bank puzzle of a level, generated on demand. */
export function getBankForLevel(level: number): GeneratedKakuro[] {
  const lv = clampLevel(level);
  return Array.from({ length: bankSize(lv) }, (_, idx) => bankPuzzle(lv, idx));
}

/**
 * Pick a bank puzzle for `level` that the player has not seen yet.
 * `seen` holds the bank indexes already played; when all of them are used the round restarts.
 */
export function pickFromBank(level: number, seen: readonly number[] = []): GeneratedKakuro {
  const lv = clampLevel(level);
  const count = bankSize(lv);
  const seenSet = new Set(seen);
  for (let i = 0; i < count; i++) {
    const idx = (i + seen.length) % count;
    if (!seenSet.has(idx)) return bankPuzzle(lv, idx);
  }
  return bankPuzzle(lv, seen.length % count);
}
