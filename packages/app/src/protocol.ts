/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * Messages between the UI and the solver worker.
 */
import type { StepMarks } from '@kakuro/core';

/** One interactive stage of the AI Coach walkthrough or contradiction proof. */
export interface CoachStage {
  /** Short title of the stage, e.g. 'Where to look', 'The pattern', 'The logic', 'Conclusion'. */
  label: string;
  /** Conversational, board-specific narration for this stage. */
  text: string;
  /** Cells, candidates and chains to highlight on the board at this stage. */
  marks: StepMarks;
}

/** Result of asking the AI Coach "Why not digit D in cell rXcY?". */
export interface ProofResult {
  cell: number;
  digit: number;
  verdict: 'valid' | 'conflict';
  headline: string;
  stages: CoachStage[];
}

/** A hint: one human step with its technique, its marks and an optional coach walkthrough. */
export interface HintResult {
  /** Technique name, e.g. 'Unique Sum Partition (Magic Block)'. */
  name: string;
  type: string;
  /** What to do, e.g. '7 goes in r2c3'. */
  text: string;
  /** One sentence on why the technique works. */
  summary: string;
  /** Guide page on the website (techniques/<slug>.html), if there is one. */
  slug: string | null;
  /** Cells, candidates and chains of the step, ready to draw. */
  marks: StepMarks;
  /** Chains in the usual notation: 3r1c1 = 3r1c5 - ... */
  notation: string[];
  /** Progressive Socratic nudges and board-specific walkthrough stages. */
  coach?: CoachStage[];
}

/** How hard a technique the hint may use: 0 = singles only, 1-5 = up to Trivial ... Extreme. */
export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const HINT_LEVEL_NAMES = [
  'Singles only',
  'Up to Trivial',
  'Up to Easy',
  'Up to Medium',
  'Up to Hard',
  'Up to Extreme',
];

/** The text formats the Copy menu can produce, see `formatKakuro` in the core. */
export type CopyFormat = 'PM_GRID' | 'LIBRARY' | 'VALUES_ONLY' | 'CLUES_ONLY_FORMATTED';

/** One technique used on the way from the givens to the solution (the "solve path"). */
export interface PathEntry {
  name: string;
  type: string;
  slug: string | null;
  count: number;
  /** How hard the technique is. */
  score: number;
}

/** A puzzle handed to the UI. */
export interface PuzzleInfo {
  /** Canonical puzzle string with all clue sums, e.g. `B-d16-d7-...`. */
  puzzle: string;
  /** The unique solution grid (81 entries, 0 for block cells). */
  solution: number[];
  level: number;
  score: number;
  /** The techniques of the solve path, hardest first, then by count. */
  path?: PathEntry[];
  /** Set for puzzles from the bank: its index in the level's list (to avoid repeats). */
  bankIndex?: number;
  /** Set for a Daily Puzzle: the YYYY-MM-DD date string it belongs to. */
  daily?: string;
  /** Name of the layout the puzzle was built on. */
  layout?: string;
}

export type WorkerRequest =
  | { id: number; kind: 'generate'; level: number }
  | { id: number; kind: 'bank'; level: number; seen: number[] }
  | { id: number; kind: 'daily'; date: string; level: number }
  | { id: number; kind: 'analyze'; puzzle: string }
  | { id: number; kind: 'hint'; puzzle: string; values: number[]; cands: number[]; level: HintLevel; disabled: string[] }
  | { id: number; kind: 'allHints'; puzzle: string; values: number[]; cands: number[]; level: HintLevel; disabled: string[] }
  | { id: number; kind: 'path'; puzzle: string; values: number[]; cands: number[] }
  | { id: number; kind: 'prove'; puzzle: string; values: number[]; cands: number[]; cell: number; digit: number }
  | { id: number; kind: 'candidates'; puzzle: string; values: number[] }
  | { id: number; kind: 'format'; puzzle: string; values: number[]; mode: CopyFormat };

export type WorkerResponse =
  | { id: number; kind: 'puzzle'; info: PuzzleInfo }
  | { id: number; kind: 'hint'; hint: HintResult | null }
  | { id: number; kind: 'allHints'; results: HintResult[]; total: Record<string, number> }
  | { id: number; kind: 'path'; steps: HintResult[] }
  | { id: number; kind: 'prove'; proof: ProofResult }
  | { id: number; kind: 'candidates'; cands: number[] }
  | { id: number; kind: 'format'; text: string }
  | { id: number; kind: 'error'; message: string };

export const LEVEL_NAMES = ['', 'Trivial', 'Easy', 'Medium', 'Hard', 'Extreme'];
