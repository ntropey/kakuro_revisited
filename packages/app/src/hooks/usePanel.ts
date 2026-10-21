/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * Which tool panel is open, and how far the bottom sheet is pulled up on small screens.
 */
import { useState } from 'react';
import type { Snap } from '../components/BottomSheet';

export type PanelKind = 'coach' | 'hints' | 'combinations' | 'path' | 'share' | 'settings' | 'prove' | 'stats' | null;

export function usePanel(wide: boolean) {
  const [panel, setPanel] = useState<PanelKind>(null);
  const [snap, setSnap] = useState<Snap>('peek');

  const openPanel = (kind: PanelKind) => {
    setPanel(kind);
    if (!wide) setSnap('half');
  };
  const closePanel = () => setPanel(null);

  return { panel, snap, setSnap, openPanel, closePanel };
}
