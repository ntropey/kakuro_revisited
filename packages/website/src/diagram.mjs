/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * Renders a Kakuro grid as an inline SVG diagram for the website.
 * Colors come from CSS variables in site.css, so the diagrams follow light and dark mode.
 */

const CELL = 50;
const SIZE = CELL * 9;
const cellName = (i) => `r${Math.floor(i / 9) + 1}c${(i % 9) + 1}`;
const listCells = (marks) => [...new Set(marks.map((m) => cellName(m.cell)))].join(', ');

/** center of candidate `digit` inside `cell` */
function candPos(cell, digit) {
  const x = (cell % 9) * CELL + 9 + ((digit - 1) % 3) * 16;
  const y = Math.floor(cell / 9) * CELL + 10 + Math.floor((digit - 1) / 3) * 16;
  return [x, y];
}

const hasMark = (list, cell, digit) => list.some((m) => m.cell === cell && m.digit === digit);

/**
 * Work out the clue cells of a solution grid (`#` for a block, `1`-`9` for a digit).
 * Returns the across and down sums of every block cell.
 */
export function cluesOf(grid) {
  const at = (r, c) => (r < 0 || r > 8 || c < 0 || c > 8 ? '#' : grid[r * 9 + c]);
  const across = new Array(81).fill(0);
  const down = new Array(81).fill(0);
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const i = r * 9 + c;
      if (at(r, c) !== '#') continue;
      // the run to the right
      let sum = 0;
      let len = 0;
      for (let cc = c + 1; cc < 9 && at(r, cc) !== '#'; cc++) {
        sum += Number(at(r, cc));
        len++;
      }
      if (len >= 2) across[i] = sum;
      // the run below
      sum = 0;
      len = 0;
      for (let rr = r + 1; rr < 9 && at(rr, c) !== '#'; rr++) {
        sum += Number(at(rr, c));
        len++;
      }
      if (len >= 2) down[i] = sum;
    }
  }
  return { across, down };
}

/** The number of white cells of a solution grid. */
export function whiteCells(grid) {
  let n = 0;
  for (const ch of grid) if (ch !== '#') n++;
  return n;
}

/**
 * Render a diagram.
 *
 * `grid` is the solution grid (`#` and `1`-`9`). `opts.values` (81 entries, 0 = empty) overrides the
 * digits, `opts.cands` (bitmasks) shows pencil marks and `opts.marks` adds highlights:
 * `{ key: [], place: [], elim: [], tint: [{ cells, tone }] }`.
 */
export function kakuroDiagram(grid, opts = {}) {
  const { across, down } = cluesOf(grid);
  const values = opts.values ?? [...grid].map((ch) => (ch === '#' ? 0 : Number(ch)));
  const cands = opts.cands ?? null;
  const marks = opts.marks ?? { key: [], place: [], elim: [], tint: [] };
  const out = [];
  out.push(
    `<svg class="dg" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="${escAttr(opts.label ?? 'Kakuro board')}" xmlns="http://www.w3.org/2000/svg">`,
  );
  out.push(`<rect class="bg" width="${SIZE}" height="${SIZE}"/>`);
  for (const t of marks.tint ?? []) {
    for (const c of t.cells) {
      out.push(
        `<rect class="tint-${t.tone}" x="${(c % 9) * CELL}" y="${Math.floor(c / 9) * CELL}" width="${CELL}" height="${CELL}"/>`,
      );
    }
  }
  for (let cell = 0; cell < 81; cell++) {
    const x = (cell % 9) * CELL;
    const y = Math.floor(cell / 9) * CELL;
    if (grid[cell] === '#') {
      out.push(`<rect class="blk" x="${x}" y="${y}" width="${CELL}" height="${CELL}"/>`);
      if (across[cell] || down[cell]) {
        out.push(`<line class="diag" x1="${x}" y1="${y + CELL}" x2="${x + CELL}" y2="${y}"/>`);
      }
      if (across[cell]) out.push(`<text class="clue across" x="${x + CELL - 5}" y="${y + 16}">${across[cell]}</text>`);
      if (down[cell]) out.push(`<text class="clue down" x="${x + 5}" y="${y + CELL - 5}">${down[cell]}</text>`);
    } else {
      out.push(`<rect class="wht" x="${x}" y="${y}" width="${CELL}" height="${CELL}"/>`);
    }
  }
  // grid
  for (let i = 0; i <= 9; i++) {
    const cls = i % 3 === 0 ? 'thick' : 'thin';
    out.push(`<line class="${cls}" x1="${i * CELL}" y1="0" x2="${i * CELL}" y2="${SIZE}"/>`);
    out.push(`<line class="${cls}" x1="0" y1="${i * CELL}" x2="${SIZE}" y2="${i * CELL}"/>`);
  }
  // marks
  for (const m of marks.place ?? []) {
    const x = (m.cell % 9) * CELL;
    const y = Math.floor(m.cell / 9) * CELL;
    out.push(`<rect class="placebg" x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="3"/>`);
  }
  for (const m of marks.key ?? []) {
    const x = (m.cell % 9) * CELL;
    const y = Math.floor(m.cell / 9) * CELL;
    out.push(`<rect class="keyring" x="${x + 2}" y="${y + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="3"/>`);
  }
  // values and candidates
  for (let cell = 0; cell < 81; cell++) {
    if (grid[cell] === '#') continue;
    const cx = (cell % 9) * CELL + CELL / 2;
    const cy = Math.floor(cell / 9) * CELL + CELL / 2;
    const v = values[cell] ?? 0;
    const placed = (marks.place ?? []).find((p) => p.cell === cell);
    if (v !== 0 && !placed) {
      out.push(`<text class="val" x="${cx}" y="${cy}">${v}</text>`);
      continue;
    }
    if (placed) {
      out.push(`<text class="val placed" x="${cx}" y="${cy}">${placed.digit}</text>`);
      continue;
    }
    const mask = cands ? cands[cell] : 0;
    if (mask) {
      for (let d = 1; d <= 9; d++) {
        if ((mask & (1 << d)) === 0) continue;
        const [px, py] = candPos(cell, d);
        let cls = 'cand';
        if (hasMark(marks.elim ?? [], cell, d)) cls += ' elim';
        else if (hasMark(marks.key ?? [], cell, d)) cls += ' key';
        out.push(`<text class="${cls}" x="${px}" y="${py}">${d}</text>`);
        if (cls.includes('elim')) out.push(`<line class="strike" x1="${px - 6}" y1="${py + 6}" x2="${px + 6}" y2="${py - 6}"/>`);
      }
    }
  }
  out.push('</svg>');
  return out.join('');
}

/** A one-sentence caption of the marks of a diagram. */
export function caption(text, marks = { key: [], place: [], elim: [], tint: [] }) {
  const parts = [];
  if ((marks.place ?? []).length > 0) parts.push(marks.place.map((p) => `${p.digit} goes in ${cellName(p.cell)}`).join('; '));
  if ((marks.elim ?? []).length > 0) {
    const digits = [...new Set(marks.elim.map((e) => e.digit))].sort().join(', ');
    parts.push(`${digits} can be removed from ${listCells(marks.elim)}`);
  }
  return parts.length > 0 ? `${text}: ${parts.join('. ')}.` : text;
}

/** The legend under a diagram. */
export function legend(marks = { key: [], place: [], elim: [], tint: [] }) {
  const items = [];
  if ((marks.place ?? []).length) items.push('<span class="lg place">placed</span>');
  if ((marks.key ?? []).length) items.push('<span class="lg key">key digits</span>');
  if ((marks.elim ?? []).length) items.push('<span class="lg elim">removed</span>');
  return items.length ? `<p class="legend">${items.join(' ')}</p>` : '';
}

function escAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
