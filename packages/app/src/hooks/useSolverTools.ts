/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * The solver-backed tools: the coach walkthrough, the technique list and the "Why not?" proof,
 * with the marks they draw on the board.
 */
import { useState } from 'react';
import type { StepMarks } from '@kakuro/core';
import type { GameState } from '../game';
import type { CoachStage, HintResult, ProofResult } from '../protocol';
import { isCancelled, type SolverClient } from '../solverClient';
import type { Settings } from '../ui';
import type { PanelKind } from './usePanel';

export interface SolverToolsOptions {
  getClient: () => SolverClient;
  game: GameState | null;
  settings: Settings;
  openPanel: (kind: PanelKind) => void;
  setBusy: (busy: boolean) => void;
  setStatus: (status: string) => void;
}

type HintLevelSetting = 0 | 1 | 2 | 3 | 4 | 5;

export function useSolverTools({ getClient, game, settings, openPanel, setBusy, setStatus }: SolverToolsOptions) {
  const [marks, setMarks] = useState<StepMarks | null>(null);
  const [coachStages, setCoachStages] = useState<CoachStage[]>([]);
  const [coachIndex, setCoachIndex] = useState(0);
  const [proof, setProof] = useState<ProofResult | null>(null);
  const [proofIndex, setProofIndex] = useState(0);
  const [proofBusy, setProofBusy] = useState(false);
  const [hints, setHints] = useState<HintResult[]>([]);
  const [hintTotals, setHintTotals] = useState<Record<string, number>>({});
  const [hintsBusy, setHintsBusy] = useState(false);

  const hintLevel = settings.hintLevel as HintLevelSetting;

  /** Drop everything the tools showed, for a new puzzle. */
  const reset = () => {
    setMarks(null);
    setCoachStages([]);
    setCoachIndex(0);
    setProof(null);
    setProofIndex(0);
    setHints([]);
  };

  const openCoach = async () => {
    if (!game) return;
    openPanel('coach');
    setBusy(true);
    try {
      const hint = await getClient().hint(game.puzzle, game.values, game.cands, hintLevel);
      setCoachStages(hint?.coach ?? []);
      setCoachIndex(0);
      setMarks(hint?.marks ?? null);
    } catch (e) {
      if (!isCancelled(e)) setStatus(e instanceof Error ? e.message : 'The coach is not available.');
      setCoachStages([]);
    } finally {
      setBusy(false);
    }
  };

  const goToCoachStage = (i: number) => {
    setCoachIndex(i);
    setMarks(coachStages[i]?.marks ?? null);
  };

  const openHints = async () => {
    if (!game) return;
    openPanel('hints');
    setHintsBusy(true);
    try {
      const res = await getClient().allHints(game.puzzle, game.values, game.cands, hintLevel);
      setHints(res.results);
      setHintTotals(res.total);
    } catch (e) {
      if (!isCancelled(e)) setStatus(e instanceof Error ? e.message : 'The hints are not available.');
    } finally {
      setHintsBusy(false);
    }
  };

  /** Show a technique from the list on the board and in the coach. */
  const pickHint = (hint: HintResult) => {
    setMarks(hint.marks);
    openPanel('coach');
    setCoachStages(hint.coach ?? []);
    setCoachIndex(0);
  };

  const openProve = () => {
    openPanel('prove');
    setProof(null);
    setProofIndex(0);
    setMarks(null);
  };

  const runProve = async (digit: number) => {
    if (!game || game.selected < 0) return;
    setProofBusy(true);
    try {
      const result = await getClient().prove(game.puzzle, game.values, game.cands, game.selected, digit);
      setProof(result);
      setProofIndex(0);
      setMarks(result.stages[0]?.marks ?? null);
    } catch (e) {
      if (!isCancelled(e)) setStatus(e instanceof Error ? e.message : 'The proof failed.');
    } finally {
      setProofBusy(false);
    }
  };

  const goToProofStage = (i: number) => {
    setProofIndex(i);
    setMarks(proof?.stages[i]?.marks ?? null);
  };

  return {
    marks,
    setMarks,
    reset,
    coachStages,
    coachIndex,
    openCoach,
    goToCoachStage,
    hints,
    hintTotals,
    hintsBusy,
    openHints,
    pickHint,
    proof,
    proofIndex,
    proofBusy,
    openProve,
    runProve,
    goToProofStage,
  };
}

export type SolverTools = ReturnType<typeof useSolverTools>;
