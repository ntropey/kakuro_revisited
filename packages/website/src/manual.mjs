/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * The app manual: how to use the PWA, the coach, the prover and the Daily Puzzle.
 * Each body takes `root`, the path back to the site root.
 */

export const MANUAL = [
  {
    path: 'manual/index.html',
    title: 'Kakuro Revisited manual',
    description:
      'How to use the Kakuro Revisited app: the board, the digit pad, pencil marks, the AI Coach, the "Why not?" prover, the Daily Puzzle and the settings.',
    body: (root) => `<h1>Manual</h1>
<p class="lede">Everything the app can do, in one place. The app is a progressive web app: it installs from the browser and works offline after the first visit.</p>

<div class="cards">
  <a class="card" href="${root}manual/rules"><h2>Rules and the board</h2><p>Clues, runs, the digit pad and pencil marks.</p></a>
  <a class="card" href="${root}manual/first-puzzle"><h2>Your first puzzle</h2><p>A short walkthrough of the first five minutes in the app.</p></a>
  <a class="card" href="${root}manual/hints"><h2>Hints, Coach and "Why not?"</h2><p>The four-stage walkthrough and the contradiction prover.</p></a>
  <a class="card" href="${root}manual/daily"><h2>The Daily Puzzle</h2><p>One puzzle a day, the same for everyone, with a share card.</p></a>
  <a class="card" href="${root}manual/keyboard"><h2>Keyboard and gestures</h2><p>Keys, the bottom sheet and the digit pad.</p></a>
</div>

<h2>What the app does</h2>
<ul>
  <li>Generates puzzles at five difficulty levels, each with one solution and a human-only solve path.</li>
  <li>Solves them in front of you, step by step, and names the technique it used.</li>
  <li>Proves why a candidate cannot work, with the forced chain that leads to the conflict.</li>
  <li>Keeps your game, settings and history in the browser. Nothing is sent anywhere.</li>
</ul>`,
  },
  {
    path: 'manual/rules.html',
    title: 'Rules and the board: Kakuro Revisited manual',
    description:
      'The Kakuro rules and how the Kakuro Revisited board shows clues, answers and pencil marks.',
    body: (root) => `<h1>Rules and the board</h1>

<h2>The rules</h2>
<ol>
  <li>Each run of white cells adds up to the clue in the black cell at its start.</li>
  <li>Only the digits 1 to 9 are used.</li>
  <li>A digit never repeats in a run.</li>
</ol>

<h2>The board</h2>
<p>A black cell shows two clue sums, split diagonally. The number in the top right is the Across run to its right. The number in the bottom left is the Down run below it. A black cell with only one number has only one run.</p>
<p>A white cell shows a large digit when it is placed. The small digits in the corner are pencil marks.</p>

<h2>The digit pad</h2>
<p>Tap a cell, then tap a digit. Tap the same digit again to clear the cell. The number under each digit counts how many of that digit are still unplaced in the puzzle.</p>

<h2>Pencil marks</h2>
<p>Turn on Notes and the digit pad writes small pencil marks instead of digits. With "Keep the pencil marks up to date" in the settings, the app fills the marks from the digits the solver still allows, and leaves the cells you have edited by hand alone.</p>

<h2>Undo, redo and erase</h2>
<p>The board tools under the puzzle undo and redo a move, wipe every pencil mark, open the solve path and start a "Why not?" proof.</p>

<p>Next: <a href="${root}manual/first-puzzle">Your first puzzle</a>.</p>`,
  },
  {
    path: 'manual/first-puzzle.html',
    title: 'Your first puzzle: Kakuro Revisited manual',
    description:
      'A short walkthrough of the first minutes in Kakuro Revisited: pick a level, place a digit, use pencil marks and call the coach.',
    body: (root) => `<h1>Your first puzzle</h1>

<h2>1. Pick a level</h2>
<p>Use New for a fresh puzzle at the level in the settings, or Daily for the puzzle of the day. Start at Easy if you are new; the generator never gives a puzzle that needs a guess.</p>

<h2>2. Place a digit</h2>
<p>Tap a white cell, then a digit on the pad. If the digit is already there, tapping it again clears it. A digit that does not fit the solution is marked red, so you can see a slip straight away.</p>

<h2>3. Find the easy steps</h2>
<p>Look for a run with one empty cell, and for the small sums you know by heart. The <a href="${root}combinations">cheat sheet</a> has every sum.</p>

<h2>4. Ask for a hint</h2>
<p>Tap Coach. The coach gives you the next step in four stages, one at a time:</p>
<ol>
  <li><strong>Where to look</strong>: the run or cell to study, without the answer.</li>
  <li><strong>The pattern</strong>: the cells and digits that matter.</li>
  <li><strong>The logic</strong>: why the step works, with the numbers.</li>
  <li><strong>Conclusion</strong>: the digit to place or the candidate to remove. Apply puts it on the board.</li>
</ol>

<h2>5. Try a "Why not?"</h2>
<p>Select a cell, tap Why not?, and pick a candidate. The app places it on a copy of the board, follows the forced moves, and shows the conflict if there is one. If the digit is possible, it says so.</p>

<p>Next: <a href="${root}manual/hints">Hints, Coach and "Why not?"</a>.</p>`,
  },
  {
    path: 'manual/hints.html',
    title: 'Hints, Coach and "Why not?": Kakuro Revisited manual',
    description:
      'How the Kakuro Revisited AI Coach walks through a step in four stages, and how the contradiction prover explains why a candidate fails.',
    body: (root) => `<h1>Hints, Coach and "Why not?"</h1>

<h2>The coach walkthrough</h2>
<p>The coach turns the next human step into a four-stage lesson. Each stage highlights only what it needs, so you can stop at "Where to look" and try yourself, then read on when you want the rest.</p>
<ul>
  <li><strong>Where to look</strong>: a tinted run or cell.</li>
  <li><strong>The pattern</strong>: the candidate digits that matter.</li>
  <li><strong>The logic</strong>: the deduction in plain words, with the arithmetic.</li>
  <li><strong>Conclusion</strong>: the placement or the removal, ready to apply.</li>
</ul>
<p>The hint level in the settings caps how hard a technique the coach may use. "Singles only" keeps it to the basics; Extreme allows every technique the solver knows.</p>

<h2>The Hints panel</h2>
<p>Hints lists every technique that is available on the board right now, with a count of how many steps each one gives. Pick one to open its walkthrough. This is the fastest way to see what you have missed.</p>

<h2>The "Why not?" prover</h2>
<p>Select a cell, tap Why not?, and choose a candidate. The app:</p>
<ol>
  <li>Places the candidate on a copy of the board.</li>
  <li>Follows every forced move: last cell in a run, one candidate left, an impossible sum.</li>
  <li>Finds the conflict, if there is one.</li>
</ol>
<p>The proof has four stages: the assumption, the digits it forces, the conflict and the conclusion. If the assumption does not conflict, the app checks the exact solver: a candidate that leaves the puzzle with no solution is impossible even when the short chain misses it.</p>

<h2>The solve path</h2>
<p>Path lists the techniques the puzzle needs, hardest first, with how often each one appears. It is the plan the solver follows, and a good guide to what to learn next.</p>

<p>Next: <a href="${root}manual/daily">The Daily Puzzle</a>.</p>`,
  },
  {
    path: 'manual/daily.html',
    title: 'The Daily Puzzle: Kakuro Revisited manual',
    description:
      'How the Kakuro Revisited Daily Puzzle works: one seed per date, a share card, and a streak that follows the local date.',
    body: (root) => `<h1>The Daily Puzzle</h1>

<h2>One puzzle a day</h2>
<p>The Daily Puzzle is generated from the date, so everyone who opens it on the same day gets the same grid. There is no server: the date is the seed, and the app generates the puzzle locally.</p>

<h2>The share card</h2>
<p>When you finish, tap Share. The card holds the date, the level, your time, the number of hints you used and the solved grid as text. It is designed to be pasted into a chat without spoiling the puzzle for anyone still solving it: the card shows the finished grid, not the answers to a puzzle someone has not seen.</p>

<h2>Your streak</h2>
<p>Solving the Daily Puzzle on consecutive days builds a streak. The date used is your device's local date, so the puzzle changes at your midnight.</p>

<h2>Difficulty</h2>
<p>The Daily Puzzle uses the level in the settings, so you can keep the daily gentle or make it the hardest thing you do all day. Changing the level starts the current day's puzzle again at the new level.</p>

<p>Next: <a href="${root}manual/keyboard">Keyboard and gestures</a>.</p>`,
  },
  {
    path: 'manual/keyboard.html',
    title: 'Keyboard and gestures: Kakuro Revisited manual',
    description:
      'Keyboard shortcuts and touch gestures in the Kakuro Revisited app.',
    body: () => `<h1>Keyboard and gestures</h1>

<h2>Keyboard</h2>
<table>
  <thead><tr><th scope="col">Key</th><th scope="col">Does</th></tr></thead>
  <tbody>
    <tr><td>1 to 9</td><td>Place the digit in the selected cell.</td></tr>
    <tr><td>0, Backspace or Delete</td><td>Clear the selected cell.</td></tr>
    <tr><td>Arrows</td><td>Move the selection.</td></tr>
    <tr><td>N</td><td>Turn pencil marks on or off.</td></tr>
    <tr><td>Ctrl+Z / Ctrl+Shift+Z</td><td>Undo and redo.</td></tr>
    <tr><td>H</td><td>Open the coach.</td></tr>
  </tbody>
</table>

<h2>Touch</h2>
<ul>
  <li>Tap a cell to select it. Tap it again to clear the selection.</li>
  <li>The panel at the bottom has three positions: pull the handle up for more, down for less, or tap it to open and close.</li>
  <li>Everything on the board is sized for a phone held in one hand.</li>
</ul>

<h2>Installing</h2>
<p>The app is a progressive web app. In Chrome, use the install button in the address bar. On iOS, use Share then "Add to Home Screen". After the first visit it works offline.</p>

<p>Back to the <a href="../manual/">manual</a>.</p>`,
  },
];
