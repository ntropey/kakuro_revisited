import { describe, expect, it } from 'vitest';
import { buildShareGrid, buildShareText, whiteCount } from '../src/share';
import { addHistory, HISTORY_CAP, loadSettings, saveSettings, type Store } from '../src/store';
import { DEFAULT_SETTINGS } from '../src/ui';

const SOLUTION = [
  '#########',
  '#91######',
  '#83######',
  '##98###19',
  '##21###27',
  '###98#19#',
  '###29#27#',
  '####379##',
  '####138##',
].join('');

function solutionValues(): number[] {
  return [...SOLUTION].map((ch) => (ch === '#' ? 0 : Number(ch)));
}

describe('Share card', () => {
  it('draws block cells as # and keeps every digit', () => {
    const grid = buildShareGrid(solutionValues());
    const lines = grid.split('\n');
    expect(lines).toHaveLength(9);
    expect(lines[0]).toBe('# # # # # # # # #');
    expect(lines[1]).toBe('# 9 1 # # # # # #');
  });

  it('counts the white cells of a puzzle', () => {
    expect(whiteCount(solutionValues())).toBe(26);
  });

  it('puts the time, the level and the address on the card', () => {
    const text = buildShareText({
      solution: solutionValues(),
      level: 2,
      levelName: 'Easy',
      elapsedMs: 125000,
      hintsUsed: 2,
    });
    expect(text).toContain('Kakuro Revisited');
    expect(text).toContain('Easy · 2:05 · 2 hints');
    expect(text).toContain('https://kakurorevisited.com/play/');
  });

  it('marks a Daily puzzle with its date', () => {
    const text = buildShareText({
      solution: solutionValues(),
      level: 3,
      levelName: 'Medium',
      elapsedMs: 61000,
      daily: '2026-10-21',
      hintsUsed: 0,
    });
    expect(text.split('\n')[0]).toBe('Kakuro Revisited · Daily 2026-10-21');
  });
});

/** A localStorage stub for the store helpers. */
function memoryStore(): Store {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('Store', () => {
  it('falls back to the defaults when nothing is stored', () => {
    expect(loadSettings(memoryStore())).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the settings that were saved', () => {
    const store = memoryStore();
    saveSettings(store, { ...DEFAULT_SETTINGS, theme: 'dark', puzzleLevel: 4 });
    const loaded = loadSettings(store);
    expect(loaded.theme).toBe('dark');
    expect(loaded.puzzleLevel).toBe(4);
    // A setting that was never saved keeps its default.
    expect(loaded.showTimer).toBe(DEFAULT_SETTINGS.showTimer);
  });

  it('survives broken JSON', () => {
    const store = memoryStore();
    store.setItem('kakuro-revisited:settings', '{not json');
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
  });

  it('caps the history at its limit, newest first', () => {
    const store = memoryStore();
    for (let i = 0; i < HISTORY_CAP + 5; i++) {
      addHistory(store, {
        id: `p${i}`,
        puzzle: 'x',
        level: 1,
        score: 10,
        seconds: 60,
        solved: true,
        at: i,
      });
    }
    const list = addHistory(store, {
      id: 'last',
      puzzle: 'x',
      level: 1,
      score: 10,
      seconds: 60,
      solved: true,
      at: 999,
    });
    expect(list).toHaveLength(HISTORY_CAP);
    expect(list[0].id).toBe('last');
  });
});
