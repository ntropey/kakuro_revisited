/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * A render smoke test: every panel must draw without throwing.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseKakuro } from '@kakuro/core';
import { Board } from '../src/components/Board';
import { BottomSheet } from '../src/components/BottomSheet';
import { CoachPanel } from '../src/components/CoachPanel';
import { CombinationHelper } from '../src/components/CombinationHelper';
import { DailyShare } from '../src/components/DailyShare';
import { DigitPad } from '../src/components/DigitPad';
import { HintsPanel } from '../src/components/HintsPanel';
import { IdlePanel } from '../src/components/IdlePanel';
import { PathPanel } from '../src/components/PathPanel';
import { ProofPanel } from '../src/components/ProofPanel';
import { SettingsSheet } from '../src/components/SettingsSheet';
import { SolvedDialog } from '../src/components/SolvedDialog';
import { TopBar } from '../src/components/TopBar';
import { DEFAULT_SETTINGS } from '../src/ui';
import type { HintResult } from '../src/protocol';

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

const { givens, board } = parseKakuro(SOLUTION_GRID);
const noop = () => {};

const EMPTY_MARKS = { key: [], fins: [], elim: [], place: [], colors: [], tint: [], chains: [], digits: [] };

const hint: HintResult = {
  name: 'Cross-Run Intersection',
  type: 'CROSS_INTERSECTION',
  summary: 'A cell sits in two runs, so its digit must be in both.',
  slug: 'cross-run-intersection',
  text: 'Only 9 fits both runs.',
  notation: ['r2c2 = 9'],
  marks: {
    tint: [{ cells: [10, 11], tone: 'a' }],
    key: [{ cell: 10, digit: 9 }],
    place: [{ cell: 10, digit: 9 }],
    elim: [],
    fins: [],
    colors: [],
    chains: [],
    digits: [9],
  },
  coach: [
    { label: 'Look', text: 'Read the two runs through r2c2.', marks: EMPTY_MARKS },
    { label: 'Conclude', text: 'Only 9 is in both.', marks: EMPTY_MARKS },
  ],
};

describe('Component rendering', () => {
  it('draws the board with its clues', () => {
    const html = renderToStaticMarkup(
      <Board
        cells={board.cells}
        values={new Array(81).fill(0)}
        notes={new Array(81).fill(0)}
        selected={10}
        highlightPeers
        highlightSameDigit
        marks={hint.marks}
        wrong={new Set([11])}
        onSelect={noop}
      />,
    );
    expect(html).toContain('Kakuro board');
    expect(html).toContain('r2c2');
    expect(html).toContain('17');
  });

  it('draws every panel', () => {
    const parts = [
      renderToStaticMarkup(
        <TopBar
          title="Practice"
          level={2}
          levelName="Easy"
          elapsedMs={65_000}
          showTimer
          onNew={noop}
          onDaily={noop}
          onCoach={noop}
          onHints={noop}
          onCombinations={noop}
          onShare={noop}
          onSettings={noop}
        />,
      ),
      renderToStaticMarkup(
        <DigitPad
          counts={{ 1: 2, 9: 0 }}
          notesMode
          disabled={new Set([1])}
          onDigit={noop}
          onErase={noop}
          onToggleNotes={noop}
        />,
      ),
      renderToStaticMarkup(<CoachPanel stages={hint.coach ?? []} index={0} onIndex={noop} onClose={noop} />),
      renderToStaticMarkup(
        <HintsPanel results={[hint]} total={{ 'Cross-Run Intersection': 1 }} busy={false} onPick={noop} onClose={noop} />,
      ),
      renderToStaticMarkup(<PathPanel path={[]} onClose={noop} />),
      renderToStaticMarkup(<SettingsSheet settings={DEFAULT_SETTINGS} onChange={noop} onClose={noop} />),
      renderToStaticMarkup(
        <DailyShare
          info={{
            solution: [...SOLUTION_GRID].map((ch) => (ch === '#' ? 0 : Number(ch))),
            level: 2,
            levelName: 'Easy',
            elapsedMs: 65_000,
            daily: '2026-10-21',
            hintsUsed: 1,
            layout: givens,
          }}
          onClose={noop}
        />,
      ),
      renderToStaticMarkup(
        <SolvedDialog levelName="Easy" elapsedMs={65_000} hintsUsed={0} onShare={noop} onNew={noop} onClose={noop} />,
      ),
      renderToStaticMarkup(<CombinationHelper />),
      renderToStaticMarkup(
        <IdlePanel filled={12} total={40} onCoach={noop} onHints={noop} onCombinations={noop} />,
      ),
      renderToStaticMarkup(
        <ProofPanel
          cell={10}
          cellLabel="r2c2"
          proofLabel="r2c2"
          candidates={[9]}
          busy={false}
          proof={null}
          stageIndex={0}
          onStageIndex={noop}
          onProve={noop}
          onClose={noop}
        />,
      ),
      renderToStaticMarkup(
        <BottomSheet snap="half" onSnap={noop}>
          <p>Panel</p>
        </BottomSheet>,
      ),
    ];
    for (const html of parts) expect(html.length).toBeGreaterThan(40);
  });
});
