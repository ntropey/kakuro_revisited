/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The AI Coach panel: a progressive four stage walkthrough of the next human step.
 */
import type { CoachStage } from '../protocol';

export interface CoachPanelProps {
  stages: CoachStage[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
  /** Put the digits of the last stage into the board. */
  onApply?: () => void;
}

export function CoachPanel({ stages, index, onIndex, onClose, onApply }: CoachPanelProps) {
  if (stages.length === 0) {
    return (
      <div className="panel coach-panel">
        <h2>Coach me</h2>
        <p className="empty">No step is available right now. Fill in a few more digits and ask again.</p>
        <button type="button" className="ghost" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }
  const stage = stages[Math.min(index, stages.length - 1)];
  const last = index >= stages.length - 1;
  return (
    <div className="panel coach-panel">
      <div className="panel-head">
        <h2>Coach me</h2>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close the coach">
          ✕
        </button>
      </div>
      <ol className="coach-steps">
        {stages.map((s, i) => (
          <li key={s.label} className={i === index ? 'current' : i < index ? 'done' : ''}>
            <button type="button" onClick={() => onIndex(i)}>
              {s.label}
            </button>
          </li>
        ))}
      </ol>
      <div className="coach-stage">
        <h3>{stage.label}</h3>
        <p>{stage.text}</p>
      </div>
      <div className="panel-actions">
        <button type="button" onClick={() => onIndex(Math.max(0, index - 1))} disabled={index === 0}>
          Back
        </button>
        {last && onApply ? (
          <button type="button" className="primary" onClick={onApply}>
            Apply
          </button>
        ) : (
          <button type="button" className="primary" onClick={() => onIndex(index + 1)}>
            Next
          </button>
        )}
      </div>
    </div>
  );
}
