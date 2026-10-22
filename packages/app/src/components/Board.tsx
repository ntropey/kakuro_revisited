/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The Kakuro board: block cells with diagonal clue sums, white cells with digits or pencil marks.
 */
import { memo } from 'react';
import { CELL_COUNT, GRID_SIZE, type KakuroCellDef, type StepMarks } from '@kakuro/core';
import { runPeers } from '../game';

export interface BoardProps {
  cells: readonly KakuroCellDef[];
  values: readonly number[];
  notes: readonly number[];
  selected: number;
  /** Shade the other cells of the runs the selected cell belongs to. */
  highlightPeers: boolean;
  /** Shade the other cells that hold the same digit as the selected cell. */
  highlightSameDigit: boolean;
  /** The marks of the current hint, coach stage or proof. */
  marks: StepMarks | null;
  /** The cells that hold a wrong digit. */
  wrong: ReadonlySet<number>;
  onSelect: (cell: number) => void;
}

/** The pencil marks of a cell as a 3x3 grid of digits. */
function PencilMarks({ mask }: { mask: number }) {
  const digits: number[] = [];
  for (let d = 1; d <= 9; d++) if ((mask & (1 << d)) !== 0) digits.push(d);
  if (digits.length === 0) return null;
  const cells: (number | null)[] = [];
  for (let d = 1; d <= 9; d++) cells.push(digits.includes(d) ? d : null);
  return (
    <div className="pencil" aria-label={`candidates ${digits.join(', ')}`}>
      {cells.map((d, i) => (
        <span key={i} className={d === null ? 'off' : ''}>
          {d ?? ''}
        </span>
      ))}
    </div>
  );
}

function BoardInner({
  cells,
  values,
  notes,
  selected,
  highlightPeers,
  highlightSameDigit,
  marks,
  wrong,
  onSelect,
}: BoardProps) {
  const tintA = new Set<number>();
  const tintB = new Set<number>();
  const key = new Map<number, number>();
  const place = new Map<number, number>();
  const elim = new Set<string>();
  const chainCells = new Set<number>();
  if (marks) {
    for (const t of marks.tint) {
      const target = t.tone === 'a' ? tintA : tintB;
      for (const c of t.cells) target.add(c);
    }
    for (const m of marks.key) key.set(m.cell, m.digit);
    for (const m of marks.place) place.set(m.cell, m.digit);
    for (const m of marks.elim) elim.add(`${m.cell}:${m.digit}`);
    for (const chain of marks.chains) for (const m of chain) chainCells.add(m.cell);
  }

  // The peers of the selected cell: the other cells of its Across and Down runs.
  const peers = new Set<number>(
    highlightPeers && selected >= 0 && cells[selected]?.kind === 'white' ? runPeers(cells, selected) : [],
  );
  const sameDigit = new Set<number>();
  if (highlightSameDigit && selected >= 0 && values[selected] > 0) {
    for (let i = 0; i < CELL_COUNT; i++) if (i !== selected && values[i] === values[selected]) sameDigit.add(i);
  }

  const classes: string[] = [];
  if (marks) classes.push('has-marks');

  return (
    <div className={`board ${classes.join(' ')}`} role="group" aria-label="Kakuro board">
      {cells.map((def, i) => {
        if (def.kind === 'block') {
          const hasAcross = (def.across ?? 0) > 0;
          const hasDown = (def.down ?? 0) > 0;
          const clueAria: string[] = [];
          if (hasDown) clueAria.push(`down ${def.down}`);
          if (hasAcross) clueAria.push(`across ${def.across}`);
          return (
            <div
              key={i}
              className={`cell block${hasAcross && hasDown ? ' both' : ''}${!hasAcross && !hasDown ? ' empty' : ''}`}
              role="img"
              aria-label={clueAria.length > 0 ? `Clue: ${clueAria.join(', ')}` : undefined}
              aria-hidden={clueAria.length === 0 ? true : undefined}
            >
              {hasAcross ? <span className="across">{def.across}</span> : null}
              {hasDown ? <span className="down">{def.down}</span> : null}
            </div>
          );
        }
        const value = values[i] ?? 0;
        const noteMask = notes[i] ?? 0;
        const isSelected = i === selected;
        const cls = ['cell', 'white'];
        if (isSelected) cls.push('selected');
        if (peers.has(i)) cls.push('peer');
        if (sameDigit.has(i)) cls.push('same');
        if (tintA.has(i)) cls.push('tint-a');
        if (tintB.has(i)) cls.push('tint-b');
        if (key.has(i)) cls.push('key');
        if (place.has(i)) cls.push('place');
        if (chainCells.has(i)) cls.push('chain');
        if (wrong.has(i)) cls.push('wrong');
        const noteDigits: number[] = [];
        if (!value && noteMask > 0) {
          for (let d = 1; d <= 9; d++) {
            if ((noteMask & (1 << d)) !== 0) noteDigits.push(d);
          }
        }
        const cellLabel = `r${Math.floor(i / GRID_SIZE) + 1}c${(i % GRID_SIZE) + 1}${
          value ? ` ${value}` : noteDigits.length > 0 ? ` notes ${noteDigits.join(' ')}` : ' empty'
        }`;
        return (
          <button
            key={i}
            type="button"
            className={cls.join(' ')}
            aria-label={cellLabel}
            onClick={() => onSelect(i)}
          >
            {value > 0 ? (
              <span className="value">{value}</span>
            ) : (
              <PencilMarks mask={noteMask} />
            )}
            {marks && [...elim].some((e) => e.startsWith(`${i}:`)) ? (
              <span className="elim-mark" aria-hidden="true">
                ×
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export const Board = memo(BoardInner);
