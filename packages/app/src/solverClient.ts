/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * Talks to the solver worker.
 */
import type {
  CopyFormat,
  HintLevel,
  HintResult,
  ProofResult,
  PuzzleInfo,
  WorkerRequest,
  WorkerResponse,
} from './protocol';

type Distribute<T> = T extends unknown ? Omit<T, 'id'> : never;

/** Rejection of a call that was killed by `cancel()`; callers normally ignore it. */
export class CancelledError extends Error {
  constructor() {
    super('cancelled');
    this.name = 'CancelledError';
  }
}

/** True when `e` is the rejection produced by `SolverClient.cancel()`. */
export function isCancelled(e: unknown): boolean {
  return e instanceof CancelledError;
}

/**
 * The typed client of the solver worker.
 *
 * Every call returns a promise; `cancel()` kills a running job (a hard puzzle can take a while)
 * and rejects the pending call with a `CancelledError`.
 */
export class SolverClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void }>();

  private ensure(): Worker {
    if (this.worker) return this.worker;
    const w = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const res = event.data;
      const entry = this.pending.get(res.id);
      if (!entry) return;
      this.pending.delete(res.id);
      if (res.kind === 'error') entry.reject(new Error(res.message));
      else entry.resolve(res);
    };
    w.onerror = (event) => {
      const message = event.message || 'the solver worker failed';
      for (const entry of this.pending.values()) entry.reject(new Error(message));
      this.pending.clear();
      // Replace the dead worker, so the next call starts a fresh one instead of hanging.
      this.worker?.terminate();
      this.worker = null;
    };
    this.worker = w;
    return w;
  }

  private call(req: Distribute<WorkerRequest>): Promise<WorkerResponse> {
    const worker = this.ensure();
    const id = this.nextId++;
    const message = { ...req, id } as WorkerRequest;
    return new Promise<WorkerResponse>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      worker.postMessage(message);
    });
  }

  /** Kill the running job; the pending promise rejects with a `CancelledError`. */
  cancel(): void {
    if (!this.worker) return;
    this.worker.terminate();
    this.worker = null;
    for (const entry of this.pending.values()) entry.reject(new CancelledError());
    this.pending.clear();
  }

  async generate(level: number): Promise<PuzzleInfo> {
    const res = await this.call({ kind: 'generate', level });
    return (res as { kind: 'puzzle'; info: PuzzleInfo }).info;
  }

  async fromBank(level: number, seen: number[]): Promise<PuzzleInfo> {
    const res = await this.call({ kind: 'bank', level, seen });
    return (res as { kind: 'puzzle'; info: PuzzleInfo }).info;
  }

  async daily(date: string, level: number): Promise<PuzzleInfo> {
    const res = await this.call({ kind: 'daily', date, level });
    return (res as { kind: 'puzzle'; info: PuzzleInfo }).info;
  }

  async analyze(puzzle: string): Promise<PuzzleInfo> {
    const res = await this.call({ kind: 'analyze', puzzle });
    return (res as { kind: 'puzzle'; info: PuzzleInfo }).info;
  }

  async hint(
    puzzle: string,
    values: number[],
    cands: number[],
    level: HintLevel,
    disabled: string[] = [],
  ): Promise<HintResult | null> {
    const res = await this.call({ kind: 'hint', puzzle, values, cands, level, disabled });
    return (res as { kind: 'hint'; hint: HintResult | null }).hint;
  }

  async allHints(
    puzzle: string,
    values: number[],
    cands: number[],
    level: HintLevel,
    disabled: string[] = [],
  ): Promise<{ results: HintResult[]; total: Record<string, number> }> {
    const res = await this.call({ kind: 'allHints', puzzle, values, cands, level, disabled });
    return res as { kind: 'allHints'; results: HintResult[]; total: Record<string, number> };
  }

  async path(puzzle: string, values: number[], cands: number[]): Promise<HintResult[]> {
    const res = await this.call({ kind: 'path', puzzle, values, cands });
    return (res as { kind: 'path'; steps: HintResult[] }).steps;
  }

  async prove(
    puzzle: string,
    values: number[],
    cands: number[],
    cell: number,
    digit: number,
  ): Promise<ProofResult> {
    const res = await this.call({ kind: 'prove', puzzle, values, cands, cell, digit });
    return (res as { kind: 'prove'; proof: ProofResult }).proof;
  }

  async candidates(puzzle: string, values: number[]): Promise<number[]> {
    const res = await this.call({ kind: 'candidates', puzzle, values });
    return (res as { kind: 'candidates'; cands: number[] }).cands;
  }

  async format(puzzle: string, values: number[], mode: CopyFormat): Promise<string> {
    const res = await this.call({ kind: 'format', puzzle, values, mode });
    return (res as { kind: 'format'; text: string }).text;
  }
}
