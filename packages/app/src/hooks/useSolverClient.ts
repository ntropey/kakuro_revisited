/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The solver worker, started on first use and shared for the life of the app.
 */
import { useCallback, useRef } from 'react';
import { SolverClient } from '../solverClient';

export function useSolverClient(): () => SolverClient {
  const ref = useRef<SolverClient | null>(null);
  return useCallback(() => {
    if (!ref.current) ref.current = new SolverClient();
    return ref.current;
  }, []);
}
