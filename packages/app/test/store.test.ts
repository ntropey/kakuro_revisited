import { describe, expect, it } from 'vitest';
import { CELL_COUNT, parseKakuro } from '@kakuro/core';
import { createGame, placeDigit, selectCell } from '../src/game';
import type { PuzzleInfo } from '../src/protocol';
import { loadGame, loadSeen, restoreGame, saveGame, saveSeen, type Store } from '../src/store';

const SOLUTION_GRID = [
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

function sampleInfo(): PuzzleInfo {
  const { givens } = parseKakuro(SOLUTION_GRID);
  return {
    puzzle: givens,
    solution: [...SOLUTION_GRID].map((ch) => (ch === '#' ? 0 : Number(ch))),
    level: 3,
    score: 640,
    path: [{ name: 'Naked Single', type: 'NAKED_SINGLE', slug: null, count: 2, score: 10 }],
    daily: '2026-10-21',
    layout: 'Mosaic',
  };
}

/** A Store backed by a Map, so the tests never touch a real localStorage. */
function memoryStore(): Store & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('Saved game', () => {
  it('round-trips a game through the store', () => {
    const store = memoryStore();
    const game = createGame(sampleInfo());
    selectCell(game, 10);
    placeDigit(game, 9);
    game.hintsUsed = 2;
    game.notes[11] = 0b110;
    saveGame(store, game, 61_500);

    const saved = loadGame(store);
    expect(saved).not.toBeNull();
    const back = restoreGame(saved!);
    expect(back.puzzle).toBe(game.puzzle);
    expect(back.values).toEqual(game.values);
    expect(back.notes).toEqual(game.notes);
    expect(back.solution).toEqual(game.solution);
    expect(back.hintsUsed).toBe(2);
    expect(back.elapsedMs).toBe(61_500);
    expect(back.daily).toBe('2026-10-21');
    expect(back.layout).toBe('Mosaic');
    expect(back.path).toEqual(game.path);
    // the undo history is not stored
    expect(back.past).toEqual([]);
  });

  it('keeps the storage keys that earlier versions wrote', () => {
    const store = memoryStore();
    saveGame(store, createGame(sampleInfo()));
    saveSeen(store, { '2': [4] });
    expect([...store.data.keys()].sort()).toEqual(['kakuro-revisited:game', 'kakuro-revisited:seen']);
  });

  it('uses the game clock unless the live clock is given', () => {
    const store = memoryStore();
    const game = createGame(sampleInfo());
    game.elapsedMs = 5_000;
    saveGame(store, game);
    expect(loadGame(store)!.elapsedMs).toBe(5_000);
  });

  it('ignores a stored game that does not fit the board', () => {
    const store = memoryStore();
    expect(loadGame(store)).toBeNull();
    store.setItem('kakuro-revisited:game', 'not json');
    expect(loadGame(store)).toBeNull();
    store.setItem('kakuro-revisited:game', '');
    expect(loadGame(store)).toBeNull();
    const short = { puzzle: 'x', values: [1, 2], solution: new Array(CELL_COUNT).fill(0) };
    store.setItem('kakuro-revisited:game', JSON.stringify(short));
    expect(loadGame(store)).toBeNull();
    const noSolution = { puzzle: 'x', values: new Array(CELL_COUNT).fill(0) };
    store.setItem('kakuro-revisited:game', JSON.stringify(noSolution));
    expect(loadGame(store)).toBeNull();
  });

  it('fills in what an older save did not store', () => {
    const info = sampleInfo();
    const old = { puzzle: info.puzzle, values: new Array(CELL_COUNT).fill(0), solution: info.solution } as never;
    const game = restoreGame(old);
    expect(game.level).toBe(1);
    expect(game.score).toBe(0);
    expect(game.path).toEqual([]);
    expect(game.hintsUsed).toBe(0);
    expect(game.elapsedMs).toBe(0);
    expect(game.notes.every((n) => n === 0)).toBe(true);
  });
});

describe('Seen bank puzzles', () => {
  it('starts empty and remembers what was stored', () => {
    const store = memoryStore();
    expect(loadSeen(store)).toEqual({});
    saveSeen(store, { '1': [0, 3], '2': [7] });
    expect(loadSeen(store)).toEqual({ '1': [0, 3], '2': [7] });
  });
});
