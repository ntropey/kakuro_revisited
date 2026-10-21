# Kakuro Revisited — Architecture & Port Plan

## Overview

Kakuro Revisited brings classic open-source Kakuro (Cross Sums) desktop tools (`crozzsum`,
`kakurohelper`, `jkakuro`) to the browser and mobile as a zero-dependency TypeScript engine
(`@kakuro/core`), an offline-ready React PWA (`@kakuro/app`), and a static documentation and
reference site (`@kakuro/website`).

## Packages

1. **`@kakuro/core`**:
   - Precomputed sum partition tables for every run length (`2..9`) and target sum (`3..45`) using
     9-bit candidate masks (`bit d = 1 << d`).
   - Board representation supporting arbitrary grid sizes (standard 8x8, 9x9, 10x10) with black/clue
     cells (`across`, `down`) and white playable cells.
   - Human-style step finder (`KakuroStepFinder`), solver & difficulty rater (`KakuroSolver`), and
     seeded puzzle generator (`KakuroGenerator`) with deterministic UTC Daily Puzzles.
2. **`@kakuro/app`**:
   - Responsive Kakuro board with diagonal clue cells (`across \ down`), candidate pencil marks,
     digit pad, undo/redo, timer, puzzle library/history/savepoints, and Daily Puzzle share cards.
   - Live Sum Combination Helper showing valid digit partitions for the selected cell's Across and
     Down runs.
   - Symbolic 4-stage AI Coach (`buildCoachStages`) and `"Why not?"` Contradiction Prover
     (`proveCandidate`).
3. **`@kakuro/website`**:
   - Static HTML generator (`build.mjs`), interactive Kakuro Sum Combinations Cheat Sheet
     (`/combinations/`), technique guides (`/techniques/`), beginner tutorials and Java-free guide
     (`/learn/kakuro-online-no-java.html`), user manual (`/manual/`), and consent-aware AdSense
     integration (`consent.mjs`).
