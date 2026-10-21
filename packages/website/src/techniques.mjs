/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * The technique guides. Slugs match STEP_CONFIGS in @kakuro/core, so a hint in the app can link
 * straight to its guide.
 */

/** A sample solution grid used by the diagrams ("Right Column", 26 white cells). */
export const SAMPLE_GRID =
  '#########' + '#91######' + '#83######' + '##98###19' + '##21###27' + '###98#19#' + '###29#27#' + '####379##' + '####138##';

/** The sample grid with some cells left empty, so a technique can be shown mid-solve. */
export function solverValues(omit = []) {
  return [...SAMPLE_GRID].map((ch, i) => (omit.includes(i) || ch === '#' ? 0 : Number(ch)));
}

const mask = (...digits) => digits.reduce((m, d) => m | (1 << d), 0);
const emptyCands = () => new Array(81).fill(0);

/** r2c2 is empty: Across 10 and Down 17 cross there. */
function crossBoard() {
  const cands = emptyCands();
  cands[10] = mask(1, 2, 3, 4, 6, 7, 9);
  return { values: solverValues([10, 11, 19]), cands };
}

export const TECHNIQUES = [
  {
    slug: 'last-cell-in-run',
    name: 'Last Cell in a Run',
    level: 1,
    group: 'Basics',
    summary:
      'When a run has only one empty cell left, the clue sum minus the digits already in the run gives that cell.',
    why: [
      'Every run must add up to its clue sum and may not repeat a digit. Once all but one of its cells are filled, the last digit is not a guess: it is exactly what is missing.',
      'This is the most common step in an easy Kakuro. It is also the step that starts almost every puzzle, because a run of two cells with one digit given hands you the other one for free.',
    ],
    how: [
      'Find a run with exactly one empty cell.',
      'Add the digits already placed in that run.',
      'Subtract the total from the clue sum. The result is the digit of the empty cell.',
      'Check that the digit does not already appear in the run, or in the other run through the cell.',
    ],
    example: {
      title: 'One hole, one digit',
      text: 'Across 10 (r2c2–r2c3) holds a 9 and one empty cell. 10 − 9 = 1, so r2c3 must be 1.',
      values: solverValues([11]),
      marks: {
        tint: [{ cells: [10, 11], tone: 'a' }],
        key: [{ cell: 10, digit: 9 }],
        place: [{ cell: 11, digit: 1 }],
        elim: [],
      },
    },
  },
  {
    slug: 'naked-single',
    name: 'Naked Single',
    level: 1,
    group: 'Basics',
    summary:
      'A cell whose only remaining candidate is one digit takes that digit, whatever the runs want.',
    why: [
      'A cell belongs to an Across run and a Down run at the same time. If every other digit is already used in one of those runs, only one digit is left.',
      'Candidates are the digits a cell can still hold. When the candidate list has one entry, the cell is solved.',
    ],
    how: [
      'Look at the candidate list of an empty cell.',
      'Cross out every digit that already appears in its Across or Down run.',
      'If exactly one digit remains, write it in.',
    ],
    example: {
      title: 'One candidate left',
      text: 'Both runs through r2c3 leave only 1: Across 10 already holds a 9, and Down 15 already holds 3, 9 and 2. The candidate list has one entry, so the cell is decided.',
      values: solverValues([11]),
      cands: (() => {
        const c = emptyCands();
        c[11] = mask(1);
        return c;
      })(),
      marks: {
        tint: [{ cells: [10, 11], tone: 'a' }],
        key: [{ cell: 11, digit: 1 }],
        place: [],
        elim: [],
      },
    },
  },
  {
    slug: 'magic-blocks',
    name: 'Unique Sum Partition (Magic Block)',
    level: 1,
    group: 'Sum knowledge',
    summary:
      'Some sums have exactly one set of distinct digits. Fill the digits in, or cross out everything that is not part of the set.',
    why: [
      'Kakuro digits are 1 to 9 and never repeat inside a run, so the number of ways to make a sum is fixed by mathematics, not by the puzzle. A run of two cells that sums to 17 can only be 8 + 9.',
      'Players call these Magic Blocks. Learning the small ones by heart, such as 3 and 4 in two cells and 16 and 17 in two cells, or 6 and 7 and 23 and 24 in three cells, speeds up every puzzle.',
      'The mirror rule doubles what you remember: replace every digit d by 10 − d, and a sum s in n cells becomes 10n − s in n cells. So 4 in two cells is {1,3} and 16 in two cells is {7,9}.',
    ],
    how: [
      'Read the clue sum and count the cells of the run.',
      'Ask whether only one set of different digits can make that sum.',
      'If it can, place those digits where the crossing runs allow, and remove every other digit from the cells of the run.',
    ],
    example: {
      title: '17 in two cells',
      text: 'Across 17 (r4c3–r4c4) can only be 8 + 9. Both cells are one of 8 and 9, and nothing else can go there.',
      values: solverValues([29, 30]),
      cands: (() => {
        const c = emptyCands();
        c[29] = mask(8, 9);
        c[30] = mask(8, 9);
        return c;
      })(),
      marks: {
        tint: [{ cells: [29, 30], tone: 'a' }],
        key: [
          { cell: 29, digit: 8 },
          { cell: 29, digit: 9 },
          { cell: 30, digit: 8 },
          { cell: 30, digit: 9 },
        ],
        place: [],
        elim: [],
      },
    },
  },
  {
    slug: 'cross-run-intersection',
    name: 'Cross-Run Intersection',
    level: 1,
    group: 'Intersections',
    summary:
      'A cell sits in two runs. When those runs allow different digits, the cell must be one the two have in common.',
    why: [
      'Each run allows a set of digits: the union of every partition that fits its remaining sum. The cell at the crossing belongs to both runs, so its digit must be in both sets.',
      'Usually the intersection is small. When it has a single digit, the cell is solved. Even a smaller intersection is progress: every other digit can be removed.',
    ],
    how: [
      'Take the Across run and the Down run through the cell.',
      'List the digits each run can still use, from the partitions that fit its remaining sum.',
      'The cell is one of the digits that appear in both lists.',
    ],
    example: {
      title: 'The only shared digit',
      text: 'Across 10 in two cells allows 1, 2, 3, 4, 6, 7 and 9. Down 17 in two cells is 8 + 9, so it allows 8 and 9. Only 9 is in both lists, so r2c2 = 9.',
      ...crossBoard(),
      marks: {
        tint: [
          { cells: [10, 11], tone: 'a' },
          { cells: [10, 19], tone: 'b' },
        ],
        key: [{ cell: 10, digit: 9 }],
        place: [],
        elim: [],
      },
    },
  },
  {
    slug: 'hidden-single-in-run',
    name: 'Hidden Single in a Run',
    level: 2,
    group: 'Single digit in a run',
    summary:
      'When a digit can only go in one cell of a run, it goes there, even if that cell has other candidates.',
    why: [
      'A run needs a particular set of digits. If exactly one partition fits, every digit of that partition must appear in the run.',
      'So if only one empty cell can take a required digit, that cell is decided. The cell may look flexible, with several candidates, but the run is hungry for that digit and has nowhere else to put it.',
    ],
    how: [
      'Work out which digits the run still needs.',
      'For each of those digits, count the empty cells that can take it.',
      'If a digit has exactly one such cell, write it in.',
    ],
    example: {
      title: '8 has only one home',
      text: 'Across 12 (r9c5–r9c7) still needs 8. Only r9c7 can take it, so r9c7 = 8.',
      values: solverValues([67, 76, 77, 78]),
      cands: (() => {
        const c = emptyCands();
        c[76] = mask(1, 3);
        c[77] = mask(1, 3);
        c[78] = mask(1, 3, 8);
        return c;
      })(),
      marks: {
        tint: [{ cells: [76, 77, 78], tone: 'a' }],
        key: [{ cell: 78, digit: 8 }],
        place: [{ cell: 78, digit: 8 }],
        elim: [],
      },
    },
  },
  {
    slug: 'sum-bounds',
    name: 'Minimum and Maximum Sum Bounds',
    level: 2,
    group: 'Sum knowledge',
    summary:
      'The remaining sum of a run bounds what each of its cells can hold. Digits outside the bounds can be removed.',
    why: [
      'A cell can be no smaller than the remaining sum minus the largest digits the other cells could take, and no larger than the remaining sum minus the smallest digits the others need.',
      'A simple form: in a run that still needs 17 across two cells, no cell can be smaller than 17 − 9 = 8, so only 8 and 9 remain. Bound reasoning turns a wide candidate list into a short one without placing anything.',
    ],
    how: [
      'Find the remaining sum of the run.',
      'For each empty cell, subtract the largest possible total of the other cells from the remaining sum to get a lower bound.',
      'Subtract the smallest possible total of the other cells to get an upper bound.',
      'Remove every candidate outside the bounds.',
    ],
    example: {
      title: 'Each cell is at most 9',
      text: 'Down 17 (r2c2–r3c2) still needs 17. A cell can be at least 17 − 9 = 8, so the digits 1 to 7 can be removed from both cells.',
      values: solverValues([10, 19]),
      cands: (() => {
        const c = emptyCands();
        c[10] = mask(1, 2, 3, 4, 5, 6, 7, 8, 9);
        c[19] = mask(1, 2, 3, 4, 5, 6, 7, 8, 9);
        return c;
      })(),
      marks: {
        tint: [{ cells: [10, 19], tone: 'a' }],
        key: [
          { cell: 10, digit: 8 },
          { cell: 19, digit: 9 },
        ],
        place: [],
        elim: [
          ...[1, 2, 3, 4, 5, 6, 7].map((d) => ({ cell: 10, digit: d })),
          ...[1, 2, 3, 4, 5, 6, 7].map((d) => ({ cell: 19, digit: d })),
        ],
      },
    },
  },
  {
    slug: 'mandatory-digit',
    name: 'Mandatory Digit',
    level: 2,
    group: 'Single digit in a run',
    summary:
      'A digit that appears in every partition of a run must be somewhere in that run. If only one cell can take it, it goes there.',
    why: [
      'Some digits are unavoidable. Every way to make 17 in two cells uses 8 and 9. Every way to make 10 in four cells uses 1, because the other three digits cannot reach 10 without it.',
      'Find the digits common to every partition, then look at where each one can go. A mandatory digit with a single possible cell is a placement.',
    ],
    how: [
      'List the partitions of the remaining sum for the number of empty cells.',
      'Keep the digits that appear in all of them.',
      'For each such digit, count the empty cells that can hold it. One cell means a placement.',
    ],
    example: {
      title: '8 and 9 are unavoidable',
      text: 'Every way to make 17 in two cells uses 8 and 9, so both digits must appear in Across 17 (r4c3–r4c4). Watch which of the two cells can take each of them.',
      values: solverValues([29, 30]),
      cands: (() => {
        const c = emptyCands();
        c[29] = mask(8, 9);
        c[30] = mask(8, 9);
        return c;
      })(),
      marks: {
        tint: [{ cells: [29, 30], tone: 'b' }],
        key: [
          { cell: 29, digit: 8 },
          { cell: 30, digit: 9 },
        ],
        place: [],
        elim: [],
      },
    },
  },
  {
    slug: 'naked-subsets-in-run',
    name: 'Naked Pairs and Triples in a Run',
    level: 3,
    group: 'Subsets in a run',
    summary:
      'Two cells limited to the same two digits consume those digits, so no other cell of the run can use them.',
    why: [
      'If two cells of a run can only hold 1 and 3 between them, then those two digits are used up. The rest of the run must be built from the other digits.',
      'The same idea works for three cells and three digits. The catch is that the cells must be in the same run, or in runs that cannot both avoid the digits.',
    ],
    how: [
      'Look for two cells in one run with exactly two candidates, and the same two candidates.',
      'Those two digits are locked in the pair.',
      'Remove both digits from every other empty cell of the run.',
      'Repeat with three cells and three digits.',
    ],
    example: {
      title: 'A pair leaves 8',
      text: 'r9c5 and r9c6 can only hold 1 and 3. They use both digits, so r9c7 cannot be 1 or 3, and with the sum it must be 8.',
      values: solverValues([67, 76, 77, 78]),
      cands: (() => {
        const c = emptyCands();
        c[76] = mask(1, 3);
        c[77] = mask(1, 3);
        c[78] = mask(1, 3, 8);
        return c;
      })(),
      marks: {
        tint: [{ cells: [76, 77, 78], tone: 'a' }],
        key: [
          { cell: 76, digit: 1 },
          { cell: 76, digit: 3 },
          { cell: 77, digit: 1 },
          { cell: 77, digit: 3 },
        ],
        place: [{ cell: 78, digit: 8 }],
        elim: [
          { cell: 78, digit: 1 },
          { cell: 78, digit: 3 },
        ],
      },
    },
  },
  {
    slug: 'hidden-subsets-in-run',
    name: 'Hidden Pairs and Triples in a Run',
    level: 3,
    group: 'Subsets in a run',
    summary:
      'Two digits that can only go in the same two cells of a run are locked there, so those cells lose every other candidate.',
    why: [
      'The mirror image of a naked pair. If the digits 1 and 2 fit only the cells r4c8 and r5c8 of a run, then those two cells must hold 1 and 2 in some order, whatever else they look like they could hold.',
      'That means every other candidate in those two cells is impossible, and it can be removed.',
    ],
    how: [
      'For each empty cell of a run, list its candidates.',
      'Find a digit that appears in only one cell, or two digits that appear in only the same two cells.',
      'The cells of a hidden pair hold those digits, so remove their other candidates.',
    ],
    example: {
      title: '1 and 2 are hidden',
      text: 'In Down 19 (r4c8–r7c8), the digits 1 and 2 can only go in r4c8 and r5c8. Those cells must be 1 and 2, so 5, 9, 6 and 8 are removed from them.',
      values: solverValues([43, 52, 61, 70]),
      cands: (() => {
        const c = emptyCands();
        c[43] = mask(1, 2, 5, 9);
        c[52] = mask(1, 2, 6, 8);
        c[61] = mask(3, 5, 9);
        c[70] = mask(3, 7, 8);
        return c;
      })(),
      marks: {
        tint: [{ cells: [43, 52, 61, 70], tone: 'b' }],
        key: [
          { cell: 43, digit: 1 },
          { cell: 43, digit: 2 },
          { cell: 52, digit: 1 },
          { cell: 52, digit: 2 },
        ],
        place: [],
        elim: [
          { cell: 43, digit: 5 },
          { cell: 43, digit: 9 },
          { cell: 52, digit: 6 },
          { cell: 52, digit: 8 },
        ],
      },
    },
  },
  {
    slug: 'partition-matching',
    name: 'Forced Combination (Partition Matching)',
    level: 4,
    group: 'Combining runs',
    summary:
      'The digits of the run are known; match each one to a cell so that every cell is allowed to hold its digit.',
    why: [
      'Even when a run has several possible partitions, the crossing runs often leave only one way to assign the digits to the cells. That is a bipartite matching problem, and it can be solved exactly.',
      'The app checks every assignment in polynomial time and reports the digits that every assignment keeps in a cell, and the ones no assignment uses there.',
    ],
    how: [
      'Find the partitions that fit the remaining sum and the number of empty cells.',
      'For each partition, try to place its digits into the cells so that every cell accepts its digit.',
      'A cell that takes the same digit in every successful assignment is solved. A digit that no assignment puts in a cell can be removed there.',
    ],
    example: {
      title: 'One way to fit',
      text: 'Down 20 in four cells can be 8 and 9 in the top two cells and 2 and 1 below. The candidates allow only 8 at r4c4, so the rest follow.',
      values: solverValues([30, 39, 48, 57]),
      cands: (() => {
        const c = emptyCands();
        c[30] = mask(8, 9);
        c[39] = mask(1, 8);
        c[48] = mask(2, 9);
        c[57] = mask(2);
        return c;
      })(),
      marks: {
        tint: [{ cells: [30, 39, 48, 57], tone: 'a' }],
        key: [
          { cell: 39, digit: 1 },
          { cell: 48, digit: 9 },
          { cell: 57, digit: 2 },
        ],
        place: [{ cell: 30, digit: 8 }],
        elim: [{ cell: 30, digit: 9 }],
      },
    },
  },
  {
    slug: 'locked-sum-residual',
    name: 'Locked Sum Residual',
    level: 4,
    group: 'Combining runs',
    summary:
      'When a group of cells is locked to a fixed set of digits, its sum is fixed, and the rest of the run follows by subtraction.',
    why: [
      'Suppose three cells of a run can only hold 2, 8 and 9 between them. Their total is 19, no matter which cell gets which. If the run needs 20, the remaining cell must be 1.',
      'The same idea works across runs: two runs that share almost all their empty cells, with one extra cell, differ by exactly that extra cell.',
    ],
    how: [
      'Look for a set of empty cells in a run whose combined candidates are exactly as many digits as there are cells.',
      'Add those digits: the sum is locked.',
      'Subtract the locked sum from the remaining sum of the run to get the other cell.',
      'Across runs, compare two runs with the same shared cells and one extra cell; the difference is that cell.',
    ],
    example: {
      title: 'Three cells locked to 19',
      text: 'In Down 20 (r4c4–r7c4), r5c4, r6c4 and r7c4 can only hold 2, 8 and 9 between them: a locked sum of 19. So r4c4 = 20 − 19 = 1.',
      values: solverValues([30, 39, 48, 57]),
      cands: (() => {
        const c = emptyCands();
        c[30] = mask(1, 2, 8);
        c[39] = mask(2, 8);
        c[48] = mask(2, 9);
        c[57] = mask(8, 9);
        return c;
      })(),
      marks: {
        tint: [{ cells: [30, 39, 48, 57], tone: 'a' }],
        key: [
          { cell: 39, digit: 2 },
          { cell: 39, digit: 8 },
          { cell: 48, digit: 2 },
          { cell: 48, digit: 9 },
          { cell: 57, digit: 8 },
          { cell: 57, digit: 9 },
        ],
        place: [{ cell: 30, digit: 1 }],
        elim: [],
      },
    },
  },
  {
    slug: 'contradiction-forcing',
    name: 'Contradiction Forcing',
    level: 5,
    group: 'Last resort',
    summary:
      'Assume a candidate is true and follow the forced steps. A conflict proves the candidate wrong.',
    why: [
      'When no direct technique applies, you can test a candidate. Place it as a hypothesis, then make only forced moves: last cell in a run, one candidate left, a run that has no partition at all.',
      'If the hypothesis leads to a run that cannot be filled, a digit that has to go twice, or a sum that cannot be reached, the hypothesis was false. The candidate is removed. If every other digit has been removed, the last one is the answer.',
      'The app proves this for you in the "Why not?" panel. It shows the assumption, the digits it forces and the exact conflict, so you can check every link of the argument.',
    ],
    how: [
      'Pick a cell with two or three candidates and choose one.',
      'Place it and follow only forced moves.',
      'If you reach a conflict, remove the candidate.',
      'If there is no conflict and the puzzle still solves, the candidate is possible, but it is not proven correct.',
    ],
    example: {
      title: '1 in r8c5 cannot work',
      text: 'Assume r8c5 = 1. Across 19 would then need 18 from the other two cells, but two different digits can make at most 9 + 8 = 17. The assumption fails, so r8c5 is not 1.',
      values: solverValues([67, 68, 69]),
      cands: (() => {
        const c = emptyCands();
        c[67] = mask(1, 2, 3);
        return c;
      })(),
      marks: {
        tint: [{ cells: [67, 68, 69], tone: 'a' }],
        key: [{ cell: 67, digit: 1 }],
        place: [],
        elim: [{ cell: 67, digit: 1 }],
      },
    },
  },
].map((t, i) => ({ ...t, num: String(i + 1).padStart(2, '0') }));

/** The order the guides are listed in. */
export const GROUPS = [
  { name: 'Basics', slugs: ['last-cell-in-run', 'naked-single'] },
  { name: 'Sum knowledge', slugs: ['magic-blocks', 'sum-bounds', 'mandatory-digit'] },
  { name: 'Intersections', slugs: ['cross-run-intersection'] },
  { name: 'Single digit in a run', slugs: ['hidden-single-in-run'] },
  { name: 'Subsets in a run', slugs: ['naked-subsets-in-run', 'hidden-subsets-in-run'] },
  { name: 'Combining runs', slugs: ['partition-matching', 'locked-sum-residual'] },
  { name: 'Last resort', slugs: ['contradiction-forcing'] },
];

export const TECHNIQUE_GROUPS = GROUPS.map((g, i) => ({
  name: g.name,
  num: String(i + 1).padStart(2, '0'),
  items: g.slugs.map((s) => TECHNIQUES.find((t) => t.slug === s)),
}));

for (const g of TECHNIQUE_GROUPS) for (const t of g.items) if (!t) throw new Error('unknown technique in group ' + g.name);
