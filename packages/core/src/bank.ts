/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Pre-seeded puzzle bank across all 5 difficulty levels and training lookup helpers.
 */
import { KakuroGenerator, hashSeed, type GeneratedKakuro } from './generator';

const BANK_CACHE = new Map<number, GeneratedKakuro[]>();

const SEEDS_PER_LEVEL: Record<number, number[]> = {
  1: [101, 107, 113, 127, 131, 139, 149, 157],
  2: [211, 223, 229, 233, 241, 251, 263, 271],
  3: [307, 313, 331, 347, 353, 367, 379, 389],
  4: [401, 419, 431, 443, 457, 463, 479, 491],
  5: [503, 521, 541, 557, 569, 577, 593, 601],
};

export function getBankForLevel(level: number): GeneratedKakuro[] {
  const lv = Math.min(5, Math.max(1, level));
  const cached = BANK_CACHE.get(lv);
  if (cached) return cached;

  const gen = new KakuroGenerator();
  const seeds = SEEDS_PER_LEVEL[lv] ?? SEEDS_PER_LEVEL[2];
  const list: GeneratedKakuro[] = seeds.map((s, idx) => {
    const item = gen.generate(lv, hashSeed(`kakuro-bank:v1:L${lv}:${s}`));
    return {
      ...item,
      level: lv,
      bankIndex: idx,
    };
  });
  BANK_CACHE.set(lv, list);
  return list;
}

export function pickFromBank(level: number, seen: readonly number[] = []): GeneratedKakuro {
  const list = getBankForLevel(level);
  const seenSet = new Set(seen);
  const unseen = list.find((p) => p.bankIndex !== undefined && !seenSet.has(p.bankIndex));
  return unseen ?? list[seen.length % list.length];
}
