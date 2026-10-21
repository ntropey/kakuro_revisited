/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * Settings, shared types and small formatting helpers.
 */

export type ThemeMode = 'auto' | 'light' | 'dark';

/** Everything the player can change in the settings sheet. */
export interface Settings {
  theme: ThemeMode;
  /** Show the elapsed time in the top bar. */
  showTimer: boolean;
  /** Keep the pencil marks in sync with the digits the solver allows. */
  autoNotes: boolean;
  /** Shade the cells of the run the selected cell belongs to. */
  highlightPeers: boolean;
  /** Shade the other cells that hold the same digit as the selected cell. */
  highlightSameDigit: boolean;
  /** Ask before a wrong digit is accepted. */
  confirmOnMistake: boolean;
  /** The hardest technique the hints may use (1..5). */
  hintLevel: number;
  /** The difficulty of a new puzzle (1..5). */
  puzzleLevel: number;
  /** The difficulty of the Daily Puzzle (1..5). */
  dailyLevel: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  showTimer: true,
  autoNotes: true,
  highlightPeers: true,
  highlightSameDigit: true,
  confirmOnMistake: false,
  hintLevel: 5,
  puzzleLevel: 2,
  dailyLevel: 2,
};

export const SETTINGS_KEY = 'kakuro-revisited:settings';
export const GAME_KEY = 'kakuro-revisited:game';
export const HISTORY_KEY = 'kakuro-revisited:history';
export const STATS_KEY = 'kakuro-revisited:stats';
/** The bank puzzles the player has already seen, per level. */
export const SEEN_KEY = 'kakuro-revisited:seen';

export const LEVEL_NAMES = ['', 'Trivial', 'Easy', 'Medium', 'Hard', 'Extreme'];

/** The level of a puzzle as a readable name. */
export function levelName(level: number): string {
  return LEVEL_NAMES[Math.min(5, Math.max(1, Math.round(level)))] ?? 'Easy';
}

/** Format milliseconds as `m:ss`, or `h:mm:ss` from one hour on. */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** The local date as `YYYY-MM-DD`, used for the Daily Puzzle. */
export function todayString(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
