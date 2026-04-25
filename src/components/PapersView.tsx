import { useMemo } from 'react';
import { clsx } from 'clsx';
import { Calendar, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Paper, Stage } from '@/types';
import { STAGES, STAGE_LABELS } from '@/types';
import {
  useStore,
  selectActivePapers,
  selectAllStageProgress,
  selectPaperCompletion,
  type StageProgress,
} from '@/state/store';
import { Badge } from './ui/Primitives';
import { relativeTime, daysUntil, daysSince } from '@/lib/dates';

export const PapersView = ({
  onOpenPaper,
}: {
  onOpenPaper: (id: string) => void;
}) => {
  const activePapers = useStore(selectActivePapers);
  const archivedPapers = useStore((s) =>
    s.papers.filter((p) => p.archived && !p.paused),
  );
  const pausedPapers = useStore((s) => s.papers.filter((p) => p.paused));

  if (activePapers.length === 0 && archivedPapers.length === 0 && pausedPapers.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-sm text-ink-mute italic">
          No papers yet. Add one from the sidebar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-6 py-6 space-y-10">
        {activePapers.length > 0 && (
          <section>
            <h2 className="section-label mb-3">Active</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activePapers.map((p) => (
                <PaperProgressCard key={p.id} paper={p} onOpen={() => onOpenPaper(p.id)} />
              ))}
            </div>
          </section>
        )}

        {archivedPapers.length > 0 && (
          <section>
            <h2 className="section-label mb-3">Archived</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {archivedPapers.map((p) => (
                <PaperProgressCard
                  key={p.id}
                  paper={p}
                  onOpen={() => onOpenPaper(p.id)}
                  dimmed
                />
              ))}
            </div>
          </section>
        )}

        {pausedPapers.length > 0 && (
          <section>
            <h2 className="section-label mb-3">Paused</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pausedPapers.map((p) => (
                <PaperProgressCard
                  key={p.id}
                  paper={p}
                  onOpen={() => onOpenPaper(p.id)}
                  dimmed
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

const PaperProgressCard = ({
  paper,
  onOpen,
  dimmed,
}: {
  paper: Paper;
  onOpen: () => void;
  dimmed?: boolean;
}) => {
  const stageProgress = useStore((s) => selectAllStageProgress(s, paper.id));
  const completion = useStore((s) => selectPaperCompletion(s, paper.id));

  const dl = daysUntil(paper.deadline);
  const idleDays = daysSince(paper.updatedAt);
  const isStale = idleDays >= 14 && !paper.paused && !paper.archived;

  const totalDone = useMemo(
    () => Object.values(stageProgress).filter((sp) => sp.effectivelyDone).length,
    [stageProgress],
  );

  return (
    <button
      onClick={onOpen}
      className={clsx(
        'card card-hover text-left p-5 w-full group focus:outline-none focus:ring-2 focus:ring-accent/30',
        dimmed && 'opacity-60',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-serif text-lg leading-snug truncate">{paper.title}</h3>
          <p className="text-xs text-ink-mute font-mono mt-0.5 truncate">
            {paper.shortName}
            {paper.venue && ` · ${paper.venue}`}
          </p>
        </div>
        {isStale && (
          <span title={`Idle ${idleDays} days`} className="shrink-0 mt-1">
            <AlertTriangle className="w-3.5 h-3.5 text-signal-warn" />
          </span>
        )}
      </div>

      {/* Overall completion */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] uppercase tracking-wider text-ink-mute">
            Overall
          </span>
          <span className="text-xs font-mono text-ink-soft tabular-nums">
            {totalDone}/{STAGES.length} stages · {Math.round(completion * 100)}%
          </span>
        </div>
        <div className="h-1.5 bg-paper-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${Math.round(completion * 100)}%` }}
          />
        </div>
      </div>

      {/* Per-stage breakdown */}
      <div className="space-y-1.5">
        {STAGES.map((stage) => (
          <StageRow key={stage} stage={stage} progress={stageProgress[stage]} />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-paper-200 flex items-center justify-between text-[11px] text-ink-mute">
        <div className="flex items-center gap-1.5">
          {dl !== null && (
            <Badge tone={dl < 7 ? 'danger' : dl < 21 ? 'warn' : 'neutral'}>
              <Calendar className="w-3 h-3" />
              {dl < 0 ? `${-dl}d overdue` : `${dl}d left`}
            </Badge>
          )}
          {paper.paused && <Badge tone="warn">paused</Badge>}
          {paper.archived && <Badge tone="neutral">archived</Badge>}
        </div>
        <span>Updated {relativeTime(paper.updatedAt)}</span>
      </div>
    </button>
  );
};

const StageRow = ({
  stage,
  progress,
}: {
  stage: Stage;
  progress: StageProgress;
}) => {
  const pct =
    progress.total === 0
      ? 0
      : Math.round((progress.done / progress.total) * 100);

  const displayPct = progress.effectivelyDone ? 100 : pct;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-wider text-ink-mute w-[84px] shrink-0 truncate">
        {STAGE_LABELS[stage]}
      </span>
      <div className="flex-1 h-1 bg-paper-200 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full transition-all duration-300',
            progress.effectivelyDone ? 'bg-signal-ok' : 'bg-accent-soft',
          )}
          style={{ width: `${displayPct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-ink-mute w-14 text-right tabular-nums shrink-0">
        {progress.total === 0 ? '—' : `${progress.done}/${progress.total}`}
      </span>
      {progress.effectivelyDone && (
        <CheckCircle2 className="w-3 h-3 text-signal-ok shrink-0" />
      )}
      {progress.manualOverrideWithOpen && (
        <span title="Marked done but open tasks exist">
          <AlertTriangle className="w-3 h-3 text-signal-warn shrink-0" />
        </span>
      )}
    </div>
  );
};
