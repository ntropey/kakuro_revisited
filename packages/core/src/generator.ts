/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Deterministic Kakuro puzzle generator and date-seeded Daily Puzzle builder.
 *
 * A generated puzzle must satisfy three gates before it is handed out:
 *   1. the layout is structurally valid,
 *   2. the puzzle has exactly one solution,
 *   3. the puzzle can be solved with human techniques alone.
 * Nothing is returned that fails a gate, so a generated puzzle always has a single answer and
 * always has a human-style solution path.
 */
import { ALL_DIGITS_MASK, digitBit, getPartitions, maskToDigits } from './partitions';
import {
  CELL_COUNT,
  GRID_SIZE,
  KakuroBoard,
  buildCellsFromSolutionGrid,
  encodeGivens,
} from './board';
import { KakuroSolver, type PathEntry } from './solver';
import { KAKURO_TEMPLATES, TEMPLATE_NAMES, layoutStats, validateLayout } from './templates';

export interface GeneratedKakuro {
  /** Canonical puzzle string (all white cells empty). */
  puzzle: string;
  /** The unique solution grid. */
  solution: number[];
  level: number;
  score: number;
  path: PathEntry[];
  /** Name of the layout used. */
  layout: string;
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

/** Run membership of a layout: which Across and Down run every white cell belongs to. */
export interface LayoutRunIndex {
  /** Across run id per cell, `null` for cells that start no Across run. */
  readonly acrossRunOf: (number | null)[];
  /** Down run id per cell, `null` for cells that start no Down run. */
  readonly downRunOf: (number | null)[];
  readonly acrossCells: number[][];
  readonly downCells: number[][];
  /** Every run of the layout, Across runs first. */
  readonly allRuns: number[][];
}

/** Compute the run membership of a layout. */
export function layoutRunIndex(layout: string): LayoutRunIndex {
  const acrossRunOf = new Array<number | null>(CELL_COUNT).fill(null);
  const downRunOf = new Array<number | null>(CELL_COUNT).fill(null);
  const acrossCells: number[][] = [];
  const downCells: number[][] = [];
  const allRuns: number[][] = [];

  for (let r = 0; r < GRID_SIZE; r++) {
    let c = 0;
    while (c < GRID_SIZE) {
      if (layout[r * GRID_SIZE + c] !== '.') {
        c++;
        continue;
      }
      const cells: number[] = [];
      while (c < GRID_SIZE && layout[r * GRID_SIZE + c] === '.') {
        cells.push(r * GRID_SIZE + c);
        c++;
      }
      const id = acrossCells.length;
      acrossCells.push(cells);
      allRuns.push(cells);
      for (const cell of cells) acrossRunOf[cell] = id;
    }
  }

  for (let c = 0; c < GRID_SIZE; c++) {
    let r = 0;
    while (r < GRID_SIZE) {
      if (layout[r * GRID_SIZE + c] !== '.') {
        r++;
        continue;
      }
      const cells: number[] = [];
      while (r < GRID_SIZE && layout[r * GRID_SIZE + c] === '.') {
        cells.push(r * GRID_SIZE + c);
        r++;
      }
      const id = downCells.length;
      downCells.push(cells);
      allRuns.push(cells);
      for (const cell of cells) downRunOf[cell] = id;
    }
  }

  return { acrossRunOf, downRunOf, acrossCells, downCells, allRuns };
}

/** Cells that share a run with the given cell, per layout. */
function runPeers(layout: string): number[][] {
  const peers: number[][] = Array.from({ length: CELL_COUNT }, () => []);
  for (const cells of layoutRunIndex(layout).allRuns) {
    for (const cell of cells) {
      for (const other of cells) if (other !== cell) peers[cell].push(other);
    }
  }
  return peers;
}

/**
 * A rectangle of white cells whose digits can be shifted to produce a second solution.
 *
 * The corners are `a` and `b` in one Across run, `c` and `d` in another Across run, `a` and `c` in
 * one Down run and `b` and `d` in another Down run. Adding `k` to `a` and `d` while subtracting `k`
 * from `b` and `c` keeps the sum of all four runs, so for every `k` that stays inside 1..9 and
 * keeps every run free of duplicates the puzzle has a second solution. A fill must avoid those.
 */
export interface AmbiguityRectangle {
  /** Corner cells in order: top-left, top-right, bottom-left, bottom-right. */
  readonly corners: readonly [number, number, number, number];
  /** Cells of the Across run of the top corners, without the corners. */
  readonly across1: readonly number[];
  /** Cells of the Across run of the bottom corners, without the corners. */
  readonly across2: readonly number[];
  /** Cells of the Down run of the left corners, without the corners. */
  readonly down1: readonly number[];
  /** Cells of the Down run of the right corners, without the corners. */
  readonly down2: readonly number[];
}

/** Collect every rectangle of a layout. */
export function ambiguityRectangles(
  layout: string,
  index?: LayoutRunIndex,
): AmbiguityRectangle[] {
  const runs = index ?? layoutRunIndex(layout);
  const out: AmbiguityRectangle[] = [];
  for (let a = 0; a < CELL_COUNT; a++) {
    if (layout[a] !== '.') continue;
    const hId = runs.acrossRunOf[a];
    const vId = runs.downRunOf[a];
    if (hId === null || vId === null) continue;
    const row = Math.floor(a / GRID_SIZE);
    const col = a % GRID_SIZE;
    for (const b of runs.acrossCells[hId]) {
      if (b === a) continue;
      const bCol = b % GRID_SIZE;
      if (bCol === col) continue;
      for (const c of runs.downCells[vId]) {
        if (c === a) continue;
        const cRow = Math.floor(c / GRID_SIZE);
        if (cRow === row) continue;
        const d = cRow * GRID_SIZE + bCol;
        if (layout[d] !== '.') continue;
        if (runs.acrossRunOf[d] !== runs.acrossRunOf[c]) continue;
        if (runs.downRunOf[d] !== runs.downRunOf[b]) continue;
        const corners: [number, number, number, number] = [a, b, c, d];
        const across1 = runs.acrossCells[hId].filter((x) => x !== a && x !== b);
        const across2 = runs.acrossCells[runs.acrossRunOf[d] as number].filter(
          (x) => x !== c && x !== d,
        );
        const down1 = runs.downCells[vId].filter((x) => x !== a && x !== c);
        const down2 = runs.downCells[runs.downRunOf[b] as number].filter((x) => x !== b && x !== d);
        out.push({ corners, across1, across2, down1, down2 });
      }
    }
  }
  return out;
}

/** Map every white cell to the rectangles it belongs to. */
export function rectanglesByCell(
  layout: string,
  index?: LayoutRunIndex,
): Map<number, AmbiguityRectangle[]> {
  const out = new Map<number, AmbiguityRectangle[]>();
  for (const rect of ambiguityRectangles(layout, index)) {
    for (const corner of rect.corners) {
      const list = out.get(corner);
      if (list) list.push(rect);
      else out.set(corner, [rect]);
    }
  }
  return out;
}

/**
 * True when some shift `k` turns the rectangle into a different, still legal solution.
 *
 * `cornerValues` holds the digits of the four corners, `extra` the digits of the cells that share
 * a run with the rectangle. A shift keeps every run sum, so the puzzle would have two solutions.
 */
export function rectangleShiftExists(
  rect: AmbiguityRectangle,
  cornerValues: readonly [number, number, number, number],
  extra: (cells: readonly number[]) => number[],
): boolean {
  const [va, vb, vc, vd] = cornerValues;
  for (let k = -8; k <= 8; k++) {
    if (k === 0) continue;
    const a2 = va + k;
    const b2 = vb - k;
    const c2 = vc - k;
    const d2 = vd + k;
    if (a2 < 1 || a2 > 9 || b2 < 1 || b2 > 9 || c2 < 1 || c2 > 9 || d2 < 1 || d2 > 9) continue;
    if (a2 === b2 || a2 === c2 || b2 === d2 || c2 === d2) continue;
    let ok = true;
    for (const w of extra(rect.across1)) {
      if (w === a2 || w === b2) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (const w of extra(rect.across2)) {
      if (w === c2 || w === d2) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (const w of extra(rect.down1)) {
      if (w === a2 || w === c2) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    for (const w of extra(rect.down2)) {
      if (w === b2 || w === d2) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

/**
 * Fill a layout with digits 1..9 so that no run holds the same digit twice.
 *
 * The search is a randomized backtracker that always continues with the most constrained cell,
 * which keeps the fill fast even on dense layouts. The `mode` steers the shape of the result:
 * - `prefer` uses the digits from the outside in (1, 2, 3, 8, 9 before 4..7), because extreme
 *   digits produce the unique sum partitions ("Magic Blocks") that make a puzzle easy to crack.
 * - `avoid` rejects a fill as soon as a run ends up with a unique sum partition, which pushes the
 *   puzzle towards the harder techniques.
 * - `any` lets the digits fall where they may.
 */
export function fillLayout(
  layout: string,
  rng: () => number,
  mode: 'prefer' | 'avoid' | 'any' = 'any',
): number[] | null {
  const grid = new Array<number>(CELL_COUNT).fill(0);
  const peers = runPeers(layout);
  const rectangles = rectanglesByCell(layout);
  const runsOfCell = layoutRunIndex(layout);
  const whiteCells: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) if (layout[i] === '.') whiteCells.push(i);

  const availableMask = (cell: number): number => {
    let mask = ALL_DIGITS_MASK;
    for (const peer of peers[cell]) {
      const v = grid[peer];
      if (v >= 1) mask &= ~digitBit(v);
    }
    return mask;
  };

  /** True when the run holds the only possible partition of its sum. */
  const isMagicRun = (runId: number): boolean => {
    const cells =
      runId < runsOfCell.acrossCells.length
        ? runsOfCell.acrossCells[runId]
        : runsOfCell.downCells[runId - runsOfCell.acrossCells.length];
    let sum = 0;
    let placedMask = 0;
    let empty = 0;
    for (const c of cells) {
      const v = grid[c];
      if (v === 0) {
        empty++;
        continue;
      }
      sum += v;
      placedMask |= digitBit(v);
    }
    if (empty > 0) return false;
    const parts = getPartitions(cells.length, sum).filter((p) => (p.mask & placedMask) === 0);
    return parts.length === 1;
  };

  /**
   * True when placing `candidate` in `cell` would allow a rectangle to shift into a second
   * solution. A rectangle is only judged once all four of its corners hold a digit, so every
   * rectangle is checked exactly when its last corner is filled.
   */
  const createsSecondSolution = (cell: number, candidate: number): boolean => {
    for (const rect of rectangles.get(cell) ?? []) {
      const values: number[] = [];
      let ready = true;
      for (const corner of rect.corners) {
        const v = corner === cell ? candidate : grid[corner];
        if (v === 0) {
          ready = false;
          break;
        }
        values.push(v);
      }
      if (!ready) continue;
      if (
        rectangleShiftExists(
          rect,
          values as [number, number, number, number],
          (cells) => cells.map((c) => grid[c]),
        )
      ) {
        return true;
      }
    }
    return false;
  };

  const digitOrder = (mask: number): number[] => {
    const digits = maskToDigits(mask);
    for (let i = digits.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = digits[i];
      digits[i] = digits[j];
      digits[j] = tmp;
    }
    if (mode === 'prefer') {
      digits.sort((a, b) => Math.abs(b - 5) - Math.abs(a - 5));
    }
    return digits;
  };

  const search = (): boolean => {
    let bestCell = -1;
    let bestMask = 0;
    let bestCount = 10;
    for (const cell of whiteCells) {
      if (grid[cell] !== 0) continue;
      const mask = availableMask(cell);
      const count = maskToDigits(mask).length;
      if (count === 0) return false;
      if (count < bestCount) {
        bestCount = count;
        bestCell = cell;
        bestMask = mask;
        if (count === 1) break;
      }
    }
    if (bestCell === -1) return true;

    for (const d of digitOrder(bestMask)) {
      if (createsSecondSolution(bestCell, d)) continue;
      grid[bestCell] = d;
      if (mode === 'avoid') {
        // A run that just filled up must not end with a unique sum partition.
        let magic = false;
        for (const runId of [
          runsOfCell.acrossRunOf[bestCell],
          runsOfCell.downRunOf[bestCell],
        ]) {
          if (runId === null) continue;
          if (isMagicRun(runId)) {
            magic = true;
            break;
          }
        }
        if (magic) {
          grid[bestCell] = 0;
          continue;
        }
      }
      if (search()) return true;
      grid[bestCell] = 0;
    }
    return false;
  };

  return search() ? grid : null;
}

export interface GenerateOptions {
  /** Upper bound on generation attempts. */
  maxAttempts?: number;
  /** Upper bound on ambiguity repairs per attempt. */
  maxRepairs?: number;
}

/** Build a board from a filled solution grid. */
function boardFromSolution(solution: readonly number[]): KakuroBoard {
  return new KakuroBoard(buildCellsFromSolutionGrid(solution as number[]));
}

/** Shuffle a copy of `items` with the given generator. */
function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * Remove an ambiguity from a fill by changing a single digit.
 *
 * Two solutions of the same puzzle differ by a circulation of digits through the runs, so the
 * cells where they differ are the core of the ambiguity. Changing one of those digits breaks the
 * circulation. Every candidate digit is checked with the exact solver, so the returned grid is
 * guaranteed to have exactly one solution.
 */
export function repairAmbiguousFill(
  solution: readonly number[],
  rival: readonly number[],
  layout: string,
  rng: () => number,
  solver: KakuroSolver,
): number[] | null {
  const runs = layoutRunIndex(layout);
  const core: number[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    if (solution[i] !== rival[i]) core.push(i);
  }
  if (core.length === 0) return null;

  for (const cell of shuffled(core, rng)) {
    const used = new Set<number>();
    for (const runId of [runs.acrossRunOf[cell], runs.downRunOf[cell]]) {
      if (runId === null) continue;
      const run =
        runId < runs.acrossCells.length ? runs.acrossCells[runId] : runs.downCells[runId];
      for (const other of run) if (other !== cell) used.add(solution[other]);
    }
    const candidates = shuffled(
      [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !used.has(d) && d !== solution[cell]),
      rng,
    );
    // Extremes first: they squeeze the circulation of the runs they sit in.
    candidates.sort((a, b) => Math.abs(b - 5) - Math.abs(a - 5));
    for (const d of candidates) {
      const next = solution.slice();
      next[cell] = d;
      const board = boardFromSolution(next);
      if (solver.solveExact(board, 2).count === 1) return next;
    }
  }
  return null;
}

export class KakuroGenerator {
  private readonly solver = new KakuroSolver();

  /**
   * Generate a unique-solution Kakuro puzzle targeting `targetLevel` (1..5),
   * seeded deterministically by `seed`.
   */
  generate(targetLevel = 2, seed: number = Date.now(), options: GenerateOptions = {}): GeneratedKakuro {
    const level = Math.min(5, Math.max(1, Math.round(targetLevel)));
    const rng = createRng(seed);
    const maxAttempts = options.maxAttempts ?? 240;
    const maxRepairs = options.maxRepairs ?? 16;

    // Easy puzzles prefer layouts that are made of short runs.
    const order =
      level <= 2
        ? [0, 1, 0, 2, 1, 3, 0, 4, 2, 5]
        : level === 3
          ? [2, 1, 3, 4, 0, 5, 2, 4]
          : [5, 4, 3, 2, 5, 4, 1, 0];

    // Level 1 and 2 puzzles fall to magic blocks, harder ones need the advanced techniques, so the
    // fill avoids unique sum partitions from level 3 upwards.
    const mode: 'prefer' | 'avoid' | 'any' = level <= 2 ? 'prefer' : 'avoid';

    let best: GeneratedKakuro | null = null;
    let bestDiff = Infinity;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const tplIdx = order[attempt % order.length];
      const layout = KAKURO_TEMPLATES[tplIdx];
      if (!validateLayout(layout).ok) continue;

      let sol = fillLayout(layout, rng, mode);
      if (!sol) continue;

      // Gate 1: exactly one solution. Repairs remove a second solution digit by digit.
      let solution: number[] | null = null;
      for (let repair = 0; repair <= maxRepairs; repair++) {
        const board = boardFromSolution(sol);
        const exact = this.solver.solveExact(board, 3);
        if (exact.count === 1) {
          solution = exact.solutions[0];
          break;
        }
        if (exact.count === 0) break;
        const repaired = repairAmbiguousFill(sol, exact.solutions[1], layout, rng, this.solver);
        if (!repaired) break;
        sol = repaired;
      }
      if (!solution) continue;

      // Gate 2: solvable with human techniques alone.
      const cells = buildCellsFromSolutionGrid(solution);
      const board = new KakuroBoard(cells);
      const report = this.solver.solveLogical(board);
      if (!report.solved) continue;

      const cand: GeneratedKakuro = {
        puzzle: encodeGivens(cells),
        solution,
        level: report.level,
        score: report.score,
        path: report.path,
        layout: TEMPLATE_NAMES[tplIdx] ?? `Template ${tplIdx}`,
      };

      const diff = Math.abs(report.level - level);
      if (diff === 0) return cand;
      if (diff < bestDiff) {
        bestDiff = diff;
        best = cand;
      }
    }

    if (best) return best;
    throw new Error(
      `Could not generate a level ${level} Kakuro puzzle after ${maxAttempts} attempts (seed ${seed}).`,
    );
  }

  /**
   * Generate the deterministic Daily Puzzle for `date` (`YYYY-MM-DD`) and `level` (`1..5`).
   */
  generateDaily(date: string, level = 2): GeneratedKakuro {
    const seed = hashSeed(`kakuro-revisited-daily:${date}:${level}`);
    const gen = new KakuroGenerator();
    const result = gen.generate(level, seed);
    return {
      ...result,
      daily: date,
    };
  }

  /** Statistics about the built-in layouts, useful for the website and the app. */
  layoutInfo(): { name: string; stats: ReturnType<typeof layoutStats> }[] {
    return KAKURO_TEMPLATES.map((layout, i) => ({
      name: TEMPLATE_NAMES[i] ?? `Template ${i}`,
      stats: layoutStats(layout),
    }));
  }
}
