import { useMemo } from 'react';
import { Check, X, Sparkles, Star, Clock, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useStore } from '@/state/store';
import { buildQueue, type QueueItem } from '@/state/suggestions';
import { STAGE_LABELS } from '@/types';
import { Badge, Button } from './ui/Primitives';
import { formatDate } from '@/lib/dates';
import { normalizeScores } from '@/lib/utility';

export const FocusView = ({
  onOpenTask,
  onOpenPaper,
}: {
  onOpenTask: (id: string) => void;
  onOpenPaper: (id: string) => void;
}) => {
  const state = useStore();
  const acceptSuggestion = useStore((s) => s.acceptSuggestion);
  const dismissSuggestion = useStore((s) => s.dismissSuggestion);
  const setTaskStatus = useStore((s) => s.setTaskStatus);
  const setFocusTask = useStore((s) => s.setFocusTask);

  const queue = useMemo(() => buildQueue(state), [state]);

  // Normalize utility values to 0-100 across the whole queue.
  // This gives each item a comparable priority score for display.
  const priorityMap = useMemo(() => {
    const values = queue.map((q) => q.utility);
    const norms = normalizeScores(values);
    const map = new Map<string, number>();
    queue.forEach((q, i) => {
      const key = q.task?.id ?? q.suggestion?.id ?? String(i);
      map.set(key, norms[i]);
    });
    return map;
  }, [queue]);

  const keyOf = (q: QueueItem): string =>
    q.task?.id ?? q.suggestion?.id ?? q.title;

  const top = queue[0];
  const rest = queue.slice(1);

  const paperName = (id: string) =>
    state.papers.find((p) => p.id === id)?.shortName ?? '—';

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <p className="section-label">
            {formatDate(new Date().toISOString(), 'EEEE, MMMM d')}
          </p>
          <h1 className="font-serif text-3xl mt-1">One thing today</h1>
          <p className="text-sm text-ink-mute mt-1">
            The single task to put your weight behind. Below, a ranked queue of
            everything else worth considering.
          </p>
        </div>

        {/* The Focus */}
        <FocusCard
          item={top}
          paperName={top ? paperName(top.paperId) : ''}
          onOpenTask={onOpenTask}
          onOpenPaper={onOpenPaper}
          onAccept={(item) => {
            if (item.suggestion) {
              const task = acceptSuggestion(item.suggestion);
              if (task) setFocusTask(task.id);
            }
          }}
          onComplete={(item) => {
            if (item.task) setTaskStatus(item.task.id, 'done');
          }}
          onStart={(item) => {
            if (item.task) setTaskStatus(item.task.id, 'in_progress');
          }}
        />

        {/* The rest of the queue */}
        {rest.length > 0 && (
          <div className="mt-10">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-serif text-xl">Queue</h2>
              <span className="text-xs text-ink-mute">
                Ranked by leverage · {rest.length} item{rest.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="space-y-2">
              {rest.map((item, idx) => (
                <QueueRow
                  key={(item.task?.id ?? item.suggestion?.id) + ':' + idx}
                  item={item}
                  paperName={paperName(item.paperId)}
                  priority={priorityMap.get(keyOf(item)) ?? 0}
                  onOpenTask={onOpenTask}
                  onAccept={() => {
                    if (item.suggestion) acceptSuggestion(item.suggestion);
                  }}
                  onDismiss={() => {
                    if (item.suggestion) dismissSuggestion(item.suggestion);
                  }}
                  onToggleStatus={() => {
                    if (item.task) {
                      const next =
                        item.task.status === 'done' ? 'todo' : 'done';
                      setTaskStatus(item.task.id, next);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FocusCard = ({
  item,
  paperName,
  onOpenTask,
  onOpenPaper,
  onAccept,
  onComplete,
  onStart,
}: {
  item: QueueItem | undefined;
  paperName: string;
  onOpenTask: (id: string) => void;
  onOpenPaper: (id: string) => void;
  onAccept: (item: QueueItem) => void;
  onComplete: (item: QueueItem) => void;
  onStart: (item: QueueItem) => void;
}) => {
  if (!item) {
    return (
      <div className="card p-8 text-center">
        <p className="font-serif text-xl text-ink-soft">Inbox zero.</p>
        <p className="text-sm text-ink-mute mt-2">
          No open tasks, no suggestions. Add a paper, add a task, or take a real break.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-accent-bg rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          {item.isFocus ? (
            <Badge tone="accent">
              <Star className="w-3 h-3 fill-current" /> Focus
            </Badge>
          ) : item.kind === 'suggestion' ? (
            <Badge tone="accent">
              <Sparkles className="w-3 h-3" /> Suggested
            </Badge>
          ) : item.taskStatus === 'in_progress' ? (
            <Badge tone="accent">
              <Clock className="w-3 h-3" /> In progress
            </Badge>
          ) : (
            <Badge tone="neutral">To do</Badge>
          )}
          <span className="text-xs font-mono text-ink-mute">
            {paperName} · {STAGE_LABELS[item.stage]}
          </span>
        </div>

        <h2 className="font-serif text-2xl leading-snug mb-2">{item.title}</h2>
        {item.rationale && (
          <p className="text-sm text-ink-soft italic mb-4">{item.rationale}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {item.kind === 'suggestion' ? (
            <Button variant="primary" onClick={() => onAccept(item)}>
              <Check className="w-4 h-4" /> Accept as task
            </Button>
          ) : item.taskStatus === 'done' ? null : (
            <>
              {item.taskStatus === 'todo' && (
                <Button variant="primary" onClick={() => onStart(item)}>
                  <Clock className="w-4 h-4" /> Start
                </Button>
              )}
              <Button onClick={() => onComplete(item)}>
                <Check className="w-4 h-4" /> Mark done
              </Button>
              {item.task && (
                <Button onClick={() => onOpenTask(item.task!.id)}>Details</Button>
              )}
            </>
          )}
          <Button onClick={() => onOpenPaper(item.paperId)}>
            Open {paperName}
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const QueueRow = ({
  item,
  paperName,
  priority,
  onOpenTask,
  onAccept,
  onDismiss,
  onToggleStatus,
}: {
  item: QueueItem;
  paperName: string;
  priority: number;
  onOpenTask: (id: string) => void;
  onAccept: () => void;
  onDismiss: () => void;
  onToggleStatus: () => void;
}) => {
  const isSuggestion = item.kind === 'suggestion';
  return (
    <div
      className={clsx(
        'card p-3 flex items-start gap-3 group transition-colors',
        item.taskStatus === 'done' && 'opacity-50',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={clsx(
              'text-sm font-medium',
              item.taskStatus === 'done' && 'line-through',
            )}
          >
            {item.title}
          </p>
          {isSuggestion && (
            <Sparkles className="w-3 h-3 text-accent shrink-0" />
          )}
          {item.taskStatus === 'in_progress' && (
            <Badge tone="accent">
              <Clock className="w-3 h-3" />
              in progress
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-mute font-mono">
          <span>{paperName}</span>
          <span>·</span>
          <span>{STAGE_LABELS[item.stage]}</span>
          <span>·</span>
          <span title="Priority (0-100, normalized across queue)">
            P{priority}
          </span>
        </div>
        {item.rationale && (
          <p className="text-[11px] text-ink-mute italic mt-1 line-clamp-2">
            {item.rationale}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {isSuggestion ? (
          <>
            <button
              onClick={onAccept}
              className="p-1.5 hover:bg-paper-200 rounded"
              title="Accept as task"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDismiss}
              className="p-1.5 hover:bg-paper-200 rounded"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onToggleStatus}
              className="p-1.5 hover:bg-paper-200 rounded"
              title={
                item.taskStatus === 'done' ? 'Mark not done' : 'Mark done'
              }
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => item.task && onOpenTask(item.task.id)}
              className="text-xs text-accent px-2 py-1 hover:underline"
            >
              open
            </button>
          </>
        )}
      </div>
    </div>
  );
};
