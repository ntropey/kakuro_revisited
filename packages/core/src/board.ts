/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Board model, run extraction, and text serialization for 9x9 Kakuro grids.
 */
import { ALL_DIGITS_MASK, digitBit } from './partitions';

export const GRID_SIZE = 9;
export const CELL_COUNT = 81;

export interface StepMark {
  cell: number;
  digit: number;
  strong?: boolean;
}

export interface StepColor {
  cell: number;
  digit: number;
  color: number;
}

export interface StepTint {
  cells: number[];
  tone: 'a' | 'b';
}

export interface StepMarks {
  key: StepMark[];
  fins: StepMark[];
  elim: StepMark[];
  place: StepMark[];
  colors: StepColor[];
  tint: StepTint[];
  chains: StepMark[][];
  digits: number[];
}

export interface KakuroCellDef {
  readonly kind: 'block' | 'white';
  /** Across clue sum (for the horizontal run to the right of this block cell) */
  readonly across?: number;
  /** Down clue sum (for the vertical run below this block cell) */
  readonly down?: number;
}

export interface KakuroRun {
  readonly id: number;
  readonly direction: 'across' | 'down';
  readonly clueCell: number;
  readonly sum: number;
  readonly cells: readonly number[];
  /** Human-readable label, e.g. "Across 16 (r2c2–r2c3)" */
  readonly label: string;
  /** Short notation, e.g. "16→r2c1" */
  readonly shortLabel: string;
}

export function cellName(cell: number): string {
  const r = Math.floor(cell / GRID_SIZE) + 1;
  const c = (cell % GRID_SIZE) + 1;
  return `r${r}c${c}`;
}

export function parseCellName(str: string): number | null {
  const m = /^r([1-9])c([1-9])$/i.exec(str.trim());
  if (!m) return null;
  return (Number(m[1]) - 1) * GRID_SIZE + (Number(m[2]) - 1);
}

export function rowOf(cell: number): number {
  return Math.floor(cell / GRID_SIZE);
}

export function colOf(cell: number): number {
  return cell % GRID_SIZE;
}

export function emptyMarks(digits: number[] = []): StepMarks {
  return { key: [], fins: [], elim: [], place: [], colors: [], tint: [], chains: [], digits };
}

export function chainNotation(chain: readonly StepMark[]): string {
  return chain
    .map((m, i) => {
      const node = `${m.digit}${cellName(m.cell)}`;
      if (i === 0) return node;
      return `${m.strong ? ' = ' : ' - '}${node}`;
    })
    .join('');
}

/** Extract all horizontal and vertical runs from an 81-cell Kakuro definition array. */
export function extractRuns(cells: readonly KakuroCellDef[]): {
  runs: KakuroRun[];
  acrossRunOf: (number | null)[];
  downRunOf: (number | null)[];
  peersOf: number[][];
} {
  const runs: KakuroRun[] = [];
  const acrossRunOf = new Array<number | null>(CELL_COUNT).fill(null);
  const downRunOf = new Array<number | null>(CELL_COUNT).fill(null);

  // Horizontal (Across) runs
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const idx = r * GRID_SIZE + c;
      const def = cells[idx];
      if (def.kind === 'block' && def.across && def.across > 0) {
        const runCells: number[] = [];
        for (let cc = c + 1; cc < GRID_SIZE; cc++) {
          const wIdx = r * GRID_SIZE + cc;
          if (cells[wIdx].kind !== 'white') break;
          runCells.push(wIdx);
        }
        if (runCells.length > 0) {
          const id = runs.length;
          const span =
            runCells.length === 1
              ? cellName(runCells[0])
              : `${cellName(runCells[0])}–${cellName(runCells[runCells.length - 1])}`;
          runs.push({
            id,
            direction: 'across',
            clueCell: idx,
            sum: def.across,
            cells: runCells,
            label: `Across ${def.across} (${span})`,
            shortLabel: `${def.across}→${cellName(idx)}`,
          });
          for (const w of runCells) acrossRunOf[w] = id;
        }
      }
    }
  }

  // Vertical (Down) runs
  for (let c = 0; c < GRID_SIZE; c++) {
    for (let r = 0; r < GRID_SIZE; r++) {
      const idx = r * GRID_SIZE + c;
      const def = cells[idx];
      if (def.kind === 'block' && def.down && def.down > 0) {
        const runCells: number[] = [];
        for (let rr = r + 1; rr < GRID_SIZE; rr++) {
          const wIdx = rr * GRID_SIZE + c;
          if (cells[wIdx].kind !== 'white') break;
          runCells.push(wIdx);
        }
        if (runCells.length > 0) {
          const id = runs.length;
          const span =
            runCells.length === 1
              ? cellName(runCells[0])
              : `${cellName(runCells[0])}–${cellName(runCells[runCells.length - 1])}`;
          runs.push({
            id,
            direction: 'down',
            clueCell: idx,
            sum: def.down,
            cells: runCells,
            label: `Down ${def.down} (${span})`,
            shortLabel: `${def.down}↓${cellName(idx)}`,
          });
          for (const w of runCells) downRunOf[w] = id;
        }
      }
    }
  }

  const peersOf: number[][] = Array.from({ length: CELL_COUNT }, () => []);
  for (let i = 0; i < CELL_COUNT; i++) {
    if (cells[i].kind !== 'white') continue;
    const set = new Set<number>();
    const hId = acrossRunOf[i];
    const vId = downRunOf[i];
    if (hId !== null) {
      for (const peer of runs[hId].cells) if (peer !== i) set.add(peer);
    }
    if (vId !== null) {
      for (const peer of runs[vId].cells) if (peer !== i) set.add(peer);
    }
    peersOf[i] = [...set].sort((a, b) => a - b);
  }

  return { runs, acrossRunOf, downRunOf, peersOf };
}

export class KakuroBoard {
  readonly cells: readonly KakuroCellDef[];
  readonly runs: readonly KakuroRun[];
  readonly acrossRunOf: readonly (number | null)[];
  readonly downRunOf: readonly (number | null)[];
  readonly peersOf: readonly (readonly number[])[];
  readonly values: number[];
  readonly cands: number[];

  constructor(
    cells: readonly KakuroCellDef[],
    values?: readonly number[],
    cands?: readonly number[],
    precomputed?: {
      runs: readonly KakuroRun[];
      acrossRunOf: readonly (number | null)[];
      downRunOf: readonly (number | null)[];
      peersOf: readonly (readonly number[])[];
    },
  ) {
    this.cells = cells;
    const ext = precomputed ?? extractRuns(cells);
    this.runs = ext.runs;
    this.acrossRunOf = ext.acrossRunOf;
    this.downRunOf = ext.downRunOf;
    this.peersOf = ext.peersOf;
    this.values = values ? values.slice() : new Array<number>(CELL_COUNT).fill(0);
    if (cands) {
      this.cands = cands.slice();
    } else {
      this.cands = new Array<number>(CELL_COUNT).fill(0);
      this.resetCandidates();
    }
  }

  clone(): KakuroBoard {
    return new KakuroBoard(this.cells, this.values, this.cands, {
      runs: this.runs,
      acrossRunOf: this.acrossRunOf,
      downRunOf: this.downRunOf,
      peersOf: this.peersOf,
    });
  }

  isWhite(cell: number): boolean {
    return this.cells[cell]?.kind === 'white';
  }

  isBlock(cell: number): boolean {
    return this.cells[cell]?.kind === 'block';
  }

  isCandidate(cell: number, digit: number): boolean {
    return (this.cands[cell] & digitBit(digit)) !== 0;
  }

  setCandidate(cell: number, digit: number, enabled: boolean): void {
    if (!this.isWhite(cell) || this.values[cell] !== 0) return;
    if (enabled) this.cands[cell] |= digitBit(digit);
    else this.cands[cell] &= ~digitBit(digit);
  }

  /** Place `digit` (1..9) into `cell` and eliminate `digit` from all peers in its Across and Down runs. */
  setCell(cell: number, digit: number): void {
    if (!this.isWhite(cell)) return;
    this.values[cell] = digit;
    this.cands[cell] = 0;
    if (digit >= 1 && digit <= 9) {
      const bit = digitBit(digit);
      for (const peer of this.peersOf[cell]) {
        this.cands[peer] &= ~bit;
      }
    }
  }

  /** Reset candidate masks of all empty white cells to 1..9 minus digits already placed in peer cells. */
  resetCandidates(): void {
    for (let i = 0; i < CELL_COUNT; i++) {
      if (!this.isWhite(i) || this.values[i] !== 0) {
        this.cands[i] = 0;
        continue;
      }
      let mask = ALL_DIGITS_MASK;
      for (const peer of this.peersOf[i]) {
        const v = this.values[peer];
        if (v >= 1 && v <= 9) mask &= ~digitBit(v);
      }
      this.cands[i] = mask;
    }
  }

  /** Get the Across and Down runs for a white cell. */
  runsForCell(cell: number): { across: KakuroRun | null; down: KakuroRun | null } {
    const hId = this.acrossRunOf[cell];
    const vId = this.downRunOf[cell];
    return {
      across: hId !== null ? this.runs[hId] : null,
      down: vId !== null ? this.runs[vId] : null,
    };
  }

  /** Return stats on a run: empty cells, placed cells, placed sum, placed digit mask, and residual sum. */
  runState(run: KakuroRun): {
    emptyCells: number[];
    placedCells: number[];
    placedSum: number;
    placedMask: number;
    residualSum: number;
    hasDuplicate: boolean;
  } {
    const emptyCells: number[] = [];
    const placedCells: number[] = [];
    let placedSum = 0;
    let placedMask = 0;
    let hasDuplicate = false;
    for (const c of run.cells) {
      const v = this.values[c];
      if (v === 0) {
        emptyCells.push(c);
      } else {
        placedCells.push(c);
        placedSum += v;
        const bit = digitBit(v);
        if ((placedMask & bit) !== 0) hasDuplicate = true;
        placedMask |= bit;
      }
    }
    return {
      emptyCells,
      placedCells,
      placedSum,
      placedMask,
      residualSum: run.sum - placedSum,
      hasDuplicate,
    };
  }

  /** True if every white cell is filled and every run has distinct digits summing to its clue. */
  isSolved(): boolean {
    let whiteCount = 0;
    for (let i = 0; i < CELL_COUNT; i++) {
      if (this.isWhite(i)) {
        whiteCount++;
        const v = this.values[i];
        if (v < 1 || v > 9) return false;
      }
    }
    if (whiteCount === 0) return false;
    for (const run of this.runs) {
      const st = this.runState(run);
      if (st.emptyCells.length > 0 || st.hasDuplicate || st.residualSum !== 0) return false;
    }
    return true;
  }
}

/**
 * Build a KakuroCellDef[] from an 81-element solution template where `0` is a block cell
 * and `1..9` is the solution digit in a white cell. Automatically computes all `across` and `down` clues.
 */
export function buildCellsFromSolutionGrid(solution: readonly number[]): KakuroCellDef[] {
  if (solution.length !== CELL_COUNT) {
    throw new Error(`Expected ${CELL_COUNT} cells in solution grid, got ${solution.length}`);
  }
  const cells: KakuroCellDef[] = new Array(CELL_COUNT);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const idx = r * GRID_SIZE + c;
      if (solution[idx] >= 1 && solution[idx] <= 9) {
        cells[idx] = { kind: 'white' };
      } else {
        // Compute across clue (white cells to the right)
        let acrossSum = 0;
        let acrossLen = 0;
        for (let cc = c + 1; cc < GRID_SIZE; cc++) {
          const v = solution[r * GRID_SIZE + cc];
          if (v >= 1 && v <= 9) {
            acrossSum += v;
            acrossLen++;
          } else break;
        }
        // Compute down clue (white cells below)
        let downSum = 0;
        let downLen = 0;
        for (let rr = r + 1; rr < GRID_SIZE; rr++) {
          const v = solution[rr * GRID_SIZE + c];
          if (v >= 1 && v <= 9) {
            downSum += v;
            downLen++;
          } else break;
        }
        cells[idx] = {
          kind: 'block',
          ...(acrossLen >= 1 ? { across: acrossSum } : {}),
          ...(downLen >= 1 ? { down: downSum } : {}),
        };
      }
    }
  }
  return cells;
}

/**
 * Encode a 9x9 Kakuro board into a canonical URL-safe string of 81 `-`-separated tokens:
 * - `B`: blank block cell
 * - `aXdY` / `aX` / `dY`: clue cell with Across X and/or Down Y
 * - `.`: empty white cell
 * - `1..9`: white cell with placed digit 1..9
 */
export function encodeKakuro(cells: readonly KakuroCellDef[], values?: readonly number[]): string {
  const tokens: string[] = [];
  for (let i = 0; i < CELL_COUNT; i++) {
    const def = cells[i];
    if (def.kind === 'block') {
      const a = def.across ? `a${def.across}` : '';
      const d = def.down ? `d${def.down}` : '';
      tokens.push(a || d ? `${a}${d}` : 'B');
    } else {
      const v = values?.[i] ?? 0;
      tokens.push(v >= 1 && v <= 9 ? String(v) : '.');
    }
  }
  return tokens.join('-');
}

/** Encode only the puzzle givens (all white cells written as `.`). */
export function encodeGivens(cells: readonly KakuroCellDef[]): string {
  return encodeKakuro(cells);
}

/**
 * Parse a Kakuro puzzle string into a `KakuroBoard` and its canonical `givens` string.
 * Supports:
 * 1. Canonical `-`-separated 81-token strings (`B-d16-d7-...-a4-.-...`)
 * 2. Whitespace/comma-separated 81-token grids using `16\23`, `\23`, `16\`, `#`, `B`, `.`, `1..9`
 * 3.HoDoKu-style `:0000:x:...` library lines wrapping a Kakuro puzzle string
 * 4. 81-character solution templates (`#` for block, `1..9` for solution digit)
 */
export function parseKakuro(raw: string): { board: KakuroBoard; givens: string } {
  let trimmed = raw.trim();
  if (!trimmed) throw new Error('Empty Kakuro puzzle string.');

  // Strip optional library wrapper `:0000:x:<puzzle>:`
  if (trimmed.startsWith(':')) {
    const parts = trimmed.split(':').filter(Boolean);
    if (parts.length >= 3) trimmed = parts[2].trim();
  }

  // Case 1: 81-char compact solved template of `#`/`B`/`0` and `1..9`
  if (/^[#B01-9]{81}$/i.test(trimmed) && /[1-9]/.test(trimmed)) {
    const sol = [...trimmed].map((ch) => (/[1-9]/.test(ch) ? Number(ch) : 0));
    const cells = buildCellsFromSolutionGrid(sol);
    const board = new KakuroBoard(cells);
    return { board, givens: encodeGivens(cells) };
  }

  // Split into 81 cell tokens by `-`, whitespace, `,`, or `;`
  const tokens = trimmed.includes('-') && !trimmed.includes(' ') && !trimmed.includes('\n')
    ? trimmed.split('-')
    : trimmed.split(/[\s,;]+/).filter(Boolean);

  if (tokens.length !== CELL_COUNT) {
    throw new Error(`Expected ${CELL_COUNT} cell tokens in Kakuro puzzle, got ${tokens.length}.`);
  }

  const cells: KakuroCellDef[] = new Array(CELL_COUNT);
  const values: number[] = new Array(CELL_COUNT).fill(0);

  for (let i = 0; i < CELL_COUNT; i++) {
    const tok = tokens[i];
    if (tok === '.' || tok === '_' || tok === '0') {
      cells[i] = { kind: 'white' };
    } else if (/^[1-9]$/.test(tok)) {
      cells[i] = { kind: 'white' };
      values[i] = Number(tok);
    } else if (tok === 'B' || tok === '#' || tok === 'X' || tok === 'b' || tok === '\\' || tok === '/') {
      cells[i] = { kind: 'block' };
    } else {
      // Try `aXdY` format
      const ad = /^(?:a(\d+))?(?:d(\d+))?$/i.exec(tok);
      if (ad && (ad[1] || ad[2])) {
        const across = ad[1] ? Number(ad[1]) : undefined;
        const down = ad[2] ? Number(ad[2]) : undefined;
        cells[i] = { kind: 'block', ...(across ? { across } : {}), ...(down ? { down } : {}) };
        continue;
      }
      // Try `down\across` or `across\down` (`X\Y` or `X/Y`)
      // Convention in Kakuro text grids: `down\across` or `across\down`. We support `aXdY` unambiguously,
      // and for `X\Y` we treat left as down and right as across (standard `\`: bottom-left is down, top-right is across)
      const slash = /^(\d*)[\\/:](\d*)$/.exec(tok);
      if (slash && (slash[1] || slash[2])) {
        const down = slash[1] ? Number(slash[1]) : undefined;
        const across = slash[2] ? Number(slash[2]) : undefined;
        cells[i] = { kind: 'block', ...(across ? { across } : {}), ...(down ? { down } : {}) };
        continue;
      }
      throw new Error(`Unrecognized Kakuro cell token "${tok}" at ${cellName(i)}.`);
    }
  }

  const board = new KakuroBoard(cells);
  for (let i = 0; i < CELL_COUNT; i++) {
    if (values[i] !== 0) board.setCell(i, values[i]);
  }
  return { board, givens: encodeGivens(cells) };
}

export type CopyFormat = 'PM_GRID' | 'LIBRARY' | 'VALUES_ONLY' | 'CLUES_ONLY_FORMATTED';

/** Format a Kakuro board into one of the standard copy/export text formats. */
export function formatKakuro(board: KakuroBoard, mode: CopyFormat = 'VALUES_ONLY'): string {
  if (mode === 'LIBRARY') {
    return `:0000:x:${encodeKakuro(board.cells, board.values)}:`;
  }
  if (mode === 'VALUES_ONLY') {
    return encodeKakuro(board.cells, board.values);
  }
  if (mode === 'CLUES_ONLY_FORMATTED') {
    const rows: string[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const cols: string[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        const i = r * GRID_SIZE + c;
        const def = board.cells[i];
        if (def.kind === 'block') {
          const d = def.down ? String(def.down) : '';
          const a = def.across ? String(def.across) : '';
          const tok = d || a ? `${d}\\${a}` : '#';
          cols.push(tok.padStart(6, ' '));
        } else {
          const v = board.values[i];
          cols.push((v ? String(v) : '.').padStart(6, ' '));
        }
      }
      rows.push(cols.join(' '));
    }
    return rows.join('\n');
  }
  // PM_GRID: include candidate pencil marks for empty white cells
  const rows: string[] = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const cols: string[] = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      const i = r * GRID_SIZE + c;
      const def = board.cells[i];
      if (def.kind === 'block') {
        const d = def.down ? String(def.down) : '';
        const a = def.across ? String(def.across) : '';
        const tok = d || a ? `${d}\\${a}` : '#';
        cols.push(tok.padStart(10, ' '));
      } else if (board.values[i] !== 0) {
        cols.push(String(board.values[i]).padStart(10, ' '));
      } else {
        const digits: number[] = [];
        for (let d = 1; d <= 9; d++) if (board.isCandidate(i, d)) digits.push(d);
        cols.push(`{${digits.join('')}}`.padStart(10, ' '));
      }
    }
    rows.push(cols.join(' '));
  }
  return rows.join('\n');
}
