/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The app shell: it wires the game session, the solver tools and the panels to the screen.
 */
import { useRef, useState } from 'react';
import { Board } from './components/Board';
import { BottomSheet } from './components/BottomSheet';
import { DigitPad } from './components/DigitPad';
import { PanelHost } from './components/PanelHost';
import { SolvedDialog } from './components/SolvedDialog';
import { TopBar } from './components/TopBar';
import { useBoardView } from './hooks/useBoardView';
import { useGameSession } from './hooks/useGameSession';
import { useKeyboardPlay } from './hooks/useKeyboardPlay';
import { useMediaQuery } from './hooks/useMediaQuery';
import { usePanel } from './hooks/usePanel';
import { useRecords } from './hooks/useRecords';
import { useSettings } from './hooks/useSettings';
import { useSolverClient } from './hooks/useSolverClient';
import { useSolverTools } from './hooks/useSolverTools';
import { levelName } from './ui';

export function App() {
  const getClient = useSolverClient();
  const { settings, onSettings } = useSettings();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const wide = useMediaQuery('(min-width: 960px)');
  const { panel, snap, setSnap, openPanel, closePanel } = usePanel(wide);

  // The session starts puzzles and the tools hold what a puzzle showed, so the session reaches the
  // tools through a ref that is filled in below.
  const resetTools = useRef(() => {});
  const records = useRecords();
  const session = useGameSession({
    settings,
    getClient,
    setBusy,
    setStatus,
    onPuzzleStart: () => resetTools.current(),
    onSolved: records.recordSolved,
  });
  const { game, cells, elapsedMs } = session;
  const tools = useSolverTools({ getClient, game, settings, openPanel, setBusy, setStatus });
  resetTools.current = tools.reset;

  useKeyboardPlay({
    cells,
    getGame: session.getGame,
    onDigit: session.onDigit,
    onErase: session.onErase,
    onSelect: session.onSelect,
    onToggleNotes: session.onToggleNotes,
  });

  const onApplyCoach = () => {
    if (!game || !tools.marks) return;
    session.applyMarks(tools.marks);
    closePanel();
    tools.setMarks(null);
  };

  const { counts, disabledDigits, wrong } = useBoardView(game, cells);

  const title = game?.daily ? `Daily ${game.daily}` : 'Practice';
  // While the bottom sheet is pulled up, the page keeps room below the board so it can scroll clear.
  const sheetOpen = !!panel && !wide && snap !== 'peek';

  const panelContent = (
    <PanelHost
      panel={panel}
      game={game}
      cells={cells}
      elapsedMs={elapsedMs}
      settings={settings}
      tools={tools}
      records={records}
      onSettings={onSettings}
      onOpen={openPanel}
      onClose={closePanel}
      onApplyCoach={onApplyCoach}
    />
  );

  return (
    <div className={`app${sheetOpen ? ' sheet-open' : ''}`}>
      <TopBar
        title={title}
        level={game?.level ?? settings.puzzleLevel}
        levelName={levelName(game?.level ?? settings.puzzleLevel)}
        elapsedMs={elapsedMs}
        showTimer={settings.showTimer}
        onNew={() => void session.loadPuzzle('new')}
        onDaily={() => void session.loadPuzzle('daily')}
        onCoach={() => void tools.openCoach()}
        onHints={() => void tools.openHints()}
        onCombinations={() => openPanel('combinations')}
        onStats={() => openPanel('stats')}
        onShare={() => openPanel('share')}
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
                marks={tools.marks}
                wrong={wrong}
                onSelect={session.onSelect}
              />
              <div className="board-tools">
                <button type="button" onClick={session.onUndo} disabled={game.past.length === 0}>
                  Undo
                </button>
                <button type="button" onClick={session.onRedo} disabled={game.future.length === 0}>
                  Redo
                </button>
                <button type="button" onClick={session.onClearNotes}>
                  Clear notes
                </button>
                <button type="button" onClick={tools.openProve}>
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
                onDigit={session.onDigit}
                onErase={session.onErase}
                onToggleNotes={session.onToggleNotes}
              />
            </>
          ) : (
            <p className="empty">Loading the puzzle…</p>
          )}
          {status ? <p className="status">{status}</p> : null}
          {busy ? <p className="status">Working…</p> : null}
        </section>

        <aside className="side-area">
          <div className="side-panel">{wide ? panelContent : null}</div>
        </aside>
      </main>

      {panel && !wide ? (
        <BottomSheet snap={snap} onSnap={setSnap}>
          {panelContent}
        </BottomSheet>
      ) : null}

      {session.solved ? (
        <SolvedDialog
          levelName={levelName(game?.level ?? 1)}
          elapsedMs={elapsedMs}
          hintsUsed={game?.hintsUsed ?? 0}
          daily={game?.daily}
          newBest={records.lastSolve?.newBest}
          streak={records.lastSolve?.streak}
          onShare={() => openPanel('share')}
          onNew={() => void session.loadPuzzle('new')}
          onClose={() => session.setSolved(false)}
        />
      ) : null}
    </div>
  );
}
