/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The share card: a text summary of the finished puzzle that can be copied or shared.
 */
import { useState } from 'react';
import { buildShareText, type ShareInfo } from '../share';

export interface DailyShareProps {
  info: ShareInfo;
  onClose: () => void;
}

export function DailyShare({ info, onClose }: DailyShareProps) {
  const [copied, setCopied] = useState(false);
  const text = buildShareText(info);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const share = async () => {
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: 'Kakuro Revisited', text });
        return;
      } catch {
        /* the player canceled the share sheet */
      }
    }
    await copy();
  };

  return (
    <div className="panel share-panel">
      <div className="panel-head">
        <h2>{info.daily ? 'Daily Puzzle' : 'Share'}</h2>
        <button type="button" className="ghost" onClick={onClose} aria-label="Close the share card">
          ✕
        </button>
      </div>
      <pre className="share-card">{text}</pre>
      <div className="panel-actions">
        <button type="button" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className="primary" onClick={share}>
          Share
        </button>
      </div>
    </div>
  );
}
