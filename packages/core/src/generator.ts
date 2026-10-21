/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Deterministic Kakuro puzzle generator and date-seeded Daily Puzzle builder.
 */
import { ALL_DIGITS_MASK, digitBit, maskToDigits } from './partitions';
import {
  CELL_COUNT,
  GRID_SIZE,
  KakuroBoard,
  buildCellsFromSolutionGrid,
  encodeGivens,
} from './board';
import { KakuroSolver, type PathEntry } from './solver';

export interface GeneratedKakuro {
  puzzle: string;
  solution: number[];
  level: number;
  score: number;
  path: PathEntry[];
  daily?: string;
  bankIndex?: number;
}

/** Deterministic 32-bit PRNG (Mulberry32). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a string (such as a YYYY-MM-DD date) into a 32-bit seed. */
export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * Symmetric 9x9 Kakuro layout masks (`#` = block/clue cell, `.` = white cell).
 * Row 0 and Column 0 are always `#` (clue headers). Every white cell belongs to both
 * a horizontal run of length >= 2 and a vertical run of length >= 2.
 */
export const KAKURO_TEMPLATES: readonly string[] = [
  // Template 0: Compact 2- and 3-cell runs (great for Easy / Medium)
  [
    '#########',
    '#..#..###',
    '#..#...##',
    '##...#..#',
    '###..#..#',
    '#..#..###',
    '#..#...##',
    '##...#..#',
    '####..#.#'.replace('#.#', '..#'),
  ].join(''),
  // Template 1: Classic 8x8 cross-sums with 2-, 3-, and 4-cell runs
  [
    '#########',
    '#..#...##',
    '#...#...#',
    '##..#...#',
    '#...##..#',
    '#..##...#',
    '#...#..##',
    '#...#...#',
    '##...#..#',
  ].join(''),
  // Template 2: Diamond / pinwheel 9x9 layout
  [
    '#########',
    '##..#..##',
    '#....#..#',
    '#...#...#',
    '##..#..##',
    '#..#....#',
    '#...#...#',
    '##..#..##',
    '#########',
  ].join(''),
  // Template 3: Open center with 3-, 4-, and 5-cell runs (Medium / Hard / Unfair)
  [
    '#########',
    '#...#..##',
    '#....#..#',
    '#..#....#',
    '##...#..#',
    '#..#...##',
    '#....#..#',
    '#..#....#',
    '##..#...#',
  ].join(''),
  // Template 4: Longer intersecting runs (Hard / Unfair / Extreme)
  [
    '#########',
    '#....#..#',
    '#....#..#',
    '##...#..#',
    '#...#...#',
    '#..#...##',
    '#..#....#',
    '#..#....#',
    '#########',
  ].join(''),
  // Template 5: Dense cross-grid with 2..5 length runs
  [
    '#########',
    '#..#....#',
    '#...#...#',
    '#....#..#',
    '##..#..##',
    '#..#....#',
    '#...#...#',
    '#....#..#',
    '#########',
  ].join(''),
];

/**
 * Fill a 9x9 template (`#` and `.`) with digits `1..9` so that no horizontal or vertical run
 * contains duplicate digits, biased by `level` (preferring extreme digits 1,2,8,9 for Easy/Medium
 * to create more Magic Blocks, and middle digits 3..7 for Hard/Unfair/Extreme).
 */
function fillTemplateWithDigits(
  template: string,
  rng: () => number,
  preferMagicDigits: boolean,
): number[] | null {
  const grid = new Array<number>(CELL_COUNT).fill(0);
  const whiteCells: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (template[i] === '.') whiteCells.push(i);
  }

  // Precompute which cells belong to the same horizontal or vertical segment
  const sameRunPeers: number[][] = Array.from({ length: CELL_COUNT }, () => []);
  for (const cell of whiteCells) {
    const r = Math.floor(cell / GRID_SIZE);
    const c = cell % GRID_SIZE;
    const peers: number[] = [];
    for (let cc = c - 1; cc >= 0 && template[r * GRID_SIZE + cc] === '.'; cc--) peers.push(r * GRID_SIZE + cc);
    for (let cc = c + 1; cc < GRID_SIZE && template[r * GRID_SIZE + cc] === '.'; cc++) peers.push(r * GRID_SIZE + cc);
    for (let rr = r - 1; rr >= 0 && template[rr * GRID_SIZE + c] === '.'; rr--) peers.push(rr * GRID_SIZE + c);
    for (let rr = r + 1; rr < GRID_SIZE && template[rr * GRID_SIZE + c] === '.'; rr++) peers.push(rr * GRID_SIZE + c);
    sameRunPeers[cell] = peers;
  }

  const orderedDigits = (mask: number): number[] => {
    const digits = maskToDigits(mask);
    // Shuffle using rng
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = digits[i];
      digits[i] = digits[j];
      digits[j] = tmp;
    }
    if (preferMagicDigits) {
      // Bias toward extreme digits (1, 2, 8, 9) which produce Magic Block sums
      digits.sort((a, b) => {
        const extA = Math.abs(a - 5);
        const extB = Math.abs(b - 5);
        return extB - extA;
      });
    }
    return digits;
  };

  const dfs = (idx: number): boolean => {
    if (idx === whiteCells.length) return true;
    const cell = whiteCells[idx];
    let avail = ALL_DIGITS_MASK;
    for (const peer of sameRunPeers[cell]) {
      const v = grid[peer];
      if (v !== 0) avail &= ~digitBit(v);
    }
    if (avail === 0) return false;
    for (const d of orderedDigits(avail)) {
      grid[cell] = d;
      if (dfs(idx + 1)) return true;
      grid[cell] = 0;
    }
    return false;
  };

  return dfs(0) ? grid : null;
}

export class KakuroGenerator {
  private readonly solver = new KakuroSolver();

  /**
   * Generate a unique-solution Kakuro puzzle targeting `targetLevel` (1..5),
   * seeded deterministically by `seed`.
   */
  generate(targetLevel = 2, seed: number = Date.now()): GeneratedKakuro {
    const rng = createRng(seed);
    let best: GeneratedKakuro | null = null;
    let bestDiff = Infinity;

    const templateOrder =
      targetLevel <= 2
        ? [0, 2, 1, 5, 3, 4]
        : targetLevel === 3
          ? [1, 2, 3, 5, 4, 0]
          : [3, 4, 5, 1, 2, 0];

    for (let attempt = 0; attempt < 40; attempt++) {
      const tplIdx = templateOrder[attempt % templateOrder.length];
      const tpl = KAKURO_TEMPLATES[tplIdx];
      const preferMagic = targetLevel === 1 && attempt < 20;
      const sol = fillTemplateWithDigits(tpl, rng, preferMagic);
      if (!sol) continue;

      const cells = buildCellsFromSolutionGrid(sol);
      const board = new KakuroBoard(cells);

      // Verify unique solution
      const exact = this.solver.solveExact(board, 2);
      if (exact.count !== 1) continue;

      const report = this.solver.solveLogical(board);
      if (!report.solved && targetLevel < 5) continue;

      const cand: GeneratedKakuro = {
        puzzle: encodeGivens(cells),
        solution: exact.solutions[0],
        level: report.level,
        score: report.score,
        path: report.path,
      };

      const diff = Math.abs(report.level - targetLevel);
      if (diff === 0) return cand;
      if (diff < bestDiff) {
        bestDiff = diff;
        best = cand;
      }
    }

    if (best) return best;

    // Fallback to deterministic template 2
    const fallbackSol = fillTemplateWithDigits(KAKURO_TEMPLATES[2], createRng(42), true)!;
    const cells = buildCellsFromSolutionGrid(fallbackSol);
    const board = new KakuroBoard(cells);
    const report = this.solver.solveLogical(board);
    return {
      puzzle: encodeGivens(cells),
      solution: report.solution,
      level: report.level,
      score: report.score,
      path: report.path,
    };
  }

  /**
   * Generate the deterministic Daily Puzzle for `date` (`YYYY-MM-DD`) and `level` (`1..5`).
   */
  generateDaily(date: string, level = 2): GeneratedKakuro {
    const seed = hashSeed(`kakuro-revisited-daily:${date}:${level}`);
    const gen = this.generate(level, seed);
    return {
      ...gen,
      daily: date,
    };
  }
}
