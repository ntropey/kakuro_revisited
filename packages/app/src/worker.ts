/// <reference lib="webworker" />
import type { WorkerRequest, WorkerResponse } from './protocol';
import {
  allHints,
  analyze,
  candidates,
  daily,
  format,
  fromBank,
  generate,
  hint,
  path,
  prove,
} from './solverApi';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  let res: WorkerResponse;
  try {
    switch (req.kind) {
      case 'generate':
        res = { id: req.id, kind: 'puzzle', info: generate(req.level) };
        break;
      case 'bank':
        res = { id: req.id, kind: 'puzzle', info: fromBank(req.level, req.seen) };
        break;
      case 'daily':
        res = { id: req.id, kind: 'puzzle', info: daily(req.date, req.level) };
        break;
      case 'analyze':
        res = { id: req.id, kind: 'puzzle', info: analyze(req.puzzle) };
        break;
      case 'hint': {
        const h = hint(req.puzzle, req.values, req.cands, req.level, req.disabled);
        res = { id: req.id, kind: 'hint', hint: h };
        break;
      }
      case 'allHints': {
        const r = allHints(req.puzzle, req.values, req.cands, req.level, req.disabled);
        res = { id: req.id, kind: 'allHints', ...r };
        break;
      }
      case 'path':
        res = { id: req.id, kind: 'path', steps: path(req.puzzle, req.values, req.cands) };
        break;
      case 'prove':
        res = { id: req.id, kind: 'prove', proof: prove(req.puzzle, req.values, req.cands, req.cell, req.digit) };
        break;
      case 'candidates':
        res = { id: req.id, kind: 'candidates', cands: candidates(req.puzzle, req.values) };
        break;
      case 'format':
        res = { id: req.id, kind: 'format', text: format(req.puzzle, req.values, req.mode) };
        break;
    }
  } catch (e) {
    res = { id: req.id, kind: 'error', message: e instanceof Error ? e.message : String(e) };
  }
  ctx.postMessage(res);
};
