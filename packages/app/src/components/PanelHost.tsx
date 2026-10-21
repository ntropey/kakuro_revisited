/*
 * Kakuro Revisited PWA. GPL-3.0-or-later; see LICENSE.
 * Draws whichever tool panel is open, or the idle panel when none is.
 */
import type { KakuroCellDef } from '@kakuro/core';
import { allowedDigits, cellLabel, whiteProgress, type GameState } from '../game';
import type { PanelKind } from '../hooks/usePanel';
import type { Records } from '../hooks/useRecords';
import type { SolverTools } from '../hooks/useSolverTools';
import { levelName, type Settings } from '../ui';
import { CoachPanel } from './CoachPanel';
import { CombinationHelper } from './CombinationHelper';
import { DailyShare } from './DailyShare';
import { HintsPanel } from './HintsPanel';
import { IdlePanel } from './IdlePanel';
import { PathPanel } from './PathPanel';
import { ProofPanel } from './ProofPanel';
import { SettingsSheet } from './SettingsSheet';
import { StatsPanel } from './StatsPanel';

export interface PanelHostProps {
  panel: PanelKind;
  game: GameState | null;
  cells: readonly KakuroCellDef[];
  elapsedMs: number;
  settings: Settings;
  tools: SolverTools;
  records: Records;
  onSettings: (next: Settings) => void;
  onOpen: (kind: PanelKind) => void;
  onClose: () => void;
  /** Write the shown coach step into the board. */
  onApplyCoach: () => void;
}

export function PanelHost({
  panel,
  game,
  cells,
  elapsedMs,
  settings,
  tools,
  records,
  onSettings,
  onOpen,
  onClose,
  onApplyCoach,
}: PanelHostProps) {
  /** Close a panel that drew marks on the board, and take the marks away with it. */
  const closeAndClearMarks = () => {
    onClose();
    tools.setMarks(null);
  };

  switch (panel) {
    case 'coach':
      return (
        <CoachPanel
          stages={tools.coachStages}
          index={tools.coachIndex}
          onIndex={tools.goToCoachStage}
          onClose={closeAndClearMarks}
          onApply={onApplyCoach}
        />
      );
    case 'hints':
      return (
        <HintsPanel
          results={tools.hints}
          total={tools.hintTotals}
          busy={tools.hintsBusy}
          onPick={tools.pickHint}
          onClose={onClose}
        />
      );
    case 'combinations':
      return <CombinationHelper />;
    case 'path':
      return <PathPanel path={game?.path ?? []} onClose={onClose} />;
    case 'share':
      return (
        <DailyShare
          info={{
            solution: game?.solution ?? [],
            level: game?.level ?? 1,
            levelName: levelName(game?.level ?? 1),
            elapsedMs,
            daily: game?.daily,
            hintsUsed: game?.hintsUsed ?? 0,
            layout: game?.layout,
          }}
          onClose={onClose}
        />
      );
    case 'stats':
      return <StatsPanel stats={records.stats} streak={records.streak} history={records.history} onClose={onClose} />;
    case 'settings':
      return <SettingsSheet settings={settings} onChange={onSettings} onClose={onClose} />;
    case 'prove':
      return (
        <ProofPanel
          cell={game?.selected ?? -1}
          cellLabel={cellLabel(game?.selected ?? -1)}
          proofLabel={cellLabel(tools.proof?.cell ?? game?.selected ?? -1)}
          candidates={game ? allowedDigits(cells, game) : []}
          busy={tools.proofBusy}
          proof={tools.proof}
          stageIndex={tools.proofIndex}
          onStageIndex={tools.goToProofStage}
          onProve={tools.runProve}
          onClose={closeAndClearMarks}
        />
      );
    default: {
      if (!game) return null;
      const { filled, total } = whiteProgress(cells, game);
      return (
        <IdlePanel
          filled={filled}
          total={total}
          onCoach={() => void tools.openCoach()}
          onHints={() => void tools.openHints()}
          onCombinations={() => onOpen('combinations')}
        />
      );
    }
  }
}
