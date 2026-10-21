/*
 * Kakuro Revisited. GPL-3.0-or-later; see LICENSE.
 * The Sum Combinations Cheat Sheet: every way to fill a run of a given length with a given sum.
 *
 * The tables are generated here, so the page is complete even without JavaScript. The small inline
 * script only filters the same data when the visitor picks a length and a sum.
 */

/** Every subset of {1..9}, grouped by length and sum, smallest digit first. */
export function allPartitions() {
  const table = new Map();
  for (let sub = 1; sub < 512; sub++) {
    const digits = [];
    for (let d = 1; d <= 9; d++) if (sub & (1 << (d - 1))) digits.push(d);
    const sum = digits.reduce((a, b) => a + b, 0);
    const key = `${digits.length}:${sum}`;
    if (!table.has(key)) table.set(key, []);
    table.get(key).push(digits);
  }
  for (const list of table.values()) {
    list.sort((a, b) => {
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
      return 0;
    });
  }
  return table;
}

/** The smallest sum `length` different digits can make. */
export const minSum = (length) => (length * (length + 1)) / 2;
/** The largest sum `length` different digits can make. */
export const maxSum = (length) => (length * (19 - length)) / 2;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TABLE = allPartitions();

/** The data the interactive filter uses, as a plain JSON string. */
function dataJson() {
  const rows = [];
  for (const [key, list] of TABLE) {
    const [length, sum] = key.split(':').map(Number);
    rows.push({ l: length, s: sum, p: list });
  }
  return JSON.stringify(rows);
}

/** One row of the static table: the sum and every way to make it. */
function tableRows(length) {
  const rows = [];
  for (let sum = minSum(length); sum <= maxSum(length); sum++) {
    const list = TABLE.get(`${length}:${sum}`) ?? [];
    if (list.length === 0) continue;
    const magic = list.length === 1 ? ' class="magic"' : '';
    const ways = list.map((p) => `<code>${p.join('+')}</code>`).join(' ');
    rows.push(`<tr${magic}><th scope="row">${sum}</th><td>${ways}</td><td class="count">${list.length}</td></tr>`);
  }
  return rows.join('\n');
}

/** The body of the cheat sheet page. */
export function combinationsBody() {
  const lengths = [2, 3, 4, 5, 6, 7, 8, 9];
  const data = dataJson().replace(/</g, '\\u003c');
  return `<h1>Kakuro Sum Combinations Cheat Sheet</h1>
<p class="lede">A Kakuro run is a set of cells that must add up to the clue sum, with no digit repeated. The tables below list every possible set of digits for every run length. Runs of two, three and four cells are the ones you meet most, and the highlighted rows are <strong>Magic Blocks</strong>: sums with only one possible set of digits, so the digits are forced before you place a single one.</p>

<section class="explorer" aria-label="Sum combination finder">
  <h2>Find a combination</h2>
  <div class="explorer-controls">
    <label>Cells
      <select id="cx-length">${lengths.map((n) => `<option value="${n}">${n}</option>`).join('')}</select>
    </label>
    <label>Sum
      <select id="cx-sum"></select>
    </label>
    <label class="check"><input type="checkbox" id="cx-magic"> Magic blocks only</label>
  </div>
  <p id="cx-result" class="explorer-result" aria-live="polite"></p>
</section>

<section class="quick">
  <h2>The sums that are forced</h2>
  <p>A sum is a Magic Block when only one set of digits can make it. These are the ones you can write down at a glance:</p>
  <ul class="magic-list">
    <li><strong>2 cells:</strong> 3 = 1+2, 4 = 1+3, 16 = 7+9, 17 = 8+9</li>
    <li><strong>3 cells:</strong> 6 = 1+2+3, 7 = 1+2+4, 23 = 6+8+9, 24 = 7+8+9</li>
    <li><strong>4 cells:</strong> 10 = 1+2+3+4, 11 = 1+2+3+5, 29 = 5+7+8+9, 30 = 6+7+8+9</li>
  </ul>
  <p>The mirror rule helps too: a run of length <em>n</em> with sum <em>s</em> has the same shapes as a run of length <em>n</em> with sum <em>10n - s</em>, with every digit replaced by 10 minus that digit. For example 16 in 2 is {7,9}, so 4 in 2 is {1,3}.</p>
</section>

${lengths
  .map(
    (n) => `<section class="cheat-table">
  <h2>${n} cells &mdash; sums ${minSum(n)} to ${maxSum(n)}</h2>
  <table>
    <thead><tr><th scope="col">Sum</th><th scope="col">Digits</th><th scope="col">Ways</th></tr></thead>
    <tbody>
${tableRows(n)}
    </tbody>
  </table>
</section>`,
  )
  .join('\n')}

<script>
(function(){
  var DATA = ${data};
  var byKey = {};
  DATA.forEach(function(row){ byKey[row.l + ':' + row.s] = row.p; });
  var len = document.getElementById('cx-length');
  var sum = document.getElementById('cx-sum');
  var magic = document.getElementById('cx-magic');
  var result = document.getElementById('cx-result');
  function minSum(n){ return n * (n + 1) / 2; }
  function maxSum(n){ return n * (19 - n) / 2; }
  function fillSums(){
    var n = Number(len.value);
    var keep = Number(sum.value) || 0;
    sum.innerHTML = '';
    for (var s = minSum(n); s <= maxSum(n); s++) {
      if (!byKey[n + ':' + s]) continue;
      var o = document.createElement('option');
      o.value = String(s);
      o.textContent = String(s);
      if (s === keep) o.selected = true;
      sum.appendChild(o);
    }
    if (!sum.value) sum.selectedIndex = 0;
    render();
  }
  function render(){
    var n = Number(len.value);
    var s = Number(sum.value);
    var list = byKey[n + ':' + s] || [];
    if (magic.checked && list.length !== 1) list = [];
    if (list.length === 0) { result.textContent = 'No set of ' + n + ' different digits adds up to ' + s + '.'; return; }
    var bits = list.map(function(p){ return p.join(' + ') + ' = ' + s; });
    result.innerHTML = '<strong>' + s + ' in ' + n + ' cell' + (n === 1 ? '' : 's') + ':</strong> ' + bits.join(' &middot; ') + (list.length === 1 ? ' <span class="tag">Magic Block</span>' : '');
  }
  len.addEventListener('change', fillSums);
  sum.addEventListener('change', render);
  magic.addEventListener('change', render);
  fillSums();
})();
</script>

<p class="note">Digits in a run never repeat, so a run of length <em>n</em> can never sum to less than 1+2+…+n or more than 9+8+…+(10-n). Runs in this app have two to four cells, but the tables cover every length you can meet on a paper Kakuro.</p>`;
}
