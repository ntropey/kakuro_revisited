/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * The Learn pages: how to play, how to solve, notation, glossary and the difficulty levels.
 * Each body takes `root`, the path back to the site root.
 */

export const LEARN = [
  {
    path: 'learn/index.html',
    title: 'Learn Kakuro: a free step-by-step course',
    description:
      'Learn to solve Kakuro (Cross Sums) from the first rule to the hardest techniques. Free guides, worked examples and a complete sum combination cheat sheet.',
    body: (root) => `<h1>Learn Kakuro</h1>
<p class="lede">Kakuro, also called Cross Sums or Cross Addition, is a number puzzle that looks like a crossword and thinks like arithmetic. You do not guess. Every cell is decided by a clue sum and a set of digits that may not repeat.</p>

<p>Start with <a href="${root}learn/how-to-solve-kakuro">How to solve Kakuro</a> if you have never played. It walks through a whole puzzle one step at a time.</p>

<div class="cards">
  <a class="card" href="${root}learn/how-to-solve-kakuro">
    <h2>How to solve Kakuro</h2>
    <p>The rules, the first two steps, and how to keep going without guessing.</p>
  </a>
  <a class="card" href="${root}combinations">
    <h2>Sum Combinations Cheat Sheet</h2>
    <p>Every sum, every run length, every set of digits. The one page worth bookmarking.</p>
  </a>
  <a class="card" href="${root}techniques/">
    <h2>The technique guides</h2>
    <p>Twelve techniques from the last cell in a run to contradiction forcing.</p>
  </a>
  <a class="card" href="${root}learn/kakuro-notation">
    <h2>Notation</h2>
    <p>How to read r2c3, "Across 16" and a set like {7,9} in this site and in the app.</p>
  </a>
  <a class="card" href="${root}learn/kakuro-glossary">
    <h2>Glossary</h2>
    <p>Run, clue, partition, Magic Block, candidate, forced move: the words this site uses.</p>
  </a>
  <a class="card" href="${root}learn/kakuro-difficulty-levels">
    <h2>Difficulty levels</h2>
    <p>What Trivial, Easy, Medium, Hard and Extreme mean, and which techniques each needs.</p>
  </a>
  <a class="card" href="${root}manual/">
    <h2>The app manual</h2>
    <p>Pencil marks, the coach, the "Why not?" prover, the Daily Puzzle and the settings.</p>
  </a>
</div>

<h2>The three rules</h2>
<ol>
  <li>Each run of white cells adds up to the clue in its corner.</li>
  <li>Digits are 1 to 9.</li>
  <li>A digit never repeats inside a run.</li>
</ol>
<p>That is all. Everything else is deduction.</p>`,
  },
  {
    path: 'learn/how-to-solve-kakuro.html',
    title: 'How to solve Kakuro: a beginner guide with worked steps',
    description:
      'A step-by-step Kakuro tutorial: the rules, the first placements, Magic Blocks, intersections and pencil marks. No guessing required.',
    body: (root) => `<h1>How to solve Kakuro</h1>
<p class="lede">A Kakuro puzzle is a grid of white cells and black clue cells. Each clue belongs to a run: a line of white cells going right (an Across run) or down (a Down run). The run must add up to the clue, using digits 1 to 9, with no digit repeated.</p>

<h2>1. Read the clues</h2>
<p>A clue cell shows two numbers, split by a diagonal. The number in the top right is the sum of the run to the right. The number in the bottom left is the sum of the run below. Some cells show only one number, because there is only one run.</p>

<h2>2. Find a run with one empty cell</h2>
<p>This is the easiest step in Kakuro and it is often enough to start. If a run sums to 10 and already holds a 9, the last cell is 1. Nothing else fits, because digits cannot repeat and the sum is fixed.</p>

<h2>3. Learn the small forced sums</h2>
<p>Some sums have exactly one possible set of digits. In two cells, 3 must be 1 + 2 and 17 must be 8 + 9. In three cells, 6 must be 1 + 2 + 3 and 24 must be 7 + 8 + 9. These are called Magic Blocks, and knowing four or five of them by heart turns a slow start into a fast one.</p>
<p>Use the <a href="${root}combinations">Sum Combinations Cheat Sheet</a> to look up any sum and run length.</p>

<h2>4. Cross the runs</h2>
<p>Every white cell belongs to two runs at once. Work out which digits each run can still hold, then take the digits that appear in both lists. Often only one digit survives, and the cell is solved.</p>

<h2>5. Keep pencil marks</h2>
<p>Write the digits a cell can still hold in its corner, in small writing. The app does this for you: the individual digits in a cell are pencil marks, and the big digit is a placed answer. Keep the marks honest: when a digit is placed in a run, cross it out of the other cells of that run.</p>

<h2>6. Never guess</h2>
<p>Every Kakuro that this site publishes has one solution and can be solved by logic alone. If you are stuck, there is a technique you have not used yet. Open the coach in the app and it will walk you to the next step in four stages: where to look, the pattern, the logic and the conclusion.</p>

<h2>A worked start</h2>
<p>Take the board below. The across run of two cells on row 4 sums to 17. Two different digits that add to 17 can only be 8 and 9, so both cells hold one of those two digits. Nothing else can go there, and any other candidate in those cells is wrong.</p>
<p>Look for a clue that is a Magic Block on your next puzzle. Place those digits, then look for a run that is now one cell short. The puzzle unrolls from there.</p>

<h2>Where to go next</h2>
<ul>
  <li><a href="${root}techniques/">The technique guides</a>, in the order the app uses them.</li>
  <li><a href="${root}learn/kakuro-difficulty-levels">The difficulty levels</a>, to see what each level asks of you.</li>
  <li><a href="${root}play/">Play a puzzle</a> and let the coach help when you are stuck.</li>
</ul>`,
  },
  {
    path: 'learn/kakuro-notation.html',
    title: 'Kakuro notation: cells, runs, clues and digit sets',
    description:
      'How Kakuro notation works on this site: r2c3 for a cell, Across 16 for a run, {7,9} for a set of digits and 7r2c3 for a placement.',
    body: () => `<h1>Kakuro notation</h1>
<p class="lede">The app, the technique guides and this page all use the same short notation. It is worth five minutes.</p>

<h2>Cells</h2>
<p>A cell is named by its row and its column: <code>r2c3</code> is the cell in row 2, column 3. Rows count from the top, columns from the left, both starting at 1. A list of cells is written <code>r2c3, r2c4</code>.</p>

<h2>Runs</h2>
<p>A run is a line of white cells with one clue. Runs are named by direction, sum and span:</p>
<ul>
  <li><code>Across 16 (r2c2-r2c3)</code>: the run to the right of a clue that sums to 16.</li>
  <li><code>Down 7 (r2c1-r4c1)</code>: the run below a clue that sums to 7.</li>
</ul>
<p>A short form is used in some explanations: <code>16&rarr;r2c1</code> means "the across run of 16 that starts after the clue at r2c1".</p>

<h2>Digit sets</h2>
<p>A set of digits is written with braces: <code>{7,9}</code> is the pair 7 and 9, in either order. A single digit is written plainly: <code>7</code>.</p>
<p>A placement is written <code>7r2c3</code>: the digit 7 goes in cell r2c3. A removal is written the same way in the app's explanations: if the app says "7 cannot be in r2c3", it has crossed 7 out of that cell.</p>

<h2>Pencil marks</h2>
<p>The small digits inside an empty cell are pencil marks: the digits that cell can still hold. Placing a digit removes it from every other cell of the same run.</p>

<h2>Partitions</h2>
<p>A partition is a set of different digits that adds up to a sum. "17 in 2" means a run of two cells summing to 17; its only partition is {8,9}. The <a href="../combinations">cheat sheet</a> lists every partition.</p>`,
  },
  {
    path: 'learn/kakuro-glossary.html',
    title: 'Kakuro glossary: every term used on this site',
    description:
      'A glossary of Kakuro terms: run, clue, cell, partition, Magic Block, candidate, pencil mark, forced move, intersection and contradiction.',
    body: () => `<h1>Kakuro glossary</h1>
<dl class="glossary">
  <dt>Across run</dt><dd>A horizontal line of white cells that shares one clue, read left to right.</dd>
  <dt>Candidate</dt><dd>A digit that a cell can still hold without breaking a rule. The candidate list shrinks as the puzzle is solved.</dd>
  <dt>Clue</dt><dd>The number in a black cell: the sum of the run beside it (top right) or below it (bottom left).</dd>
  <dt>Contradiction</dt><dd>A state where no digit can fit a cell, a digit would have to appear twice in a run, or a run cannot reach its sum. A contradiction proves that the assumption that led to it was wrong.</dd>
  <dt>Cross Sums</dt><dd>Another name for Kakuro, common in the United States.</dd>
  <dt>Digit set</dt><dd>The different digits of a run, written in braces, e.g. {1,3}.</dd>
  <dt>Down run</dt><dd>A vertical line of white cells that shares one clue, read top to bottom.</dd>
  <dt>Forced move</dt><dd>A placement or removal that follows from the rules with no guessing.</dd>
  <dt>Intersection</dt><dd>The pair of runs that share a cell. The cell must hold a digit that both runs allow.</dd>
  <dt>Magic Block</dt><dd>A sum with exactly one possible digit set for the number of cells, such as 16 in two cells = {7,9}.</dd>
  <dt>Partition</dt><dd>A set of different digits with a given sum and a given number of cells.</dd>
  <dt>Pencil mark</dt><dd>A small digit in the corner of a cell, recording a candidate that is not yet placed.</dd>
  <dt>Run</dt><dd>A maximal line of white cells in one direction, with a clue at its start.</dd>
  <dt>Solve path</dt><dd>The list of techniques a puzzle needs, hardest first. The app shows it in the Path panel.</dd>
</dl>`,
  },
  {
    path: 'learn/kakuro-difficulty-levels.html',
    title: 'Kakuro difficulty levels explained',
    description:
      'What Trivial, Easy, Medium, Hard and Extreme mean in Kakuro Revisited, and which techniques each level needs.',
    body: (root) => `<h1>Kakuro difficulty levels</h1>
<p class="lede">A Kakuro is as hard as the hardest technique it needs, and as long as the number of steps it takes. The app rates every puzzle with a deterministic solver, so the same puzzle always gets the same level.</p>

<h2>The five levels</h2>
<table>
  <thead><tr><th scope="col">Level</th><th scope="col">Name</th><th scope="col">What it asks of you</th></tr></thead>
  <tbody>
    <tr><td>1</td><td>Trivial</td><td>The last cell in a run, single candidates, Magic Blocks and simple intersections. A gentle warm-up.</td></tr>
    <tr><td>2</td><td>Easy</td><td>Hidden singles, sum bounds and mandatory digits. You need to think in sets of digits.</td></tr>
    <tr><td>3</td><td>Medium</td><td>Naked and hidden pairs or triples in a run. Pencil marks become useful.</td></tr>
    <tr><td>4</td><td>Hard</td><td>Exact forced combinations and locked sum residuals. Pencil marks become essential.</td></tr>
    <tr><td>5</td><td>Extreme</td><td>Everything, including contradiction forcing when nothing else works.</td></tr>
  </tbody>
</table>

<h2>Which techniques belong to which level</h2>
<ul class="level-list">
  <li><strong>Level 1</strong>: <a href="${root}techniques/last-cell-in-run">Last Cell in a Run</a>, <a href="${root}techniques/naked-single">Naked Single</a>, <a href="${root}techniques/magic-blocks">Magic Block</a>, <a href="${root}techniques/cross-run-intersection">Cross-Run Intersection</a></li>
  <li><strong>Level 2</strong>: <a href="${root}techniques/hidden-single-in-run">Hidden Single in a Run</a>, <a href="${root}techniques/sum-bounds">Sum Bounds</a>, <a href="${root}techniques/mandatory-digit">Mandatory Digit</a></li>
  <li><strong>Level 3</strong>: <a href="${root}techniques/naked-subsets-in-run">Naked Pairs and Triples in a Run</a>, <a href="${root}techniques/hidden-subsets-in-run">Hidden Pairs and Triples in a Run</a></li>
  <li><strong>Level 4</strong>: <a href="${root}techniques/partition-matching">Forced Combination</a>, <a href="${root}techniques/locked-sum-residual">Locked Sum Residual</a></li>
  <li><strong>Level 5</strong>: <a href="${root}techniques/contradiction-forcing">Contradiction Forcing</a></li>
</ul>
<p>The five levels match the app, and the <a href="${root}play/">play page</a> generates a puzzle at the level you pick. The Daily Puzzle uses its own level setting.</p>`,
  },
];
