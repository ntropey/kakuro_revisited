/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The bottom sheet for small screens: three snap points, dragged by the handle.
 */
import { useRef, useState, type ReactNode } from 'react';

export type Snap = 'peek' | 'half' | 'full';
const ORDER: Snap[] = ['peek', 'half', 'full'];

export interface BottomSheetProps {
  snap: Snap;
  onSnap: (s: Snap) => void;
  children: ReactNode;
}

/** Holds the side panel under 960px: three snap points, dragged by the handle or toggled by a tap. */
export function BottomSheet({ snap, onSnap, children }: BottomSheetProps) {
  const start = useRef<{ y: number; moved: boolean } | null>(null);
  const [drag, setDrag] = useState(0);
  const isOpen = snap !== 'peek';

  const end = (e: React.PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    start.current = null;
    setDrag(0);
    if (!s) return;
    const dy = e.clientY - s.y;
    const i = ORDER.indexOf(snap);
    if (!s.moved) {
      // A tap on the handle toggles between closed and open, so the sheet never traps the screen.
      onSnap(isOpen ? 'peek' : 'half');
    } else if (dy < -40) {
      onSnap(ORDER[Math.min(2, i + 1)]);
    } else if (dy > 40) {
      onSnap(ORDER[Math.max(0, i - 1)]);
    }
  };

  return (
    <div
      className={`sheet snap-${snap}`}
      style={drag ? { transform: `translateY(${drag}px)` } : undefined}
    >
      <button
        type="button"
        className="sheet-handle"
        onPointerDown={(e) => {
          start.current = { y: e.clientY, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          const dy = e.clientY - s.y;
          if (Math.abs(dy) > 6) s.moved = true;
          setDrag(dy);
        }}
        onPointerUp={end}
        onClick={(e) => {
          // A keyboard or switch activation has no pointer detail; toggle like a tap.
          if (e.detail === 0) onSnap(isOpen ? 'peek' : 'half');
        }}
        onPointerCancel={() => {
          start.current = null;
          setDrag(0);
        }}
        aria-label="Resize the panel"
      >
        <span className="grip" aria-hidden="true" />
      </button>
      <div className="sheet-body">{children}</div>
    </div>
  );
}
