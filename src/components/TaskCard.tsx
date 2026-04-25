import { clsx } from 'clsx';
import { Circle, Clock, CheckCircle2, Star, Sparkles } from 'lucide-react';
import type { Task } from '@/types';
import { useStore } from '@/state/store';
import { relativeTime, daysSince } from '@/lib/dates';

export const TaskCard = ({
  task,
  onClick,
  dragHandleProps,
}: {
  task: Task;
  onClick?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}) => {
  const paper = useStore((s) => s.papers.find((p) => p.id === task.paperId));
  const setTaskStatus = useStore((s) => s.setTaskStatus);

  const age = daysSince(task.createdAt);

  const cycleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next =
      task.status === 'todo'
        ? 'in_progress'
        : task.status === 'in_progress'
          ? 'done'
          : 'todo';
    setTaskStatus(task.id, next);
  };

  return (
    <div
      {...dragHandleProps}
      onClick={onClick}
      className={clsx(
        'card card-hover p-3 cursor-pointer group',
        task.status === 'done' && 'opacity-60',
        task.isFocus && 'ring-2 ring-accent/50',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          onClick={cycleStatus}
          className="mt-0.5 shrink-0"
          title={`Status: ${task.status}. Click to cycle.`}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {task.status === 'done' ? (
            <CheckCircle2 className="w-4 h-4 text-signal-ok" />
          ) : task.status === 'in_progress' ? (
            <Clock className="w-4 h-4 text-accent" />
          ) : (
            <Circle className="w-4 h-4 text-ink-mute hover:text-ink" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={clsx(
              'text-sm leading-snug',
              task.status === 'done' && 'line-through',
            )}
          >
            {task.title}
          </p>

          {task.rationale && (
            <p className="text-[11px] text-ink-mute italic mt-1 line-clamp-2">
              {task.rationale}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-ink-mute">
            <span className="truncate max-w-[140px]">
              {paper?.shortName ?? '—'}
            </span>
            <span>·</span>
            <span>{relativeTime(task.createdAt)}</span>
            {task.source === 'suggested' && (
              <Sparkles className="w-2.5 h-2.5 text-accent" />
            )}
          </div>
        </div>

        {task.isFocus && (
          <Star className="w-3.5 h-3.5 fill-accent text-accent shrink-0 mt-0.5" />
        )}
      </div>

      {task.status === 'in_progress' && age > 7 && (
        <div className="mt-2 text-[10px] text-signal-warn">
          stale — {age} days in progress
        </div>
      )}
    </div>
  );
};
