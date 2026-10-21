/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The pure API of the solver worker: everything here works on data, never on the DOM.
 */
import {
  CELL_COUNT,
  KakuroBoard,
  KakuroGenerator,
  KakuroSolver,
  KakuroStepFinder,
  encodeKakuro,
  formatKakuro,
  parseKakuro,
  type CopyFormat,
  type SolutionStep,
  type StepMarks,
} from '@kakuro/core';
import { pickFromBank } from '@kakuro/core';
import { buildCoachStages, buildProofStages } from './aiCoach';
import type { HintLevel, HintResult, ProofResult, PuzzleInfo } from './protocol';

const solver = new KakuroSolver();
const finder = new KakuroStepFinder();

/**
 * Rebuild the board of a puzzle with the player's digits.
 *
 * The candidate masks are always derived from the values: a mask handed in from the UI can be one
 * move out of date, and a stale mask can hide a digit that is still possible.
 */
export function buildBoard(puzzle: string, values?: readonly number[]): KakuroBoard {
  const { board } = parseKakuro(puzzle);
  if (values) {
    for (let i = 0; i < CELL_COUNT; i++) {
      if (values[i] >= 1 && values[i] <= 9) board.setCell(i, values[i]);
    }
  }
  return board;
}

/** The core level of a hint level: 0 and 1 both mean the basic techniques. */
function coreLevel(level: HintLevel): number {
  return level <= 1 ? 1 : level;
}

function toPuzzleInfo(info: {
  puzzle: string;
  solution: number[];
  level: number;
  score: number;
  path?: { name: string; type: string; slug: string | null; count: number; score: number }[];
  bankIndex?: number;
  daily?: string;
  layout?: string;
}): PuzzleInfo {
  return {
    puzzle: info.puzzle,
    solution: info.solution,
    level: info.level,
    score: info.score,
    path: info.path,
    bankIndex: info.bankIndex,
    daily: info.daily,
    layout: info.layout,
  };
}

/** A new puzzle of the given difficulty. */
export function generate(level: number): PuzzleInfo {
  const gen = new KakuroGenerator();
  return toPuzzleInfo(gen.generate(level));
}

/** A puzzle from the bank; falls back to a generated one when the bank is empty. */
export function fromBank(level: number, seen: readonly number[]): PuzzleInfo {
  try {
    return toPuzzleInfo(pickFromBank(level, seen));
  } catch {
    return generate(level);
  }
}

/** The deterministic Daily Puzzle of a date. */
export function daily(date: string, level: number): PuzzleInfo {
  const gen = new KakuroGenerator();
  return toPuzzleInfo(gen.generateDaily(date, level));
}

/** Read a puzzle from its canonical string and work out its difficulty. */
export function analyze(puzzle: string): PuzzleInfo {
  const { board } = parseKakuro(puzzle);
  const report = solver.solveLogical(board);
  return {
    puzzle,
    solution: report.solved ? report.solution : new Array<number>(CELL_COUNT).fill(0),
    level: report.level,
    score: report.score,
    path: report.path,
  };
}

/** Turn a core step into a hint the UI can show. */
function toHint(step: SolutionStep, board: KakuroBoard, withCoach: boolean): HintResult {
  const marks: StepMarks = step.marks;
  return {
    name: step.name,
    type: step.type,
    text: step.text,
    summary: step.summary,
    slug: step.slug,
    marks,
    notation: step.notation,
    coach: withCoach ? buildCoachStages(step, board, marks, step.summary) : undefined,
  };
}

/** The next available step, or null when the puzzle is stuck. */
export function hint(
  puzzle: string,
  values: readonly number[],
  cands: readonly number[],
  level: HintLevel,
  disabled: readonly string[] = [],
): HintResult | null {
  const board = buildBoard(puzzle, values);
  const step = finder.findNextStep(board, coreLevel(level), new Set(disabled));
  if (!step) return null;
  return toHint(step, board, true);
}

/** Every step available right now, grouped by technique. */
export function allHints(
  puzzle: string,
  values: readonly number[],
  cands: readonly number[],
  level: HintLevel,
  disabled: readonly string[] = [],
): { results: HintResult[]; total: Record<string, number> } {
  const board = buildBoard(puzzle, values);
  const { steps, total } = finder.findAllSteps(board, coreLevel(level), 12, new Set(disabled));
  // Each hint carries its walkthrough, because picking one from the list opens it in the coach.
  const results = steps.map((s) => toHint(s, board, true));
  return { results, total };
}

/** The remaining solution path of the puzzle. */
export function path(puzzle: string, values: readonly number[], cands: readonly number[]): HintResult[] {
  const board = buildBoard(puzzle, values);
  const report = solver.solveLogical(board);
  if (!report.solved) return [];
  return report.steps.map((s) => toHint(s, board, false));
}

/**
 * Prove what happens when a candidate digit is placed in a cell.
 *
 * The candidate is placed on a copy of the board and the forced placements are traced. The result
 * is a short walkthrough: the assumption, the chain of forced digits, and the conflict that makes
 * the candidate impossible.
 */
export function prove(
  puzzle: string,
  values: readonly number[],
  cands: readonly number[],
  cell: number,
  digit: number,
): ProofResult {
  const board = buildBoard(puzzle, values);
  const result = solver.proveCandidate(board, cell, digit);
  return {
    cell,
    digit,
    verdict: result.valid ? 'valid' : 'conflict',
    headline: result.valid ? 'This digit fits' : 'This digit cannot work',
    stages: buildProofStages(result, board),
  };
}

/** The digits the solver still allows in every empty cell. */
export function candidates(puzzle: string, values: readonly number[]): number[] {
  const board = buildBoard(puzzle, values);
  const out = new Array<number>(CELL_COUNT).fill(0);
  for (let i = 0; i < CELL_COUNT; i++) {
    if (board.isWhite(i) && board.values[i] === 0) out[i] = board.cands[i];
  }
  return out;
}

/** The board as text in one of the standard Kakuro formats. */
export function format(puzzle: string, values: readonly number[], mode: CopyFormat): string {
  const board = buildBoard(puzzle, values);
  return mode === 'LIBRARY' ? formatKakuro(board, 'LIBRARY') : formatKakuro(board, mode);
}

/** The puzzle string with the player's digits, used for sharing. */
export function encodeValues(puzzle: string, values: readonly number[]): string {
  const board = buildBoard(puzzle, values);
  return encodeKakuro(board.cells, board.values);
}
