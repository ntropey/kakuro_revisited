/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The "Why not?" panel: pick a candidate digit and read the contradiction proof.
 */
import type { CoachStage, ProofResult } from '../protocol';

export interface ProofPanelProps {
  /** The cell the player is asking about, -1 when none is selected. */
  cell: number;
  /** The cell name, e.g. "r2c3". */
  cellLabel: string;
  /** The cell name of the proof that is on screen, so it still reads right after the selection moved. */
  proofLabel: string;
  /** The digits the player can still write in the cell. */
  candidates: number[];
  busy: boolean;
  proof: ProofResult | null;
  stageIndex: number;
  onStageIndex: (index: number) => void;
  onProve: (digit: number) => void;
  onClose: () => void;
}

export function ProofPanel({
  cell,
  cellLabel,
  proofLabel,
  candidates,
  busy,
  proof,
  stageIndex,
  onStageIndex,
  onProve,
  onClose,
}: ProofPanelProps) {
  return (
    <div className="panel proof-panel">
      <div className="panel-head">
        <h2>Why not?</h2>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close the proof">
          ✕
        </button>
      </div>
      {cell < 0 ? (
        <p className="empty">Select a cell on the board first.</p>
      ) : (
        <>
          <p className="hint-text">
            Pick a digit for <strong>{cellLabel}</strong> and the coach will show why it works or why it
            cannot.
          </p>
          <div className="candidate-row">
            {candidates.length === 0 ? (
              <span className="empty">No candidate is left in this cell.</span>
            ) : (
              candidates.map((d) => (
                <button key={d} type="button" className="candidate" onClick={() => onProve(d)} disabled={busy}>
                  {d}
                </button>
              ))
            )}
          </div>
          {busy ? <p className="empty">Thinking…</p> : null}
          {proof ? (
            <>
              <h3 className={proof.verdict === 'conflict' ? 'verdict conflict' : 'verdict valid'}>
                {proof.verdict === 'conflict'
                  ? `${proof.digit} cannot be in ${proofLabel}`
                  : `${proof.digit} fits ${proofLabel}`}
              </h3>
              <ol className="coach-steps">
                {proof.stages.map((s: CoachStage, i: number) => (
                  <li key={s.label} className={i === stageIndex ? 'current' : i < stageIndex ? 'done' : ''}>
                    <button type="button" onClick={() => onStageIndex(i)}>
                      {s.label}
                    </button>
                  </li>
                ))}
              </ol>
              <div className="coach-stage">
                <h3>{proof.stages[Math.min(stageIndex, proof.stages.length - 1)]?.label}</h3>
                <p>{proof.stages[Math.min(stageIndex, proof.stages.length - 1)]?.text}</p>
              </div>
              <div className="panel-actions">
                <button
                  type="button"
                  onClick={() => onStageIndex(Math.max(0, stageIndex - 1))}
                  disabled={stageIndex === 0}
                >
                  Back
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => onStageIndex(Math.min(proof.stages.length - 1, stageIndex + 1))}
                  disabled={stageIndex >= proof.stages.length - 1}
                >
                  Next
                </button>
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
