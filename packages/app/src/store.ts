/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * Storage helpers for the settings, the running game and the history.
 * Pure: no React, and localStorage is supplied by the caller, so these helpers can be tested with a stub.
 */
import { CELL_COUNT } from '@kakuro/core';
import type { GameState } from './game';
import { GAME_KEY, HISTORY_KEY, SETTINGS_KEY, STATS_KEY, DEFAULT_SETTINGS, type Settings } from './ui';

/** The bits of localStorage the app uses; passed in so the helpers can be tested with a stub. */
export interface Store {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadJson<T>(store: Store, key: string, fallback: T): T {
  try {
    const raw = store.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(store: Store, key: string, value: unknown): void {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode or full: the data just isn't remembered */
  }
}

/** The settings, with the defaults filled in for anything that is missing. */
export function loadSettings(store: Store): Settings {
  const stored = loadJson<Partial<Settings>>(store, SETTINGS_KEY, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(store: Store, settings: Settings): void {
  saveJson(store, SETTINGS_KEY, settings);
}

/** A game as it can be stored: everything but the undo history. */
export interface SavedGame {
  puzzle: string;
  values: number[];
  notes: number[];
  solution: number[];
  level: number;
  score: number;
  path: unknown;
  daily?: string;
  layout?: string;
  hintsUsed: number;
  elapsedMs: number;
}

export function saveGame(store: Store, game: GameState): void {
  const saved: SavedGame = {
    puzzle: game.puzzle,
    values: game.values.slice(),
    notes: game.notes.slice(),
    solution: game.solution.slice(),
    level: game.level,
    score: game.score,
    path: game.path,
    daily: game.daily,
    layout: game.layout,
    hintsUsed: game.hintsUsed,
    elapsedMs: game.elapsedMs,
  };
  saveJson(store, GAME_KEY, saved);
}

export function loadGame(store: Store): SavedGame | null {
  const saved = loadJson<SavedGame | null>(store, GAME_KEY, null);
  if (!saved || !saved.puzzle || !Array.isArray(saved.values)) return null;
  if (saved.values.length !== CELL_COUNT) return null;
  return saved;
}

export function clearGame(store: Store): void {
  try {
    store.setItem(GAME_KEY, '');
  } catch {
    /* ignore */
  }
}

/** One finished puzzle in the history list. */
export interface HistoryEntry {
  id: string;
  puzzle: string;
  level: number;
  score: number;
  seconds: number;
  solved: boolean;
  daily?: string;
  at: number;
}

export const HISTORY_CAP = 50;

/** Add a finished puzzle to the history, newest first. */
export function addHistory(store: Store, entry: HistoryEntry): HistoryEntry[] {
  const list = loadJson<HistoryEntry[]>(store, HISTORY_KEY, []);
  const next = [entry, ...list].slice(0, HISTORY_CAP);
  saveJson(store, HISTORY_KEY, next);
  return next;
}

export function loadHistory(store: Store): HistoryEntry[] {
  return loadJson<HistoryEntry[]>(store, HISTORY_KEY, []);
}

/** The counters shown in the statistics panel. */
export interface Stats {
  solved: number;
  dailyStreak: number;
  bestSeconds: number;
  byLevel: Record<number, number>;
}

export const DEFAULT_STATS: Stats = { solved: 0, dailyStreak: 0, bestSeconds: 0, byLevel: {} };

export function loadStats(store: Store): Stats {
  const stored = loadJson<Partial<Stats>>(store, STATS_KEY, {});
  return { ...DEFAULT_STATS, ...stored, byLevel: { ...DEFAULT_STATS.byLevel, ...(stored.byLevel ?? {}) } };
}

export function saveStats(store: Store, stats: Stats): void {
  saveJson(store, STATS_KEY, stats);
}

/** Count a solved puzzle in the statistics. */
export function recordSolved(store: Store, level: number, seconds: number, isDaily: boolean, today: string): Stats {
  const stats = loadStats(store);
  stats.solved += 1;
  stats.byLevel[level] = (stats.byLevel[level] ?? 0) + 1;
  if (stats.bestSeconds === 0 || seconds < stats.bestSeconds) stats.bestSeconds = seconds;
  if (isDaily) {
    const history = loadHistory(store);
    const yesterday = new Date(`${today}T00:00:00`);
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, '0');
    const d = String(yesterday.getDate()).padStart(2, '0');
    const solvedYesterday = history.some((h) => h.daily === `${y}-${m}-${d}`);
    stats.dailyStreak = solvedYesterday ? stats.dailyStreak + 1 : 1;
  }
  saveStats(store, stats);
  return stats;
}
