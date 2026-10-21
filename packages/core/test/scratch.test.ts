import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { KakuroSolver } from '../src/solver';
import { KakuroStepFinder, applyStep } from '../src/stepFinder';
import { parseKakuro, cellName, KakuroBoard } from '../src/board';
import { KakuroGenerator } from '../src/generator';

const sampleTemplate = [
  '#########',
  '#12#89###',
  '#34#761##',
  '##124#89#',
  '###89#76#',
  '#98#12###',
  '#76#349##',
  '##987#12#',
  '####123##',
].join('');

describe('scratch', () => {
  it('stall analysis', () => {
    const out: string[] = [];
    const { board } = parseKakuro(sampleTemplate);
    const solver = new KakuroSolver();
    const report = solver.solveLogical(board);
    out.push('solved=' + report.solved + ' steps=' + report.steps.length + ' level=' + report.level);
    out.push('path: ' + report.path.map((p) => `${p.name}x${p.count}`).join(', '));

    // Replay to find where it stalls
    const work = board.clone();
    const finder = new KakuroStepFinder();
    for (let i = 0; i < 200 && !work.isSolved(); i++) {
      const step = finder.findNextStep(work, 5);
      if (!step) {
        out.push(`STALL at iteration ${i}`);
        break;
      }
      applyStep(work, step);
    }
    // Dump remaining state
    for (let r = 0; r < 9; r++) {
      const cols: string[] = [];
      for (let c = 0; c < 9; c++) {
        const i = r * 9 + c;
        const def = board.cells[i];
        if (def.kind === 'white') {
          const v = work.values[i];
          if (v) cols.push(String(v));
          else {
            const ds: string[] = [];
            for (let d = 1; d <= 9; d++) if (work.isCandidate(i, d)) ds.push(String(d));
            cols.push('[' + ds.join('') + ']');
          }
        } else {
          const a = def.across ? `a${def.across}` : '';
          const d = def.down ? `d${def.down}` : '';
          cols.push(a || d ? `${a}${d}` : 'B');
        }
      }
      out.push(cols.join(' '));
    }
    out.push('--- remaining runs ---');
    for (const run of work.runs) {
      const st = work.runState(run);
      if (st.emptyCells.length > 0) {
        out.push(`${run.label} residual=${st.residualSum} empty=${st.emptyCells.map(cellName).join(',')} cands=${st.emptyCells.map((c) => { const ds: string[] = []; for (let d = 1; d <= 9; d++) if (work.isCandidate(c, d)) ds.push(String(d)); return ds.join(''); }).join('/')}`);
      }
    }
    writeFileSync('scratch-out.txt', out.join('\n'));
    expect(true).toBe(true);
  });

  it('generator uniqueness rate', () => {
    const out: string[] = [];
    const gen = new KakuroGenerator();
    const solver = new KakuroSolver();
    let unique = 0;
    const counts: number[] = [];
    for (let s = 0; s < 20; s++) {
      const g = gen.generate(2, 1000 + s * 37);
      const { board } = parseKakuro(g.puzzle);
      const ex = solver.solveExact(board, 2);
      counts.push(ex.count);
      if (ex.count === 1) unique++;
      out.push(`seed ${s}: count=${ex.count} level=${g.level}`);
    }
    out.push(`unique ${unique}/20`);
    writeFileSync('scratch-gen.txt', out.join('\n'));
    expect(true).toBe(true);
  });
});
