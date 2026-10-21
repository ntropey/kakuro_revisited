/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * Symbolic AI Coach and Contradiction Prover built on @kakuro/core.
 *
 * Turns a human step into a progressive four stage walkthrough ("Where to look", "The pattern",
 * "The logic", "Conclusion") and turns a candidate digit into a proof that it cannot work.
 */
import {
  cellName,
  emptyMarks,
  formatPartition,
  maskToDigits,
  type KakuroBoard,
  type KakuroRun,
  type SolutionStep,
  type StepMark,
  type StepMarks,
} from '@kakuro/core';
import type { CoachStage } from './protocol';

/** The run of the board the step worked on, if any. */
function stepRun(board: KakuroBoard, step: SolutionStep): KakuroRun | null {
  const id = step.runs.find((r) => r !== undefined && r !== null);
  return id === undefined ? null : (board.runs[id] ?? null);
}

/** The Across and Down run a cell belongs to. */
function runsOf(board: KakuroBoard, cell: number): { across: KakuroRun | null; down: KakuroRun | null } {
  return board.runsForCell(cell);
}

/** "r2c3" and friends, but with the grid coordinates. */
function cellLabel(cell: number): string {
  return cellName(cell);
}

function listCells(cells: readonly number[]): string {
  return cells.map(cellLabel).join(', ');
}

/** The digits of a mark list, without repeats, in ascending order. */
function markDigits(marks: readonly StepMark[]): number[] {
  return [...new Set(marks.map((m) => m.digit))].sort((a, b) => a - b);
}

/** The cells of a mark list, without repeats. */
function markCells(marks: readonly StepMark[]): number[] {
  return [...new Set(marks.map((m) => m.cell))];
}

/**
 * Build a progressive four stage Socratic walkthrough for `step`.
 *
 * Every stage repeats less than the next one: the first stage only says where to look, the
 * second shows the pattern, the third explains the logic and the last one gives the answer.
 */
export function buildCoachStages(
  step: SolutionStep,
  board: KakuroBoard,
  marks: StepMarks,
  summary: string,
): CoachStage[] {
  const t = step.type;
  const place = marks.place[0] ?? null;
  const elimCells = markCells(marks.elim);
  const elimDigits = markDigits(marks.elim);
  const keyCells = markCells(marks.key);
  const run = stepRun(board, step);

  // Stage 1: only tint, so the player knows where to scan without seeing the answer.
  const focusCells = run ? [...run.cells] : place ? [place.cell] : keyCells;
  const stage1Marks: StepMarks = {
    ...emptyMarks(marks.digits),
    tint: marks.tint.length > 0 ? marks.tint : focusCells.length ? [{ cells: focusCells, tone: 'a' }] : [],
  };

  // Stage 2: the pattern, the cells and digits that matter.
  const stage2Marks: StepMarks = {
    ...emptyMarks(marks.digits),
    tint: stage1Marks.tint,
    key: marks.key,
  };

  // Stage 3: the same, plus the chains.
  const stage3Marks: StepMarks = { ...stage2Marks, chains: marks.chains };

  let where = 'Start with the runs that touch the empty cells.';
  let pattern = 'Look at the candidates that are left.';
  let logic = summary;
  let conclusion = 'Write the digit in the highlighted cell.';

  switch (t) {
    case 'FULL_RUN': {
      const cell = place?.cell ?? keyCells[0] ?? -1;
      const digit = place?.digit ?? 0;
      const st = run ? board.runState(run) : null;
      where = run
        ? `Find the run that is almost full: ${run.label} has only one empty cell left.`
        : 'Find the run that is almost full.';
      pattern = `Every cell of ${run?.label ?? 'the run'} is filled except ${cellLabel(cell)}.`;
      logic =
        st && run
          ? `${run.label} must add up to ${run.sum}. The digits already in it are ${
              st.placedCells.map((c) => board.values[c]).join(' + ') || 'none'
            }, so the last cell must hold ${run.sum} - ${st.placedSum} = ${digit}.`
          : summary;
      conclusion = `Write ${digit} in ${cellLabel(cell)}.`;
      break;
    }
    case 'NAKED_SINGLE': {
      const cell = place?.cell ?? -1;
      const digit = place?.digit ?? 0;
      const { across, down } = runsOf(board, cell);
      where = `Check ${cellLabel(cell)}: which digits are still possible there?`;
      pattern = `Every other digit has been crossed out in ${cellLabel(cell)}.`;
      logic =
        `${cellLabel(cell)} sits in ${across?.label ?? 'an across run'} and ${down?.label ?? 'a down run'}. ` +
        `The digits those runs still allow leave ${digit} as the only possibility for ${cellLabel(cell)}.`;
      conclusion = `Write ${digit} in ${cellLabel(cell)}.`;
      break;
    }
    case 'MAGIC_BLOCK': {
      const digits = marks.digits;
      where = run
        ? `Look at ${run.label}: how many ways are there to make its sum?`
        : 'Look at the highlighted run.';
      pattern = `There is only one way to fill the run: ${formatPartition(digits)}.`;
      logic = summary;
      conclusion = elimCells.length
        ? `Cross out ${elimDigits.join(', ')} in ${listCells(elimCells)}.`
        : 'No candidate needs to be crossed out.';
      break;
    }
    case 'CROSS_INTERSECTION': {
      const cell = place?.cell ?? keyCells[0] ?? -1;
      const { across, down } = runsOf(board, cell);
      where = `Look at the cell ${cellLabel(cell)} and at the two runs that cross there.`;
      pattern = `${across?.label ?? 'The across run'} and ${down?.label ?? 'the down run'} share only one digit.`;
      logic = summary;
      conclusion = place
        ? `Write ${place.digit} in ${cellLabel(place.cell)}.`
        : elimCells.length
          ? `Cross out ${elimDigits.join(', ')} in ${listCells(elimCells)}.`
          : 'Nothing to write yet.';
      break;
    }
    case 'HIDDEN_SINGLE_RUN':
    case 'MANDATORY_DIGIT': {
      const cell = place?.cell ?? -1;
      const digit = place?.digit ?? 0;
      where = run ? `Look at every empty cell of ${run.label}.` : 'Look at the empty cells of the run.';
      pattern = `The digit ${digit} can only be written in ${cellLabel(cell)}.`;
      logic = summary;
      conclusion = `Write ${digit} in ${cellLabel(cell)}.`;
      break;
    }
    case 'SUM_BOUNDS': {
      where = run ? `Look at the remaining sum of ${run.label}.` : 'Look at the remaining sum of the run.';
      pattern = 'The other empty cells bound how much this cell can hold.';
      logic = summary;
      conclusion = elimCells.length
        ? `Cross out ${elimDigits.join(', ')} in ${listCells(elimCells)}.`
        : 'No candidate needs to be crossed out.';
      break;
    }
    case 'NAKED_PAIR':
    case 'NAKED_TRIPLE':
    case 'HIDDEN_PAIR':
    case 'HIDDEN_TRIPLE': {
      const size = t.endsWith('TRIPLE') ? 3 : 2;
      where = run ? `Look for ${size} cells in ${run.label} that share the same digits.` : 'Look for the cells that share their digits.';
      pattern = `${size} cells can only hold ${formatPartition(markDigits(marks.key))}.`;
      logic = summary;
      conclusion = elimCells.length
        ? `Cross out ${elimDigits.join(', ')} in the other cells of the run.`
        : 'Nothing to cross out.';
      break;
    }
    case 'FORCED_COMBINATION': {
      where = run ? `Look at ${run.label} and try to fit its digits into the cells.` : 'Look at the run.';
      pattern = 'Only one arrangement of the digits fits the cells.';
      logic = summary;
      conclusion = elimCells.length
        ? `Cross out ${elimDigits.join(', ')} in ${listCells(elimCells)}.`
        : 'No candidate needs to be crossed out.';
      break;
    }
    case 'LOCKED_SUM_RESIDUAL': {
      where = 'Look at two runs that still need the same sum.';
      pattern = 'Both runs are waiting for the same digits.';
      logic = summary;
      conclusion = place ? `Write ${place.digit} in ${cellLabel(place.cell)}.` : 'Follow the marks.';
      break;
    }
    case 'CONTRADICTION_CHAIN': {
      where = 'Pick the cell and the digit you are unsure about.';
      pattern = 'Assume the digit and follow the forced steps.';
      logic = summary;
      conclusion = elimCells.length
        ? `Cross out ${elimDigits.join(', ')} in ${listCells(elimCells)}.`
        : 'Follow the marks.';
      break;
    }
    default:
      break;
  }

  return [
    { label: 'Where to look', text: where, marks: stage1Marks },
    { label: 'The pattern', text: pattern, marks: stage2Marks },
    { label: 'The logic', text: logic, marks: stage3Marks },
    { label: 'Conclusion', text: conclusion, marks },
  ];
}

/**
 * Build the walkthrough of a contradiction proof.
 *
 * The proof shows the assumption, the digits it forces, the conflict that follows and the
 * conclusion, so the player can check every link of the argument.
 */
export function buildProofStages(
  result: {
    cell: number;
    digit: number;
    valid: boolean;
    reason: string;
    chain: StepMark[];
    conflictCells: number[];
  },
  board: KakuroBoard,
): CoachStage[] {
  const { cell, digit, valid, reason, chain, conflictCells } = result;
  const assumption: StepMark = { cell, digit };
  const forced = chain.slice(1);

  const stage1: CoachStage = {
    label: 'The assumption',
    text: `Suppose ${digit} goes into ${cellLabel(cell)}.`,
    marks: { ...emptyMarks([digit]), key: [assumption], tint: [{ cells: [cell], tone: 'a' }] },
  };

  const stage2: CoachStage = {
    label: 'What it forces',
    text: forced.length
      ? `Then the puzzle forces ${forced
          .map((m) => `${m.digit} in ${cellLabel(m.cell)}`)
          .join(', ')}, step by step.`
      : 'Nothing else is forced yet, so the contradiction has to come from the sums.',
    marks: {
      ...emptyMarks([digit]),
      key: [assumption, ...forced],
      tint: [{ cells: [cell, ...forced.map((m) => m.cell)], tone: 'a' }],
    },
  };

  const stage3: CoachStage = {
    label: 'The conflict',
    text: valid ? 'Everything still fits, so the digit is possible.' : `But this is impossible: ${reason}.`,
    marks: {
      ...emptyMarks([digit]),
      key: [assumption, ...forced],
      tint: conflictCells.length ? [{ cells: conflictCells, tone: 'b' }] : [],
      elim: valid ? [] : conflictCells.map((c) => ({ cell: c, digit: board.values[c] ?? 0 })),
    },
  };

  const stage4: CoachStage = {
    label: 'Conclusion',
    text: valid
      ? `${digit} in ${cellLabel(cell)} keeps the puzzle solvable, so it stays a candidate.`
      : `So ${digit} cannot be written in ${cellLabel(cell)}.`,
    marks: {
      ...emptyMarks([digit]),
      key: [assumption, ...forced],
      elim: valid ? [] : [{ cell, digit }],
      tint: conflictCells.length ? [{ cells: conflictCells, tone: 'b' }] : [],
    },
  };

  return [stage1, stage2, stage3, stage4];
}

/** The candidates of a cell as a list of digits, used by the proof dialog. */
export function candidatesOf(board: KakuroBoard, cell: number): number[] {
  return maskToDigits(board.cands[cell]);
}
