/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Human-style logical step finder for Kakuro (Cross Sums).
 */
import {
  CELL_COUNT,
  KakuroBoard,
  type KakuroRun,
  type StepMark,
  type StepMarks,
  cellName,
  emptyMarks,
} from './board';
import {
  ALL_DIGITS_MASK,
  digitBit,
  formatPartition,
  getPartitions,
  hasDigit,
  maskSum,
  maskToDigits,
  popcount,
} from './partitions';
import { analyzeRunCombinations, computeCellSetSumBounds } from './runs';

export type SolutionType =
  | 'FULL_RUN'
  | 'NAKED_SINGLE'
  | 'MAGIC_BLOCK'
  | 'CROSS_INTERSECTION'
  | 'HIDDEN_SINGLE_RUN'
  | 'SUM_BOUNDS'
  | 'MANDATORY_DIGIT'
  | 'NAKED_PAIR'
  | 'HIDDEN_PAIR'
  | 'NAKED_TRIPLE'
  | 'HIDDEN_TRIPLE'
  | 'FORCED_COMBINATION'
  | 'LOCKED_SUM_RESIDUAL'
  | 'CONTRADICTION_CHAIN';

export interface StepConfig {
  readonly type: SolutionType;
  readonly name: string;
  readonly level: number; // 1 = Trivial, 2 = Easy, 3 = Medium, 4 = Hard, 5 = Extreme
  readonly score: number;
  readonly slug: string;
}

export const STEP_CONFIGS: readonly StepConfig[] = [
  { type: 'FULL_RUN', name: 'Last Cell in Run', level: 1, score: 10, slug: 'last-cell-in-run' },
  { type: 'NAKED_SINGLE', name: 'Naked Single', level: 1, score: 15, slug: 'naked-single' },
  { type: 'MAGIC_BLOCK', name: 'Unique Sum Partition (Magic Block)', level: 1, score: 20, slug: 'magic-blocks' },
  { type: 'CROSS_INTERSECTION', name: 'Cross-Run Intersection', level: 1, score: 25, slug: 'cross-run-intersection' },
  { type: 'HIDDEN_SINGLE_RUN', name: 'Hidden Single in Run', level: 2, score: 40, slug: 'hidden-single-in-run' },
  { type: 'SUM_BOUNDS', name: 'Minimum / Maximum Sum Bounds', level: 2, score: 50, slug: 'sum-bounds' },
  { type: 'MANDATORY_DIGIT', name: 'Mandatory Digit in Partition', level: 2, score: 60, slug: 'mandatory-digit' },
  { type: 'NAKED_PAIR', name: 'Naked Pair in Run', level: 3, score: 80, slug: 'naked-subsets-in-run' },
  { type: 'HIDDEN_PAIR', name: 'Hidden Pair in Run', level: 3, score: 90, slug: 'hidden-subsets-in-run' },
  { type: 'NAKED_TRIPLE', name: 'Naked Triple in Run', level: 3, score: 100, slug: 'naked-subsets-in-run' },
  { type: 'HIDDEN_TRIPLE', name: 'Hidden Triple in Run', level: 3, score: 110, slug: 'hidden-subsets-in-run' },
  { type: 'FORCED_COMBINATION', name: 'Partition Matching Elimination', level: 4, score: 140, slug: 'partition-matching' },
  { type: 'LOCKED_SUM_RESIDUAL', name: 'Locked Sum Residual', level: 4, score: 180, slug: 'locked-sum-residual' },
  { type: 'CONTRADICTION_CHAIN', name: 'Contradiction Forcing Step', level: 5, score: 260, slug: 'contradiction-forcing' },
];

export const STEP_CONFIG_MAP = new Map<SolutionType, StepConfig>(
  STEP_CONFIGS.map((c) => [c.type, c]),
);

export interface SolutionStep {
  type: SolutionType;
  name: string;
  level: number;
  score: number;
  slug: string;
  text: string;
  summary: string;
  notation: string[];
  marks: StepMarks;
  indices: number[];
  values: number[];
  runs: number[];
}

function makeStep(
  type: SolutionType,
  opts: {
    text: string;
    summary: string;
    notation: string[];
    marks: StepMarks;
    indices: number[];
    values: number[];
    runs?: number[];
  },
): SolutionStep {
  const cfg = STEP_CONFIG_MAP.get(type)!;
  return {
    type,
    name: cfg.name,
    level: cfg.level,
    score: cfg.score,
    slug: cfg.slug,
    text: `${cfg.name}: ${opts.text}`,
    summary: opts.summary,
    notation: opts.notation,
    marks: opts.marks,
    indices: opts.indices,
    values: opts.values,
    runs: opts.runs ?? [],
  };
}

export class KakuroStepFinder {
  /** Cache of run analyses, keyed by the exact state of the run. */
  private readonly analysisCache = new Map<string, ReturnType<typeof analyzeRunCombinations>>();

  /** Analyse a run, reusing a cached result when the run state did not change. */
  private runAnalysis(board: KakuroBoard, run: KakuroRun) {
    const st = board.runState(run);
    const key = `${run.id}|${st.residualSum}|${st.placedMask}|${st.emptyCells
      .map((c) => board.cands[c])
      .join('.')}`;
    const cached = this.analysisCache.get(key);
    if (cached) return cached;
    const analysis = analyzeRunCombinations(
      st.residualSum,
      st.emptyCells.map((c) => board.cands[c]),
      st.placedMask,
    );
    if (this.analysisCache.size > 20000) this.analysisCache.clear();
    this.analysisCache.set(key, analysis);
    return analysis;
  }

  /**
   * 1. FULL_RUN: Any horizontal or vertical run with exactly 1 empty cell left.
   */
  findAllFullRuns(board: KakuroBoard): SolutionStep[] {
    const steps: SolutionStep[] = [];
    const seenCells = new Set<number>();
    for (const run of board.runs) {
      const st = board.runState(run);
      if (st.emptyCells.length !== 1 || st.hasDuplicate) continue;
      const cell = st.emptyCells[0];
      const digit = st.residualSum;
      if (digit < 1 || digit > 9 || hasDigit(st.placedMask, digit)) continue;
      if (!board.isCandidate(cell, digit)) continue;
      if (seenCells.has(cell)) continue;
      seenCells.add(cell);

      const placedMarks: StepMark[] = st.placedCells.map((c) => ({
        cell: c,
        digit: board.values[c],
      }));
      const placedFormula =
        st.placedCells.length > 0
          ? `${run.sum} - (${st.placedCells.map((c) => board.values[c]).join(' + ')}) = ${digit}`
          : `${run.sum}`;
      const marks: StepMarks = {
        ...emptyMarks([digit]),
        key: placedMarks,
        place: [{ cell, digit }],
        tint: [{ cells: [...run.cells], tone: 'a' }],
      };
      steps.push(
        makeStep('FULL_RUN', {
          text: `${cellName(cell)}=${digit}`,
          summary: `${run.label} has only one empty cell left (${cellName(cell)}), so its digit must be ${placedFormula}.`,
          notation: [`${run.shortLabel}: ${placedFormula} ⇒ ${cellName(cell)}=${digit}`],
          marks,
          indices: [cell],
          values: [digit],
          runs: [run.id],
        }),
      );
    }
    return steps;
  }

  /**
   * 2. NAKED_SINGLE: Any empty white cell that has only 1 candidate bit set in `board.cands`.
   */
  findAllNakedSingles(board: KakuroBoard): SolutionStep[] {
    const steps: SolutionStep[] = [];
    for (let cell = 0; cell < CELL_COUNT; cell++) {
      if (!board.isWhite(cell) || board.values[cell] !== 0) continue;
      const mask = board.cands[cell];
      if (popcount(mask) !== 1) continue;
      const digit = maskToDigits(mask)[0];
      const { across, down } = board.runsForCell(cell);
      const tintCells = [
        ...(across ? across.cells : []),
        ...(down ? down.cells : []),
      ];
      const uniqueTint = [...new Set(tintCells)];
      const marks: StepMarks = {
        ...emptyMarks([digit]),
        key: [{ cell, digit }],
        place: [{ cell, digit }],
        tint: uniqueTint.length ? [{ cells: uniqueTint, tone: 'a' }] : [],
      };
      steps.push(
        makeStep('NAKED_SINGLE', {
          text: `${cellName(cell)}=${digit}`,
          summary: `All other digits have been ruled out from ${cellName(cell)}, leaving ${digit} as its sole remaining candidate.`,
          notation: [`${cellName(cell)}=${digit}`],
          marks,
          indices: [cell],
          values: [digit],
          runs: [across?.id, down?.id].filter((x): x is number => x !== undefined && x !== null),
        }),
      );
    }
    return steps;
  }

  /**
   * 3. MAGIC_BLOCK: A run whose residual sum in `k` empty cells has a unique valid partition
   * (excluding already-placed digits in the run), eliminating any candidate outside that partition.
   */
  findAllMagicBlocks(board: KakuroBoard): SolutionStep[] {
    const steps: SolutionStep[] = [];
    for (const run of board.runs) {
      const st = board.runState(run);
      const k = st.emptyCells.length;
      if (k < 2 || st.hasDuplicate) continue;
      const validParts = getPartitions(k, st.residualSum).filter(
        (p) => (p.mask & st.placedMask) === 0,
      );
      if (validParts.length !== 1) continue;
      const part = validParts[0];
      const elim: StepMark[] = [];
      const key: StepMark[] = [];
      for (const c of st.emptyCells) {
        const cellMask = board.cands[c];
        for (let d = 1; d <= 9; d++) {
          if (!hasDigit(cellMask, d)) continue;
          if (hasDigit(part.mask, d)) {
            key.push({ cell: c, digit: d });
          } else {
            elim.push({ cell: c, digit: d });
          }
        }
      }
      if (elim.length === 0) continue;

      const elimDigits = [...new Set(elim.map((e) => e.digit))].sort((a, b) => a - b);
      const elimCells = [...new Set(elim.map((e) => e.cell))];
      const marks: StepMarks = {
        ...emptyMarks([...part.digits]),
        key,
        elim,
        tint: [{ cells: [...run.cells], tone: 'a' }],
      };
      const isResidual = st.placedCells.length > 0;
      const sumDesc = isResidual
        ? `residual sum ${st.residualSum} in ${k} empty cells of ${run.label}`
        : `${run.sum} in ${k} cells (${run.label})`;
      steps.push(
        makeStep('MAGIC_BLOCK', {
          text: `${sumDesc} = ${formatPartition(part.digits)} ⇒ ${elimCells.map(cellName).join(', ')}<>${elimDigits.join(',')}`,
          summary: `The only way to make ${sumDesc} without repeating digits is ${formatPartition(part.digits)}, so every other candidate in the run can be eliminated.`,
          notation: [
            `${run.shortLabel} (${st.residualSum}/${k}) = ${formatPartition(part.digits)} ⇒ ${elimCells.map(cellName).join(', ')}<>${elimDigits.join(',')}`,
          ],
          marks,
          indices: st.emptyCells,
          values: elimDigits,
          runs: [run.id],
        }),
      );
    }
    return steps;
  }

  /**
   * 4. CROSS_INTERSECTION: A cell belongs to an Across run and a Down run. Each run can only hold
   * digits that appear in one of its valid sum partitions, so the cell must take a digit that both
   * runs allow. This is the classic human cross-run intersection: it uses the digits a run can
   * hold, not the exact per-cell assignment, which is the stronger Partition Matching technique.
   */
  findAllCrossIntersections(board: KakuroBoard): SolutionStep[] {
    const placementSteps: SolutionStep[] = [];
    const elimSteps: SolutionStep[] = [];

    for (let cell = 0; cell < CELL_COUNT; cell++) {
      if (!board.isWhite(cell) || board.values[cell] !== 0) continue;
      const { across, down } = board.runsForCell(cell);
      if (!across || !down) continue;
      const stH = board.runState(across);
      const stV = board.runState(down);
      if (stH.hasDuplicate || stV.hasDuplicate) continue;

      const analysisH = this.runAnalysis(board, across);
      if (analysisH.validPartitions.length === 0) continue;
      const analysisV = this.runAnalysis(board, down);
      if (analysisV.validPartitions.length === 0) continue;

      const allowed = analysisH.unionMask & analysisV.unionMask & board.cands[cell];
      if (allowed === 0) continue;

      const allowedDigits = maskToDigits(allowed);
      const hDigits = maskToDigits(analysisH.unionMask);
      const vDigits = maskToDigits(analysisV.unionMask);

      // Direct single placement at the cross-run intersection when >1 candidate was present
      if (allowedDigits.length === 1 && popcount(board.cands[cell]) > 1) {
        const digit = allowedDigits[0];
        const marks: StepMarks = {
          ...emptyMarks([digit]),
          key: [
            ...stH.placedCells.map((c) => ({ cell: c, digit: board.values[c] })),
            ...stV.placedCells.map((c) => ({ cell: c, digit: board.values[c] })),
          ],
          place: [{ cell, digit }],
          tint: [
            { cells: [...across.cells], tone: 'a' },
            { cells: [...down.cells], tone: 'b' },
          ],
        };
        placementSteps.push(
          makeStep('CROSS_INTERSECTION', {
            text: `${cellName(cell)}=${digit}`,
            summary: `At ${cellName(cell)}, ${across.label} allows digits ${formatPartition(hDigits)} while ${down.label} allows ${formatPartition(vDigits)}. Their only common digit is ${digit}.`,
            notation: [
              `${across.shortLabel} ${formatPartition(hDigits)} ∩ ${down.shortLabel} ${formatPartition(vDigits)} ⇒ ${cellName(cell)}=${digit}`,
            ],
            marks,
            indices: [cell],
            values: [digit],
            runs: [across.id, down.id],
          }),
        );
        continue;
      }

      // Candidate eliminations at the intersection
      const removedMask = board.cands[cell] & ~allowed;
      if (removedMask !== 0) {
        const elimDigits = maskToDigits(removedMask);
        const marks: StepMarks = {
          ...emptyMarks(allowedDigits),
          key: allowedDigits.map((d) => ({ cell, digit: d })),
          elim: elimDigits.map((d) => ({ cell, digit: d })),
          tint: [
            { cells: [...across.cells], tone: 'a' },
            { cells: [...down.cells], tone: 'b' },
          ],
        };
        elimSteps.push(
          makeStep('CROSS_INTERSECTION', {
            text: `${cellName(cell)}<>${elimDigits.join(',')}`,
            summary: `Cell ${cellName(cell)} must belong to both ${across.label} (${formatPartition(hDigits)}) and ${down.label} (${formatPartition(vDigits)}), restricting it to ${formatPartition(allowedDigits)}.`,
            notation: [
              `${across.shortLabel} ${formatPartition(hDigits)} ∩ ${down.shortLabel} ${formatPartition(vDigits)} = ${formatPartition(allowedDigits)} ⇒ ${cellName(cell)}<>${elimDigits.join(',')}`,
            ],
            marks,
            indices: [cell],
            values: elimDigits,
            runs: [across.id, down.id],
          }),
        );
      }
    }

    return [...placementSteps, ...elimSteps];
  }

  /**
   * 5. HIDDEN_SINGLE_RUN & 7. MANDATORY_DIGIT:
   * Analyze valid partitions of each run given current candidate masks.
   * If a digit `d` is required in EVERY valid partition (`mandatoryMask`), and only one empty cell
   * in the run can accept `d`, place `d` in that cell!
   * - If `validPartitions.length === 1`, this is `HIDDEN_SINGLE_RUN`.
   * - If `validPartitions.length >= 2`, this is `MANDATORY_DIGIT`.
   */
  findAllRunSingles(board: KakuroBoard, kind: 'HIDDEN_SINGLE_RUN' | 'MANDATORY_DIGIT'): SolutionStep[] {
    const steps: SolutionStep[] = [];
    for (const run of board.runs) {
      const st = board.runState(run);
      const k = st.emptyCells.length;
      if (k < 2 || st.hasDuplicate) continue;
      const analysis = this.runAnalysis(board, run);
      if (analysis.validPartitions.length === 0 || analysis.mandatoryMask === 0) continue;

      const isSinglePartition = analysis.validPartitions.length === 1;
      if (kind === 'HIDDEN_SINGLE_RUN' && !isSinglePartition) continue;
      if (kind === 'MANDATORY_DIGIT' && isSinglePartition) continue;

      for (const digit of maskToDigits(analysis.mandatoryMask)) {
        const possibleCells = st.emptyCells.filter((_, idx) =>
          hasDigit(analysis.feasibleCellMasks[idx], digit),
        );
        if (possibleCells.length !== 1) continue;
        const targetCell = possibleCells[0];
        if (popcount(board.cands[targetCell]) <= 1) continue; // Already a Naked Single

        const partListStr = analysis.validPartitions.map((p) => formatPartition(p.digits)).join(' or ');
        const otherCells = st.emptyCells.filter((c) => c !== targetCell);
        const marks: StepMarks = {
          ...emptyMarks([digit]),
          key: [{ cell: targetCell, digit }],
          place: [{ cell: targetCell, digit }],
          tint: [{ cells: [...run.cells], tone: 'a' }],
        };
        steps.push(
          makeStep(kind, {
            text: `${cellName(targetCell)}=${digit}`,
            summary:
              kind === 'HIDDEN_SINGLE_RUN'
                ? `${run.label} requires partition ${partListStr}, and ${cellName(targetCell)} is the only cell in the run (${otherCells.map(cellName).join(', ')} cannot hold ${digit}) where ${digit} fits.`
                : `Every valid partition for ${run.label} (${partListStr}) includes digit ${digit}, and ${cellName(targetCell)} is the only cell in the run that can hold ${digit}.`,
            notation: [
              `${run.shortLabel} (${partListStr}): ${digit} only in ${cellName(targetCell)} ⇒ ${cellName(targetCell)}=${digit}`,
            ],
            marks,
            indices: [targetCell],
            values: [digit],
            runs: [run.id],
          }),
        );
      }
    }
    return steps;
  }

  /**
   * 6. SUM_BOUNDS: Minimum / Maximum Sum Bounds within a run.
   * For each empty cell `c` in a run with residual sum `S`, compute the min and max sum of the other
   * `k - 1` empty cells from their current candidates. Eliminate any `d` in `c` where `d < S - maxOther`
   * or `d > S - minOther`.
   */
  findAllSumBounds(board: KakuroBoard): SolutionStep[] {
    const steps: SolutionStep[] = [];
    for (const run of board.runs) {
      const st = board.runState(run);
      const k = st.emptyCells.length;
      if (k < 2 || st.hasDuplicate) continue;

      for (let i = 0; i < k; i++) {
        const cell = st.emptyCells[i];
        const otherCells = st.emptyCells.filter((_, idx) => idx !== i);
        const otherMasks = otherCells.map((c) => board.cands[c]);
        const bounds = computeCellSetSumBounds(otherMasks, st.placedMask);
        if (!bounds) continue;

        const minAllowed = Math.max(1, st.residualSum - bounds.maxSum);
        const maxAllowed = Math.min(9, st.residualSum - bounds.minSum);

        const elimDigits: number[] = [];
        const keepDigits: number[] = [];
        for (const d of maskToDigits(board.cands[cell])) {
          if (d < minAllowed || d > maxAllowed) elimDigits.push(d);
          else keepDigits.push(d);
        }
        if (elimDigits.length === 0 || keepDigits.length === 0) continue;

        const keyMarks: StepMark[] = otherCells.flatMap((oc) =>
          maskToDigits(board.cands[oc]).map((d) => ({ cell: oc, digit: d })),
        );
        const marks: StepMarks = {
          ...emptyMarks(keepDigits),
          key: keyMarks,
          elim: elimDigits.map((d) => ({ cell, digit: d })),
          tint: [{ cells: [...run.cells], tone: 'a' }],
        };
        steps.push(
          makeStep('SUM_BOUNDS', {
            text: `${cellName(cell)}<>${elimDigits.join(',')}`,
            summary: `In ${run.label} (residual sum ${st.residualSum}), the other empty cell(s) ${otherCells.map(cellName).join(', ')} have a sum between ${bounds.minSum} and ${bounds.maxSum}, bounding ${cellName(cell)} to ${minAllowed}..${maxAllowed}.`,
            notation: [
              `${run.shortLabel}: ${st.residualSum} - [${bounds.minSum}..${bounds.maxSum}] = [${minAllowed}..${maxAllowed}] ⇒ ${cellName(cell)}<>${elimDigits.join(',')}`,
            ],
            marks,
            indices: [cell, ...otherCells],
            values: elimDigits,
            runs: [run.id],
          }),
        );
      }
    }
    return steps;
  }

  /**
   * 8. NAKED_PAIR & NAKED_TRIPLE: 2 or 3 empty cells in the same run whose candidate union has
   * exactly 2 or 3 digits. Eliminates those digits from all other empty cells in the run.
   */
  findAllNakedSubsets(board: KakuroBoard, size: 2 | 3): SolutionStep[] {
    const steps: SolutionStep[] = [];
    const stepType: SolutionType = size === 2 ? 'NAKED_PAIR' : 'NAKED_TRIPLE';

    for (const run of board.runs) {
      const st = board.runState(run);
      const k = st.emptyCells.length;
      if (k <= size || st.hasDuplicate) continue;

      // Enumerate subsets of size `size` of `st.emptyCells`
      const choose = (start: number, picked: number[]) => {
        if (picked.length === size) {
          let unionMask = 0;
          for (const c of picked) {
            const m = board.cands[c];
            if (popcount(m) < 2) return;
            unionMask |= m;
          }
          if (popcount(unionMask) !== size) return;

          const subsetDigits = maskToDigits(unionMask);
          const otherCells = st.emptyCells.filter((c) => !picked.includes(c));
          const elim: StepMark[] = [];
          for (const oc of otherCells) {
            for (const d of subsetDigits) {
              if (board.isCandidate(oc, d)) elim.push({ cell: oc, digit: d });
            }
          }
          if (elim.length === 0) return;

          const key: StepMark[] = picked.flatMap((c) =>
            maskToDigits(board.cands[c]).map((d) => ({ cell: c, digit: d })),
          );
          const elimCells = [...new Set(elim.map((e) => e.cell))];
          const elimDigits = [...new Set(elim.map((e) => e.digit))].sort((a, b) => a - b);
          const marks: StepMarks = {
            ...emptyMarks(subsetDigits),
            key,
            elim,
            tint: [{ cells: [...run.cells], tone: 'a' }],
          };
          steps.push(
            makeStep(stepType, {
              text: `${formatPartition(subsetDigits)} in ${picked.map(cellName).join(', ')} ⇒ ${elimCells.map(cellName).join(', ')}<>${elimDigits.join(',')}`,
              summary: `In ${run.label}, cells ${picked.map(cellName).join(', ')} only allow candidates ${formatPartition(subsetDigits)}. Because digits cannot repeat in a run, no other cell in ${run.label} can use ${formatPartition(subsetDigits)}.`,
              notation: [
                `${run.shortLabel}: ${picked.map(cellName).join(', ')} = ${formatPartition(subsetDigits)} ⇒ ${elimCells.map(cellName).join(', ')}<>${elimDigits.join(',')}`,
              ],
              marks,
              indices: picked,
              values: elimDigits,
              runs: [run.id],
            }),
          );
          return;
        }
        for (let i = start; i < k; i++) {
          choose(i + 1, [...picked, st.emptyCells[i]]);
        }
      };
      choose(0, []);
    }
    return steps;
  }

  /**
   * 9. HIDDEN_PAIR & HIDDEN_TRIPLE: 2 or 3 mandatory digits of a run that only appear as candidates
   * in 2 or 3 empty cells of that run, eliminating all other candidates from those cells.
   */
  findAllHiddenSubsets(board: KakuroBoard, size: 2 | 3): SolutionStep[] {
    const steps: SolutionStep[] = [];
    const stepType: SolutionType = size === 2 ? 'HIDDEN_PAIR' : 'HIDDEN_TRIPLE';

    for (const run of board.runs) {
      const st = board.runState(run);
      const k = st.emptyCells.length;
      if (k <= size || st.hasDuplicate) continue;
      const analysis = this.runAnalysis(board, run);
      const mandatoryDigits = maskToDigits(analysis.mandatoryMask);
      if (mandatoryDigits.length < size) continue;

      const chooseDigits = (start: number, pickedDigits: number[]) => {
        if (pickedDigits.length === size) {
          const pickedMask = pickedDigits.reduce((acc, d) => acc | digitBit(d), 0);
          const holderCells = st.emptyCells.filter((c) => (board.cands[c] & pickedMask) !== 0);
          if (holderCells.length !== size) return;
          // Ensure every picked digit appears in at least 2 of holderCells (not a Hidden Single)
          for (const d of pickedDigits) {
            const count = holderCells.filter((c) => board.isCandidate(c, d)).length;
            if (count < 2) return;
          }

          const elim: StepMark[] = [];
          const key: StepMark[] = [];
          for (const c of holderCells) {
            for (const d of maskToDigits(board.cands[c])) {
              if (hasDigit(pickedMask, d)) key.push({ cell: c, digit: d });
              else elim.push({ cell: c, digit: d });
            }
          }
          if (elim.length === 0) return;

          const elimCells = [...new Set(elim.map((e) => e.cell))];
          const elimDigits = [...new Set(elim.map((e) => e.digit))].sort((a, b) => a - b);
          const marks: StepMarks = {
            ...emptyMarks(pickedDigits),
            key,
            elim,
            tint: [{ cells: [...run.cells], tone: 'a' }],
          };
          steps.push(
            makeStep(stepType, {
              text: `${formatPartition(pickedDigits)} in ${holderCells.map(cellName).join(', ')} ⇒ ${elimCells.map(cellName).join(', ')}<>${elimDigits.join(',')}`,
              summary: `In ${run.label}, mandatory digits ${formatPartition(pickedDigits)} can only go in ${holderCells.map(cellName).join(', ')}, so all other candidates in those cells can be eliminated.`,
              notation: [
                `${run.shortLabel}: ${formatPartition(pickedDigits)} locked in ${holderCells.map(cellName).join(', ')} ⇒ ${elimCells.map(cellName).join(', ')}<>${elimDigits.join(',')}`,
              ],
              marks,
              indices: holderCells,
              values: elimDigits,
              runs: [run.id],
            }),
          );
          return;
        }
        for (let i = start; i < mandatoryDigits.length; i++) {
          chooseDigits(i + 1, [...pickedDigits, mandatoryDigits[i]]);
        }
      };
      chooseDigits(0, []);
    }
    return steps;
  }

  /**
   * 10. FORCED_COMBINATION: Using exact partition matching on a run, eliminate any candidate
   * in an empty cell that cannot participate in any valid digit-to-cell bijection summing to `residualSum`.
   */
  findAllForcedCombinations(board: KakuroBoard): SolutionStep[] {
    const steps: SolutionStep[] = [];
    for (const run of board.runs) {
      const st = board.runState(run);
      const k = st.emptyCells.length;
      if (k < 2 || st.hasDuplicate) continue;
      const analysis = this.runAnalysis(board, run);
      if (analysis.validPartitions.length === 0) continue;

      const elim: StepMark[] = [];
      const key: StepMark[] = [];
      for (let i = 0; i < k; i++) {
        const cell = st.emptyCells[i];
        const feasible = analysis.feasibleCellMasks[i];
        const current = board.cands[cell];
        const diff = current & ~feasible;
        for (const d of maskToDigits(current)) {
          if (hasDigit(diff, d)) elim.push({ cell, digit: d });
          else key.push({ cell, digit: d });
        }
      }
      if (elim.length === 0) continue;

      const elimCells = [...new Set(elim.map((e) => e.cell))];
      const elimDigits = [...new Set(elim.map((e) => e.digit))].sort((a, b) => a - b);
      const partStr = analysis.validPartitions.map((p) => formatPartition(p.digits)).join(', ');
      const marks: StepMarks = {
        ...emptyMarks(elimDigits),
        key,
        elim,
        tint: [{ cells: [...run.cells], tone: 'a' }],
      };
      steps.push(
        makeStep('FORCED_COMBINATION', {
          text: `${elimCells.map(cellName).join(', ')}<>${elimDigits.join(',')}`,
          summary: `Matching valid sum partition(s) ${partStr} across the candidates of ${run.label} leaves no valid assignment using ${elimDigits.join(', ')} in ${elimCells.map(cellName).join(', ')}.`,
          notation: [
            `${run.shortLabel} (${partStr}) ⇒ ${elimCells.map(cellName).join(', ')}<>${elimDigits.join(',')}`,
          ],
          marks,
          indices: elimCells,
          values: elimDigits,
          runs: [run.id],
        }),
      );
    }
    return steps;
  }

  /**
   * 11. LOCKED_SUM_RESIDUAL:
   * (A) Within a single run of k >= 3 empty cells: if k - 1 empty cells form a locked subset of size k - 1
   *     (their candidate masks' union has popcount k - 1), their sum is fixed to `maskSum(unionMask)`,
   *     so the remaining cell's digit is forced to `residualSum - maskSum(unionMask)`.
   * (B) Cross-sector sum residual: A group of 1..3 Across runs and 1..3 Down runs whose currently empty
   *     cells are identical EXCEPT for a single extra empty cell `c` in one of the two sets.
   *     The difference between the two sets' residual sums forces the exact digit in `c`.
   */
  findAllLockedSumResiduals(board: KakuroBoard): SolutionStep[] {
    const steps: SolutionStep[] = [];

    // Part A: Locked subset sum residual inside a single run
    for (const run of board.runs) {
      const st = board.runState(run);
      const k = st.emptyCells.length;
      if (k < 3 || st.hasDuplicate) continue;
      for (let i = 0; i < k; i++) {
        const targetCell = st.emptyCells[i];
        const otherCells = st.emptyCells.filter((_, idx) => idx !== i);
        let unionMask = 0;
        for (const oc of otherCells) unionMask |= board.cands[oc];
        if (popcount(unionMask) !== k - 1) continue;
        const lockedSum = maskSum(unionMask);
        const digit = st.residualSum - lockedSum;
        if (digit < 1 || digit > 9 || !board.isCandidate(targetCell, digit)) continue;
        if (popcount(board.cands[targetCell]) <= 1) continue;

        const subsetDigits = maskToDigits(unionMask);
        const key: StepMark[] = otherCells.flatMap((oc) =>
          maskToDigits(board.cands[oc]).map((d) => ({ cell: oc, digit: d })),
        );
        const marks: StepMarks = {
          ...emptyMarks([digit]),
          key,
          place: [{ cell: targetCell, digit }],
          tint: [{ cells: [...run.cells], tone: 'a' }],
        };
        steps.push(
          makeStep('LOCKED_SUM_RESIDUAL', {
            text: `${cellName(targetCell)}=${digit}`,
            summary: `In ${run.label} (residual sum ${st.residualSum}), cells ${otherCells.map(cellName).join(', ')} are locked to ${formatPartition(subsetDigits)} with fixed sum ${lockedSum}, forcing ${cellName(targetCell)} = ${st.residualSum} - ${lockedSum} = ${digit}.`,
            notation: [
              `${run.shortLabel}: ${st.residualSum} - sum(${formatPartition(subsetDigits)}) = ${st.residualSum} - ${lockedSum} = ${digit} ⇒ ${cellName(targetCell)}=${digit}`,
            ],
            marks,
            indices: [targetCell, ...otherCells],
            values: [digit],
            runs: [run.id],
          }),
        );
      }
    }

    // Part B: Cross-sector sum difference between Across and Down runs
    const activeAcross = board.runs
      .filter((r) => r.direction === 'across')
      .map((r) => ({ run: r, st: board.runState(r) }))
      .filter((x) => x.st.emptyCells.length >= 1 && !x.st.hasDuplicate);

    const activeDown = board.runs
      .filter((r) => r.direction === 'down')
      .map((r) => ({ run: r, st: board.runState(r) }))
      .filter((x) => x.st.emptyCells.length >= 1 && !x.st.hasDuplicate);

    // Build small combinations of 1..2 Across runs and 1..2 Down runs that overlap
    const makeCombos = (list: typeof activeAcross) => {
      const out: { runs: KakuroRun[]; cells: Set<number>; sum: number }[] = [];
      for (let i = 0; i < list.length; i++) {
        out.push({
          runs: [list[i].run],
          cells: new Set(list[i].st.emptyCells),
          sum: list[i].st.residualSum,
        });
        for (let j = i + 1; j < list.length; j++) {
          // Only combine runs that are in adjacent rows/cols
          const cells = new Set([...list[i].st.emptyCells, ...list[j].st.emptyCells]);
          out.push({
            runs: [list[i].run, list[j].run],
            cells,
            sum: list[i].st.residualSum + list[j].st.residualSum,
          });
        }
      }
      return out;
    };

    const hCombos = makeCombos(activeAcross);
    const vCombos = makeCombos(activeDown);

    for (const h of hCombos) {
      for (const v of vCombos) {
        if (Math.abs(h.cells.size - v.cells.size) !== 1) continue;
        const [larger, smaller, isAcrossLarger] =
          h.cells.size > v.cells.size ? [h, v, true] : [v, h, false];
        // Every cell in `smaller` must be in `larger`
        let subsetOk = true;
        for (const c of smaller.cells) {
          if (!larger.cells.has(c)) {
            subsetOk = false;
            break;
          }
        }
        if (!subsetOk) continue;

        let extraCell = -1;
        for (const c of larger.cells) {
          if (!smaller.cells.has(c)) {
            extraCell = c;
            break;
          }
        }
        if (extraCell < 0 || popcount(board.cands[extraCell]) <= 1) continue;
        const digit = larger.sum - smaller.sum;
        if (digit < 1 || digit > 9 || !board.isCandidate(extraCell, digit)) continue;

        const sharedCells = [...smaller.cells];
        const largerLabel = larger.runs.map((r) => r.shortLabel).join(' + ');
        const smallerLabel = smaller.runs.map((r) => r.shortLabel).join(' + ');
        const marks: StepMarks = {
          ...emptyMarks([digit]),
          key: [{ cell: extraCell, digit }],
          place: [{ cell: extraCell, digit }],
          tint: [
            { cells: [...larger.cells], tone: isAcrossLarger ? 'a' : 'b' },
            { cells: sharedCells, tone: isAcrossLarger ? 'b' : 'a' },
          ],
        };
        steps.push(
          makeStep('LOCKED_SUM_RESIDUAL', {
            text: `${cellName(extraCell)}=${digit}`,
            summary: `Comparing ${largerLabel} (residual sum ${larger.sum}) with ${smallerLabel} (residual sum ${smaller.sum}): they share the exact same unsolved cells (${sharedCells.map(cellName).join(', ')}) except ${cellName(extraCell)}, forcing ${cellName(extraCell)} = ${larger.sum} - ${smaller.sum} = ${digit}.`,
            notation: [
              `(${largerLabel} = ${larger.sum}) - (${smallerLabel} = ${smaller.sum}) ⇒ ${cellName(extraCell)}=${digit}`,
            ],
            marks,
            indices: [extraCell, ...sharedCells],
            values: [digit],
            runs: [...larger.runs.map((r) => r.id), ...smaller.runs.map((r) => r.id)],
          }),
        );
      }
    }

    return steps;
  }

  /**
   * 12. CONTRADICTION_CHAIN: Test each candidate `d` in bivalue/trivalue cells by propagating basic human
   * steps; if a contradiction is reached, eliminate `d` from `cell`.
   */
  findAllContradictionChains(board: KakuroBoard): SolutionStep[] {
    const steps: SolutionStep[] = [];
    for (let cell = 0; cell < CELL_COUNT; cell++) {
      if (!board.isWhite(cell) || board.values[cell] !== 0) continue;
      const cands = maskToDigits(board.cands[cell]);
      if (cands.length < 2 || cands.length > 4) continue;

      for (const d of cands) {
        const res = this.traceHypothesis(board, cell, d);
        if (!res.conflict) continue;

        const chains: StepMark[][] = [];
        if (res.chain.length >= 2) chains.push(res.chain);
        const marks: StepMarks = {
          ...emptyMarks([d]),
          key: res.chain,
          elim: [{ cell, digit: d }],
          tint: [{ cells: [cell, ...res.conflictCells], tone: 'a' }],
          chains,
        };
        steps.push(
          makeStep('CONTRADICTION_CHAIN', {
            text: `${cellName(cell)}<>${d}`,
            summary: `Assuming ${cellName(cell)}=${d} forces ${res.reason}, which is impossible. Therefore ${cellName(cell)} cannot be ${d}.`,
            notation: [`Assume ${cellName(cell)}=${d} ⇒ ${res.reason} ⇒ ${cellName(cell)}<>${d}`],
            marks,
            indices: [cell, ...res.conflictCells],
            values: [d],
          }),
        );
      }
    }
    return steps;
  }

  /** Propagate simple forced placements from `cell = digit` to check for an immediate contradiction. */
  traceHypothesis(
    board: KakuroBoard,
    cell: number,
    digit: number,
  ): { conflict: boolean; reason: string; chain: StepMark[]; conflictCells: number[] } {
    const work = board.clone();
    work.setCell(cell, digit);
    const chain: StepMark[] = [{ cell, digit, strong: false }];

    for (let iter = 0; iter < 25; iter++) {
      // Check for contradiction on `work`
      for (let i = 0; i < CELL_COUNT; i++) {
        if (work.isWhite(i) && work.values[i] === 0 && work.cands[i] === 0) {
          return {
            conflict: true,
            reason: `${cellName(i)} has no valid candidates left`,
            chain,
            conflictCells: [i],
          };
        }
      }
      for (const run of work.runs) {
        const st = work.runState(run);
        if (st.hasDuplicate) {
          return {
            conflict: true,
            reason: `duplicate digit in ${run.label}`,
            chain,
            conflictCells: [...run.cells],
          };
        }
        if (st.emptyCells.length === 0 && st.residualSum !== 0) {
          return {
            conflict: true,
            reason: `${run.label} sums to ${st.placedSum} instead of ${run.sum}`,
            chain,
            conflictCells: [...run.cells],
          };
        }
        if (st.emptyCells.length > 0) {
          const analysis = this.runAnalysis(work, run);
          if (analysis.validPartitions.length === 0) {
            return {
              conflict: true,
              reason: `${run.label} has no valid partition for residual sum ${st.residualSum}`,
              chain,
              conflictCells: [...run.cells],
            };
          }
        }
      }

      // Advance one forced deduction if available
      if (!this.advance(work, chain)) break;
    }

    return { conflict: false, reason: '', chain, conflictCells: [] };
  }

  /**
   * Apply the next cheap forced deduction to `work`.
   * Placements extend the proof chain; eliminations only narrow the candidate sets.
   * Returns false when nothing more can be deduced.
   */
  private advance(work: KakuroBoard, chain: StepMark[]): boolean {
    const placementFinders = [
      () => this.findAllFullRuns(work),
      () => this.findAllNakedSingles(work),
      () => this.findAllCrossIntersections(work),
      () => this.findAllRunSingles(work, 'HIDDEN_SINGLE_RUN'),
      () => this.findAllRunSingles(work, 'MANDATORY_DIGIT'),
    ];
    for (const finder of placementFinders) {
      const step = finder().find((s) => s.marks.place.length > 0);
      if (!step) continue;
      for (const p of step.marks.place) {
        work.setCell(p.cell, p.digit);
        chain.push({ cell: p.cell, digit: p.digit, strong: true });
      }
      return true;
    }

    // No placement available: narrow the candidate sets with the cheapest eliminations.
    const eliminationFinders = [
      () => this.findAllMagicBlocks(work),
      () => this.findAllForcedCombinations(work),
    ];
    for (const finder of eliminationFinders) {
      const step = finder()[0];
      if (!step || step.marks.elim.length === 0) continue;
      for (const e of step.marks.elim) work.setCandidate(e.cell, e.digit, false);
      return true;
    }
    return false;
  }

  /**
   * Find the next logical human step on `board`, respecting `maxLevel` (0 = singles/basic only, 1..5)
   * and `disabled` technique types.
   */
  findNextStep(
    board: KakuroBoard,
    maxLevel = 5,
    disabled: ReadonlySet<string> = new Set(),
  ): SolutionStep | null {
    const cap = maxLevel === 0 ? 1 : maxLevel;
    const ok = (t: SolutionType) => {
      const cfg = STEP_CONFIG_MAP.get(t)!;
      if (disabled.has(t)) return false;
      if (maxLevel === 0) return t === 'FULL_RUN' || t === 'NAKED_SINGLE';
      return cfg.level <= cap;
    };

    if (ok('FULL_RUN')) {
      const s = this.findAllFullRuns(board)[0];
      if (s) return s;
    }
    if (ok('NAKED_SINGLE')) {
      const s = this.findAllNakedSingles(board)[0];
      if (s) return s;
    }
    // Check direct placement cross-intersections first
    if (ok('CROSS_INTERSECTION')) {
      const cross = this.findAllCrossIntersections(board);
      const placeStep = cross.find((x) => x.marks.place.length > 0);
      if (placeStep) return placeStep;
    }
    if (ok('MAGIC_BLOCK')) {
      const s = this.findAllMagicBlocks(board)[0];
      if (s) return s;
    }
    if (ok('CROSS_INTERSECTION')) {
      const s = this.findAllCrossIntersections(board)[0];
      if (s) return s;
    }
    if (ok('HIDDEN_SINGLE_RUN')) {
      const s = this.findAllRunSingles(board, 'HIDDEN_SINGLE_RUN')[0];
      if (s) return s;
    }
    if (ok('SUM_BOUNDS')) {
      const s = this.findAllSumBounds(board)[0];
      if (s) return s;
    }
    if (ok('MANDATORY_DIGIT')) {
      const s = this.findAllRunSingles(board, 'MANDATORY_DIGIT')[0];
      if (s) return s;
    }
    if (ok('NAKED_PAIR')) {
      const s = this.findAllNakedSubsets(board, 2)[0];
      if (s) return s;
    }
    if (ok('HIDDEN_PAIR')) {
      const s = this.findAllHiddenSubsets(board, 2)[0];
      if (s) return s;
    }
    if (ok('NAKED_TRIPLE')) {
      const s = this.findAllNakedSubsets(board, 3)[0];
      if (s) return s;
    }
    if (ok('HIDDEN_TRIPLE')) {
      const s = this.findAllHiddenSubsets(board, 3)[0];
      if (s) return s;
    }
    if (ok('FORCED_COMBINATION')) {
      const s = this.findAllForcedCombinations(board)[0];
      if (s) return s;
    }
    if (ok('LOCKED_SUM_RESIDUAL')) {
      const s = this.findAllLockedSumResiduals(board)[0];
      if (s) return s;
    }
    if (ok('CONTRADICTION_CHAIN')) {
      const s = this.findAllContradictionChains(board)[0];
      if (s) return s;
    }
    return null;
  }

  /**
   * Find all currently available logical steps on `board` up to `maxLevel`, grouped by technique.
   */
  findAllSteps(
    board: KakuroBoard,
    maxLevel = 5,
    perTechniqueCap = 12,
    disabled: ReadonlySet<string> = new Set(),
  ): { steps: SolutionStep[]; total: Record<string, number> } {
    const cap = maxLevel === 0 ? 1 : maxLevel;
    const ok = (t: SolutionType) => {
      const cfg = STEP_CONFIG_MAP.get(t)!;
      if (disabled.has(t)) return false;
      if (maxLevel === 0) return t === 'FULL_RUN' || t === 'NAKED_SINGLE';
      return cfg.level <= cap;
    };

    const groups: [SolutionType, () => SolutionStep[]][] = [
      ['FULL_RUN', () => this.findAllFullRuns(board)],
      ['NAKED_SINGLE', () => this.findAllNakedSingles(board)],
      ['MAGIC_BLOCK', () => this.findAllMagicBlocks(board)],
      ['CROSS_INTERSECTION', () => this.findAllCrossIntersections(board)],
      ['HIDDEN_SINGLE_RUN', () => this.findAllRunSingles(board, 'HIDDEN_SINGLE_RUN')],
      ['SUM_BOUNDS', () => this.findAllSumBounds(board)],
      ['MANDATORY_DIGIT', () => this.findAllRunSingles(board, 'MANDATORY_DIGIT')],
      ['NAKED_PAIR', () => this.findAllNakedSubsets(board, 2)],
      ['HIDDEN_PAIR', () => this.findAllHiddenSubsets(board, 2)],
      ['NAKED_TRIPLE', () => this.findAllNakedSubsets(board, 3)],
      ['HIDDEN_TRIPLE', () => this.findAllHiddenSubsets(board, 3)],
      ['FORCED_COMBINATION', () => this.findAllForcedCombinations(board)],
      ['LOCKED_SUM_RESIDUAL', () => this.findAllLockedSumResiduals(board)],
      ['CONTRADICTION_CHAIN', () => this.findAllContradictionChains(board)],
    ];

    const steps: SolutionStep[] = [];
    const total: Record<string, number> = {};
    for (const [type, fn] of groups) {
      if (!ok(type)) continue;
      const found = fn();
      if (found.length > 0) {
        const name = STEP_CONFIG_MAP.get(type)!.name;
        total[name] = (total[name] ?? 0) + found.length;
        steps.push(...found.slice(0, perTechniqueCap));
      }
    }
    return { steps, total };
  }
}

/** Apply a `SolutionStep` (placements and/or candidate eliminations) to `board` in place. */
export function applyStep(board: KakuroBoard, step: SolutionStep): void {
  for (const p of step.marks.place) {
    board.setCell(p.cell, p.digit);
  }
  for (const e of step.marks.elim) {
    board.setCandidate(e.cell, e.digit, false);
  }
}
