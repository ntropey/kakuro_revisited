/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * Gets a puzzle from the solver worker: a generated one, one from the bank or the Daily Puzzle.
 * A fresh visit with no saved game loads one straight away.
 */
import { useCallback, useEffect } from 'react';
import type { PuzzleInfo } from '../protocol';
import { isCancelled, type SolverClient } from '../solverClient';
import { loadSeen, saveSeen } from '../store';
import { todayString, type Settings } from '../ui';

export interface PuzzleLoaderOptions {
  settings: Settings;
  getClient: () => SolverClient;
  setBusy: (busy: boolean) => void;
  setStatus: (status: string) => void;
  /** True when a saved game was restored, so no first puzzle is needed. */
  hasGame: boolean;
  startPuzzle: (info: PuzzleInfo) => void;
}

export function usePuzzleLoader({ settings, getClient, setBusy, setStatus, hasGame, startPuzzle }: PuzzleLoaderOptions) {
  const loadPuzzle = useCallback(
    async (kind: 'new' | 'daily' | 'bank') => {
      setBusy(true);
      setStatus('Finding a puzzle…');
      try {
        let info: PuzzleInfo;
        if (kind === 'daily') {
          info = await getClient().daily(todayString(), settings.dailyLevel);
        } else if (kind === 'bank') {
          const seen = loadSeen(window.localStorage);
          const key = String(settings.puzzleLevel);
          const used = seen[key] ?? [];
          info = await getClient().fromBank(settings.puzzleLevel, used);
          if (info.bankIndex !== undefined) {
            saveSeen(window.localStorage, { ...seen, [key]: [...new Set([...used, info.bankIndex])] });
          }
        } else {
          info = await getClient().generate(settings.puzzleLevel);
        }
        startPuzzle(info);
      } catch (e) {
        if (!isCancelled(e)) setStatus(e instanceof Error ? e.message : 'The puzzle could not be loaded.');
      } finally {
        setBusy(false);
      }
    },
    [getClient, settings.dailyLevel, settings.puzzleLevel, setBusy, setStatus, startPuzzle],
  );

  // The first puzzle of a fresh visit.
  useEffect(() => {
    if (hasGame) return;
    // The Daily Puzzle can be linked directly: /play/?daily=1
    const daily = new URLSearchParams(window.location.search).get('daily') === '1';
    void loadPuzzle(daily ? 'daily' : 'new');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { loadPuzzle };
}
