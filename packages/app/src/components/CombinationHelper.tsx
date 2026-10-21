/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The sum combination helper: every way to fill a run of a given length with a given sum.
 */
import { useMemo, useState } from 'react';
import { getPartitions, isMagicBlock, maxSumForLength, minSumForLength } from '@kakuro/core';

export interface CombinationHelperProps {
  /** The run the player is looking at, so the helper can start there. */
  initial?: { length: number; sum: number } | null;
}

export function CombinationHelper({ initial }: CombinationHelperProps) {
  const [length, setLength] = useState(initial?.length ?? 2);
  const [sum, setSum] = useState(initial?.sum ?? 16);
  const partitions = useMemo(() => getPartitions(length, sum), [length, sum]);
  const magic = isMagicBlock(length, sum);
  const min = minSumForLength(length);
  const max = maxSumForLength(length);

  return (
    <div className="panel combination-helper">
      <h2>Sum combinations</h2>
      <p className="hint-text">
        Pick the length of the run and its sum to see every way the digits can be placed.
      </p>
      <div className="helper-controls">
        <label>
          Cells
          <select value={length} onChange={(e) => setLength(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sum
          <input
            type="number"
            min={min}
            max={max}
            value={sum}
            onChange={(e) => setSum(Number(e.target.value))}
          />
        </label>
      </div>
      <p className="helper-range">
        {length} cells can add up to anything between {min} and {max}.
      </p>
      {partitions.length === 0 ? (
        <p className="empty">No set of {length} different digits adds up to {sum}.</p>
      ) : (
        <>
          <p className="helper-count">
            {partitions.length} {partitions.length === 1 ? 'way' : 'ways'}
            {magic ? ' — a Magic Block, the digits are forced' : ''}
          </p>
          <ul className="partition-list">
            {partitions.map((p) => (
              <li key={p.mask} className={p.length === 2 ? 'pair' : ''}>
                {p.digits.join(' + ')} = {p.sum}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
