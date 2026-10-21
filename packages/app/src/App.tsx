/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The app shell: the board, the digit pad and the panels.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CELL_COUNT, parseKakuro, type StepMarks } from '@kakuro/core';
import { Board } from './components/Board';
import { BottomSheet, type Snap } from './components/BottomSheet';
import { CoachPanel } from './components/CoachPanel';
import { CombinationHelper } from './components/CombinationHelper';
import { DailyShare } from './components/DailyShare';
import { DigitPad } from './components/DigitPad';
import { HintsPanel } from './components/HintsPanel';
import { PathPanel } from './components/PathPanel';
import { ProofPanel } from './components/ProofPanel';
import { SettingsSheet } from './components/SettingsSheet';
import { SolvedDialog } from './components/SolvedDialog';
import { TopBar } from './components/TopBar';
import {
  clearNotes,
  cloneGame,
  createGame,
  eraseCell,
  isSolved,
  placeDigit,
  pushHistory,
  redo,
  selectCell,
  setNotesMode,
  toggleNote,
  undo,
  type GameState,
} from './game';
import { isCancelled, SolverClient } from './solverClient';
import type { CoachStage, HintResult, ProofResult } from './protocol';
import { loadSettings, saveSettings } from './store';
import { levelName, todayString, type Settings } from './ui';

type PanelKind = 'coach' | 'hints' | 'combinations' | 'path' | 'share' | 'settings' | 'prove' | null;

/** True while the media query matches, so the panel is drawn once, in the right place. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

const SEEN_KEY = 'kakuro-revisited:seen';

function readSeen(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number[]>) : {};
  } catch {
    return {};
  }
}

function writeSeen(seen: Record<string, number[]>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* the browser does not let us store anything */
  }
}

const GAME_KEY = 'kakuro-revisited:game';

interface SavedGame {
  puzzle: string;
  values: number[];
  notes: number[];
  solution: number[];
  level: number;
  score: number;
  path?: unknown;
  daily?: string;
  layout?: string;
  hintsUsed: number;
  elapsedMs: number;
}

/** The game saved by the last visit, or null when there is none. */
function readSavedGame(): GameState | null {
  try {
    const raw = window.localStorage.getItem(GAME_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<SavedGame>;
    if (!saved.puzzle || !Array.isArray(saved.values) || saved.values.length !== CELL_COUNT) return null;
    if (!Array.isArray(saved.solution) || saved.solution.length !== CELL_COUNT) return null;
    const game = createGame({
      puzzle: saved.puzzle,
      solution: saved.solution,
      level: saved.level ?? 1,
      score: saved.score ?? 0,
      path: (saved.path ?? []) as never,
      daily: saved.daily,
      layout: saved.layout,
    });
    game.values = saved.values.slice();
    if (Array.isArray(saved.notes) && saved.notes.length === CELL_COUNT) game.notes = saved.notes.slice();
    game.hintsUsed = saved.hintsUsed ?? 0;
    game.elapsedMs = saved.elapsedMs ?? 0;
    return game;
  } catch {
    return null;
  }
}

/** Write the game to localStorage, so a reload keeps the work. */
function persistGame(game: GameState, elapsedMs: number): void {
  try {
    window.localStorage.setItem(
      GAME_KEY,
      JSON.stringify({
        puzzle: game.puzzle,
        values: game.values,
        notes: game.notes,
        solution: game.solution,
        level: game.level,
        score: game.score,
        path: game.path,
        daily: game.daily,
        layout: game.layout,
        hintsUsed: game.hintsUsed,
        elapsedMs,
      }),
    );
  } catch {
    /* the browser does not let us store anything */
  }
}

export function App() {
  const clientRef = useRef<SolverClient | null>(null);
  const client = () => {
    if (!clientRef.current) clientRef.current = new SolverClient();
    return clientRef.current;
  };

  const [settings, setSettings] = useState<Settings>(() => loadSettings(window.localStorage));
  const [game, setGame] = useState<GameState | null>(() => readSavedGame());
  const [panel, setPanel] = useState<PanelKind>(null);
  const [snap, setSnap] = useState<Snap>('peek');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [coachStages, setCoachStages] = useState<CoachStage[]>([]);
  const [coachIndex, setCoachIndex] = useState(0);
  const [proof, setProof] = useState<ProofResult | null>(null);
  const [proofIndex, setProofIndex] = useState(0);
  const [proofBusy, setProofBusy] = useState(false);
  const [hints, setHints] = useState<HintResult[]>([]);
  const [hintTotals, setHintTotals] = useState<Record<string, number>>({});
  const [hintsBusy, setHintsBusy] = useState(false);
  const [marks, setMarks] = useState<StepMarks | null>(null);
  const [solved, setSolved] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const wide = useMediaQuery('(min-width: 960px)');
  const startedAt = useRef(Date.now());
  /** The latest game, so a move can act on it without waiting for a render. */
  const gameRef = useRef<GameState | null>(game);
  /** Cells whose pencil marks the player changed by hand; the solver leaves them alone. */
  const editedNotes = useRef<Set<number>>(
    new Set(game ? game.notes.map((mask, i) => (mask ? i : -1)).filter((i) => i >= 0) : []),
  );

  // The timer.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // The theme.
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const cells = useMemo(() => (game ? parseKakuro(game.puzzle).board.cells : []), [game?.puzzle]);

  const elapsedMs = game ? game.elapsedMs + (solved ? 0 : Math.max(0, now - startedAt.current)) : 0;

  const startPuzzle = useCallback(
    (info: { puzzle: string; solution: number[]; level: number; score: number; path?: unknown; daily?: string; layout?: string; bankIndex?: number }) => {
      const next = createGame(info as never);
      gameRef.current = next;
      setGame(next);
      setSolved(false);
      setMarks(null);
      setCoachStages([]);
      setCoachIndex(0);
      setProof(null);
      setProofIndex(0);
      setHints([]);
      setStatus('');
      editedNotes.current = new Set();
      startedAt.current = Date.now();
      setNow(Date.now());
    },
    [],
  );

  const loadPuzzle = useCallback(
    async (kind: 'new' | 'daily' | 'bank') => {
      setBusy(true);
      setStatus('Finding a puzzle…');
      try {
        let info;
        if (kind === 'daily') {
          info = await client().daily(todayString(), settings.dailyLevel);
        } else if (kind === 'bank') {
          const seen = readSeen();
          const key = String(settings.puzzleLevel);
          const used = seen[key] ?? [];
          info = await client().fromBank(settings.puzzleLevel, used);
          if (info.bankIndex !== undefined) {
            const next = { ...seen, [key]: [...new Set([...used, info.bankIndex])] };
            writeSeen(next);
          }
        } else {
          info = await client().generate(settings.puzzleLevel);
        }
        startPuzzle(info);
      } catch (e) {
        if (!isCancelled(e)) setStatus(e instanceof Error ? e.message : 'The puzzle could not be loaded.');
      } finally {
        setBusy(false);
      }
    },
    [settings.dailyLevel, settings.puzzleLevel, startPuzzle],
  );

  // The first puzzle of a fresh visit.
  useEffect(() => {
    if (game) return;
    // The Daily Puzzle can be linked directly: /play/?daily=1
    const daily = new URLSearchParams(window.location.search).get('daily') === '1';
    void loadPuzzle(daily ? 'daily' : 'new');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The game is stored whenever it changes; the clock is topped up when the page is hidden.
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsedMs;
  useEffect(() => {
    if (!game) return;
    persistGame(game, elapsedRef.current);
  }, [game]);

  useEffect(() => {
    const save = () => {
      if (gameRef.current) persistGame(gameRef.current, elapsedRef.current);
    };
    window.addEventListener('pagehide', save);
    document.addEventListener('visibilitychange', save);
    return () => {
      window.removeEventListener('pagehide', save);
      document.removeEventListener('visibilitychange', save);
    };
  }, []);

  /** Apply a change to a copy of the game and return the new state, so the caller can react to it. */
  const update = (fn: (g: GameState) => void): GameState | null => {
    const cur = gameRef.current;
    if (!cur) return null;
    const next = cloneGame(cur);
    fn(next);
    gameRef.current = next;
    setGame(next);
    return next;
  };

  // The pencil marks follow the solver when the setting is on.
  const refreshNotes = useCallback(
    async (g: GameState) => {
      if (!settings.autoNotes) return;
      try {
        const cands = await client().candidates(g.puzzle, g.values);
        update((cur) => {
          for (let i = 0; i < CELL_COUNT; i++) {
            if (cur.values[i] > 0) {
              cur.notes[i] = 0;
              continue;
            }
            if (!settings.autoNotes || editedNotes.current.has(i)) continue;
            cur.notes[i] = cands[i] ?? 0;
          }
        });
      } catch {
        /* the marks are a convenience, not a must */
      }
    },
    [settings.autoNotes],
  );

  const afterMove = useCallback(
    (g: GameState) => {
      if (isSolved(g)) {
        setSolved(true);
        update((cur) => {
          cur.elapsedMs = elapsedMs;
        });
        return;
      }
      void refreshNotes(g);
    },
    [elapsedMs, refreshNotes],
  );

  const onSelect = (cell: number) => {
    update((g) => {
      selectCell(g, cell);
    });
  };

  const onDigit = (digit: number) => {
    if (!game) return;
    if (game.notesMode) {
      update((g) => {
        const cell = g.selected;
        toggleNote(g, digit);
        if (cell >= 0) editedNotes.current.add(cell);
      });
      return;
    }
    const cell = game.selected;
    if (cell < 0) return;
    const wrong = game.solution[cell] > 0 && game.solution[cell] !== digit;
    if (wrong && settings.confirmOnMistake && !window.confirm(`${digit} does not fit in this cell. Write it anyway?`)) {
      return;
    }
    const next = update((g) => {
      placeDigit(g, digit);
    });
    if (next) afterMove(next);
  };

  const onErase = () => {
    const next = update((g) => {
      eraseCell(g);
    });
    if (next) afterMove(next);
  };

  const onUndo = () => {
    update((g) => {
      undo(g);
    });
  };

  const onRedo = () => {
    update((g) => {
      redo(g);
    });
  };

  const onClearNotes = () => {
    update((g) => {
      clearNotes(g);
    });
  };

  // Keyboard play: digits, erase, notes and arrow keys.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        onDigit(Number(e.key));
        return;
      }
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        onErase();
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        update((g) => setNotesMode(g, !g.notesMode));
        return;
      }
      if (!e.key.startsWith('Arrow')) return;
      const current = gameRef.current;
      if (!current) return;
      e.preventDefault();
      const step = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' ? -9 : 9;
      let i = current.selected < 0 ? 0 : current.selected + step;
      while (i >= 0 && i < CELL_COUNT && cells[i]?.kind !== 'white') i += step;
      if (i >= 0 && i < CELL_COUNT) onSelect(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cells, game, onDigit, onErase, onSelect]);

  const openCoach = async () => {
    if (!game) return;
    openPanel('coach');
    setBusy(true);
    try {
      const hint = await client().hint(
        game.puzzle,
        game.values,
        game.cands,
        settings.hintLevel as 0 | 1 | 2 | 3 | 4 | 5,
      );
      setCoachStages(hint?.coach ?? []);
      setCoachIndex(0);
      setMarks(hint?.marks ?? null);
    } catch (e) {
      if (!isCancelled(e)) setStatus(e instanceof Error ? e.message : 'The coach is not available.');
      setCoachStages([]);
    } finally {
      setBusy(false);
    }
  };

  const openHints = async () => {
    if (!game) return;
    openPanel('hints');
    setHintsBusy(true);
    try {
      const res = await client().allHints(
        game.puzzle,
        game.values,
        game.cands,
        settings.hintLevel as 0 | 1 | 2 | 3 | 4 | 5,
      );
      setHints(res.results);
      setHintTotals(res.total);
    } catch (e) {
      if (!isCancelled(e)) setStatus(e instanceof Error ? e.message : 'The hints are not available.');
    } finally {
      setHintsBusy(false);
    }
  };

  const openProve = () => {
    openPanel('prove');
    setProof(null);
    setProofIndex(0);
    setMarks(null);
  };

  const runProve = async (digit: number) => {
    if (!game || game.selected < 0) return;
    setProofBusy(true);
    try {
      const result = await client().prove(game.puzzle, game.values, game.cands, game.selected, digit);
      setProof(result);
      setProofIndex(0);
      setMarks(result.stages[0]?.marks ?? null);
    } catch (e) {
      if (!isCancelled(e)) setStatus(e instanceof Error ? e.message : 'The proof failed.');
    } finally {
      setProofBusy(false);
    }
  };

  const openPanel = (kind: PanelKind) => {
    setPanel(kind);
    if (!wide) setSnap('half');
  };

  const pickHint = (hint: HintResult) => {
    setMarks(hint.marks);
    openPanel('coach');
    setCoachStages(hint.coach ?? []);
    setCoachIndex(0);
  };

  const applyCoach = () => {
    if (!game || !marks) return;
    const next = update((g) => {
      pushHistory(g);
      for (const m of marks.place) {
        if (g.values[m.cell] === 0) g.values[m.cell] = m.digit;
      }
      for (const m of marks.elim) {
        if (g.values[m.cell] === 0) g.notes[m.cell] &= ~(1 << m.digit);
      }
      g.hintsUsed += 1;
    });
    setPanel(null);
    setMarks(null);
    if (next) afterMove(next);
  };

  const openShare = () => {
    openPanel('share');
  };

  const onSettings = (next: Settings) => {
    setSettings(next);
    saveSettings(window.localStorage, next);
  };

  // The counts of the digits that are still to be placed.
  const counts = useMemo(() => {
    const out: Record<number, number> = {};
    if (!game) return out;
    for (let i = 0; i < CELL_COUNT; i++) {
      const v = game.solution[i] ?? 0;
      if (v > 0) out[v] = (out[v] ?? 0) + 1;
    }
    for (let i = 0; i < CELL_COUNT; i++) {
      const v = game.values[i] ?? 0;
      if (v > 0) out[v] = (out[v] ?? 0) - 1;
    }
    return out;
  }, [game]);

  const disabledDigits = useMemo(() => {
    const out = new Set<number>();
    if (!game || game.selected < 0 || cells[game.selected]?.kind !== 'white') return out;
    // Digits that a run of the selected cell already holds can never go in it.
    for (const other of peerCells(cells, game.selected)) {
      const v = game.values[other] ?? 0;
      if (v > 0) out.add(v);
    }
    return out;
  }, [game, cells]);

  const wrongCells = useMemo(() => {
    const out = new Set<number>();
    if (!game) return out;
    for (let i = 0; i < CELL_COUNT; i++) {
      const v = game.values[i] ?? 0;
      if (v > 0 && game.solution[i] > 0 && v !== game.solution[i]) out.add(i);
    }
    return out;
  }, [game]);

  const title = game?.daily ? `Daily ${game.daily}` : 'Practice';

  const panelContent = () => {
    switch (panel) {
      case 'coach':
        return (
          <CoachPanel
            stages={coachStages}
            index={coachIndex}
            onIndex={(i) => {
              setCoachIndex(i);
              setMarks(coachStages[i]?.marks ?? null);
            }}
            onClose={() => {
              setPanel(null);
              setMarks(null);
            }}
            onApply={applyCoach}
          />
        );
      case 'hints':
        return (
          <HintsPanel
            results={hints}
            total={hintTotals}
            busy={hintsBusy}
            onPick={pickHint}
            onClose={() => setPanel(null)}
          />
        );
      case 'combinations':
        return <CombinationHelper />;
      case 'path':
        return <PathPanel path={game?.path ?? []} onClose={() => setPanel(null)} />;
      case 'share':
        return (
          <DailyShare
            info={{
              solution: game?.solution ?? [],
              level: game?.level ?? 1,
              levelName: levelName(game?.level ?? 1),
              elapsedMs,
              daily: game?.daily,
              hintsUsed: game?.hintsUsed ?? 0,
              layout: game?.layout,
            }}
            onClose={() => setPanel(null)}
          />
        );
      case 'settings':
        return <SettingsSheet settings={settings} onChange={onSettings} onClose={() => setPanel(null)} />;
      case 'prove':
        return (
          <ProofPanel
            cell={game?.selected ?? -1}
            cellLabel={cellLabel(game?.selected ?? -1)}
            proofLabel={cellLabel(proof?.cell ?? game?.selected ?? -1)}
            candidates={candidateList(game, cells)}
            busy={proofBusy}
            proof={proof}
            stageIndex={proofIndex}
            onStageIndex={(i) => {
              setProofIndex(i);
              setMarks(proof?.stages[i]?.marks ?? null);
            }}
            onProve={runProve}
            onClose={() => {
              setPanel(null);
              setMarks(null);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <TopBar
        title={title}
        level={game?.level ?? settings.puzzleLevel}
        levelName={levelName(game?.level ?? settings.puzzleLevel)}
        elapsedMs={elapsedMs}
        showTimer={settings.showTimer}
        onNew={() => void loadPuzzle('new')}
        onDaily={() => void loadPuzzle('daily')}
        onCoach={() => void openCoach()}
        onHints={() => void openHints()}
        onCombinations={() => openPanel('combinations')}
        onShare={openShare}
        onSettings={() => openPanel('settings')}
      />

      <main className="layout">
        <section className="board-area">
          {game ? (
            <>
              <Board
                cells={cells}
                values={game.values}
                notes={game.notes}
                selected={game.selected}
                highlightPeers={settings.highlightPeers}
                highlightSameDigit={settings.highlightSameDigit}
                marks={marks}
                wrong={wrongCells}
                onSelect={onSelect}
              />
              <div className="board-tools">
                <button type="button" onClick={onUndo} disabled={game.past.length === 0}>
                  Undo
                </button>
                <button type="button" onClick={onRedo} disabled={game.future.length === 0}>
                  Redo
                </button>
                <button type="button" onClick={onClearNotes}>
                  Clear notes
                </button>
                <button type="button" onClick={openProve}>
                  Why not?
                </button>
                <button type="button" onClick={() => openPanel('path')}>
                  Path
                </button>
              </div>
              <DigitPad
                counts={counts}
                notesMode={game.notesMode}
                disabled={disabledDigits}
                onDigit={onDigit}
                onErase={onErase}
                onToggleNotes={() =>
                  update((g) => {
                    setNotesMode(g, !g.notesMode);
                  })
                }
              />
            </>
          ) : (
            <p className="empty">Loading the puzzle…</p>
          )}
          {status ? <p className="status">{status}</p> : null}
          {busy ? <p className="status">Working…</p> : null}
        </section>

        <aside className="side-area">
          <div className="side-panel">{wide ? panelContent() : null}</div>
        </aside>
      </main>

      {panel && !wide ? (
        <BottomSheet snap={snap} onSnap={setSnap}>
          {panelContent()}
        </BottomSheet>
      ) : null}

      {solved ? (
        <SolvedDialog
          levelName={levelName(game?.level ?? 1)}
          elapsedMs={elapsedMs}
          hintsUsed={game?.hintsUsed ?? 0}
          daily={game?.daily}
          onShare={openShare}
          onNew={() => void loadPuzzle('new')}
          onClose={() => setSolved(false)}
        />
      ) : null}
    </div>
  );
}

/** The cells of the Across and Down runs of a cell. */
function peerCells(cells: readonly { kind: 'block' | 'white' }[], cell: number): number[] {
  const out: number[] = [];
  const row = Math.floor(cell / 9);
  const col = cell % 9;
  for (let c = 0; c < 9; c++) {
    const idx = row * 9 + c;
    if (idx !== cell && cells[idx]?.kind === 'white') out.push(idx);
  }
  for (let r = 0; r < 9; r++) {
    const idx = r * 9 + col;
    if (idx !== cell && cells[idx]?.kind === 'white') out.push(idx);
  }
  return out;
}

function cellLabel(cell: number): string {
  if (cell < 0) return '-';
  return `r${Math.floor(cell / 9) + 1}c${(cell % 9) + 1}`;
}

/** The digits that can still go in the selected cell, for the "Why not?" chooser. */
function candidateList(game: GameState | null, cells: readonly { kind: 'block' | 'white' }[]): number[] {
  if (!game || game.selected < 0 || cells[game.selected]?.kind !== 'white') return [];
  const used = new Set<number>();
  for (const other of peerCells(cells, game.selected)) {
    const v = game.values[other] ?? 0;
    if (v > 0) used.add(v);
  }
  const out: number[] = [];
  for (let d = 1; d <= 9; d++) if (!used.has(d)) out.push(d);
  return out;
}
