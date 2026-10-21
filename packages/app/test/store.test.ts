import { describe, expect, it } from 'vitest';
import { CELL_COUNT, parseKakuro } from '@kakuro/core';
import { createGame, placeDigit, selectCell } from '../src/game';
import type { PuzzleInfo } from '../src/protocol';
import {
  activeStreak,
  historyId,
  loadGame,
  loadHistory,
  loadSeen,
  loadStats,
  recordSolve,
  restoreGame,
  saveGame,
  saveSeen,
  type SolveInput,
  type Store,
} from '../src/store';

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

function solve(overrides: Partial<SolveInput> = {}): SolveInput {
  return {
    puzzle: 'puzzle-a',
    level: 2,
    score: 500,
    seconds: 120,
    hintsUsed: 0,
    today: '2026-10-21',
    at: 1,
    ...overrides,
  };
}

describe('Recording a solve', () => {
  it('counts a puzzle in the history and the statistics', () => {
    const store = memoryStore();
    const rec = recordSolve(store, solve({ hintsUsed: 2 }));
    expect(rec.recorded).toBe(true);
    expect(rec.newBest).toBe(false);
    expect(rec.stats.solved).toBe(1);
    expect(rec.stats.bestSeconds).toBe(120);
    expect(rec.stats.byLevel[2]).toBe(1);
    const [entry] = loadHistory(store);
    expect(entry).toMatchObject({ id: historyId('puzzle-a'), level: 2, seconds: 120, solved: true, hintsUsed: 2 });
  });

  it('counts a puzzle once, however often it is finished', () => {
    const store = memoryStore();
    recordSolve(store, solve());
    const again = recordSolve(store, solve({ seconds: 5 }));
    expect(again.recorded).toBe(false);
    expect(again.newBest).toBe(false);
    expect(loadStats(store).solved).toBe(1);
    expect(loadStats(store).bestSeconds).toBe(120);
    expect(loadHistory(store)).toHaveLength(1);
  });

  it('reports a new best time only after a first one exists', () => {
    const store = memoryStore();
    expect(recordSolve(store, solve({ puzzle: 'a', seconds: 100 })).newBest).toBe(false);
    expect(recordSolve(store, solve({ puzzle: 'b', seconds: 90 })).newBest).toBe(true);
    expect(recordSolve(store, solve({ puzzle: 'c', seconds: 95 })).newBest).toBe(false);
    expect(loadStats(store).bestSeconds).toBe(90);
  });

  it('builds a Daily streak over consecutive days and restarts it after a gap', () => {
    const store = memoryStore();
    const daily = (date: string) => recordSolve(store, solve({ puzzle: `d-${date}`, daily: date, today: date }));
    expect(daily('2026-10-19').streak).toBe(1);
    expect(daily('2026-10-20').streak).toBe(2);
    expect(daily('2026-10-21').streak).toBe(3);
    expect(daily('2026-10-23').streak).toBe(1);
  });

  it('lets only the first solve of a Daily date move the streak', () => {
    const store = memoryStore();
    recordSolve(store, solve({ puzzle: 'd1', daily: '2026-10-20', today: '2026-10-20' }));
    recordSolve(store, solve({ puzzle: 'd2', daily: '2026-10-21', today: '2026-10-21' }));
    // another puzzle for the same date, for instance after changing the Daily level
    const extra = recordSolve(store, solve({ puzzle: 'd2-hard', daily: '2026-10-21', today: '2026-10-21' }));
    expect(extra.recorded).toBe(true);
    expect(extra.streak).toBe(2);
    expect(loadStats(store).solved).toBe(3);
  });

  it('credits a Daily finished after midnight to its own date', () => {
    const store = memoryStore();
    recordSolve(store, solve({ puzzle: 'd1', daily: '2026-10-20', today: '2026-10-20' }));
    const late = recordSolve(store, solve({ puzzle: 'd2', daily: '2026-10-21', today: '2026-10-22' }));
    expect(late.stats.dailyStreak).toBe(2);
  });

  it('does not let practice puzzles touch the streak', () => {
    const store = memoryStore();
    recordSolve(store, solve({ puzzle: 'p1' }));
    expect(loadStats(store).dailyStreak).toBe(0);
    expect(activeStreak(store, '2026-10-21')).toBe(0);
  });

  it('lets the streak lapse in what it shows once a day is missed', () => {
    const store = memoryStore();
    recordSolve(store, solve({ puzzle: 'd1', daily: '2026-10-20', today: '2026-10-20' }));
    expect(activeStreak(store, '2026-10-20')).toBe(1);
    expect(activeStreak(store, '2026-10-21')).toBe(1);
    expect(activeStreak(store, '2026-10-22')).toBe(0);
  });
});
