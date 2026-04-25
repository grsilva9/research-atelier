import { useMemo, useState } from 'react';
import { Trash2, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import type {
  Stage,
  TaskStatus,
  Impact,
  Probability,
  InfoGain,
  TimeSensitivity,
  Effort,
  TaskCriteria,
} from '@/types';
import {
  STAGES,
  STAGE_LABELS,
  TASK_STATUS_LABELS,
  IMPACT_LABELS,
  PROBABILITY_LABELS,
  INFO_GAIN_LABELS,
  TIME_SENSITIVITY_LABELS,
  EFFORT_LABELS,
} from '@/types';
import { useStore } from '@/state/store';
import { Button, Modal } from './ui/Primitives';
import { formatDate, relativeTime } from '@/lib/dates';
import { utility } from '@/lib/utility';

export const TaskDetailModal = ({
  taskId,
  onClose,
  onOpenPaper,
}: {
  taskId: string | null;
  onClose: () => void;
  onOpenPaper: (id: string) => void;
}) => {
  const task = useStore((s) =>
    taskId ? s.tasks.find((t) => t.id === taskId) : undefined,
  );
  const paper = useStore((s) =>
    task ? s.papers.find((p) => p.id === task.paperId) : undefined,
  );

  const updateTask = useStore((s) => s.updateTask);
  const setTaskStage = useStore((s) => s.setTaskStage);
  const setTaskStatus = useStore((s) => s.setTaskStatus);
  const deleteTask = useStore((s) => s.deleteTask);
  const setFocusTask = useStore((s) => s.setFocusTask);
  const clearFocus = useStore((s) => s.clearFocus);

  const open = useMemo(() => Boolean(task), [task]);

  if (!task || !paper) {
    return <Modal open={open} onClose={onClose} title="Task" children={null} />;
  }

  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[11px] font-mono text-ink-mute mb-1">
              {paper.shortName} · {STAGE_LABELS[task.stage]}
            </p>
            <input
              className="w-full bg-transparent font-serif text-xl outline-none focus:bg-white focus:px-2 focus:-mx-2 rounded transition-all"
              value={task.title}
              onChange={(e) => updateTask(task.id, { title: e.target.value })}
            />
          </div>
          <button
            onClick={() => {
              if (task.isFocus) clearFocus();
              else setFocusTask(task.id);
            }}
            className="p-1.5 hover:bg-paper-200 rounded-md shrink-0"
            title={task.isFocus ? "Remove today's focus" : "Make today's focus"}
          >
            <Star
              className={
                task.isFocus
                  ? 'w-4 h-4 fill-accent text-accent'
                  : 'w-4 h-4 text-ink-mute'
              }
            />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-label">Status</label>
            <select
              className="input mt-1"
              value={task.status}
              onChange={(e) =>
                setTaskStatus(task.id, e.target.value as TaskStatus)
              }
            >
              {(Object.entries(TASK_STATUS_LABELS) as [TaskStatus, string][]).map(
                ([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <label className="section-label">Stage</label>
            <select
              className="input mt-1"
              value={task.stage}
              onChange={(e) => setTaskStage(task.id, e.target.value as Stage)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {task.rationale && (
          <div>
            <label className="section-label">Why this task was suggested</label>
            <p className="text-sm text-ink-soft italic mt-1">{task.rationale}</p>
          </div>
        )}

        <CriteriaPanel taskId={task.id} criteria={task.criteria} />

        <div>
          <label className="section-label">Notes</label>
          <textarea
            className="textarea mt-1"
            rows={4}
            value={task.notes ?? ''}
            onChange={(e) => updateTask(task.id, { notes: e.target.value })}
            placeholder="Working notes, links, sub-steps..."
          />
        </div>

        <div className="text-[11px] text-ink-mute flex items-center gap-2">
          <span>Created {formatDate(task.createdAt)}</span>
          <span>·</span>
          <span>{relativeTime(task.createdAt)}</span>
          {task.completedAt && (
            <>
              <span>·</span>
              <span>Completed {relativeTime(task.completedAt)}</span>
            </>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-paper-300">
          <Button
            onClick={() => {
              if (confirm('Delete this task?')) {
                deleteTask(task.id);
                onClose();
              }
            }}
            className="text-signal-danger hover:border-signal-danger"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                onClose();
                onOpenPaper(paper.id);
              }}
            >
              Open {paper.shortName}
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ---------------------------------------------------------------------------
// CriteriaPanel — collapsible MCDM criteria editor for a task.
// Closed: shows the raw utility number and a hint of the criteria values.
// Open: five rows of three buttons each, editable.
// ---------------------------------------------------------------------------

const CriteriaPanel = ({
  taskId,
  criteria,
}: {
  taskId: string;
  criteria: TaskCriteria;
}) => {
  const updateTaskCriteria = useStore((s) => s.updateTaskCriteria);
  const [open, setOpen] = useState(false);

  // Raw utility (no switch cost — that's queue-context only).
  const u = utility(criteria, 0);

  return (
    <div className="border border-paper-300 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-paper-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="w-3.5 h-3.5 text-ink-mute" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-ink-mute" />
          )}
          <span className="text-sm font-medium">Priority criteria</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-ink-mute">
          <span title="Raw utility (V·P·(1+I)·T / C)">U = {u.toFixed(3)}</span>
          <span className="hidden sm:inline">
            V{criteria.impact} P{criteria.probability} I{criteria.infoGain}{' '}
            T{criteria.timeSensitivity} C{criteria.effort}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2.5 border-t border-paper-200 bg-paper-50/50">
          <CriteriaRow<Impact>
            label="Impact"
            value={criteria.impact}
            options={[0.3, 0.6, 1.0]}
            labels={IMPACT_LABELS}
            onChange={(v) => updateTaskCriteria(taskId, { impact: v })}
          />
          <CriteriaRow<Probability>
            label="Probability"
            value={criteria.probability}
            options={[0.4, 0.7, 0.9]}
            labels={PROBABILITY_LABELS}
            onChange={(v) => updateTaskCriteria(taskId, { probability: v })}
          />
          <CriteriaRow<InfoGain>
            label="Info gain"
            value={criteria.infoGain}
            options={[0, 0.5, 1.0]}
            labels={INFO_GAIN_LABELS}
            onChange={(v) => updateTaskCriteria(taskId, { infoGain: v })}
          />
          <CriteriaRow<TimeSensitivity>
            label="Time pressure"
            value={criteria.timeSensitivity}
            options={[0.3, 0.6, 1.0]}
            labels={TIME_SENSITIVITY_LABELS}
            onChange={(v) =>
              updateTaskCriteria(taskId, { timeSensitivity: v })
            }
          />
          <CriteriaRow<Effort>
            label="Effort"
            value={criteria.effort}
            options={[1, 2, 3]}
            labels={EFFORT_LABELS}
            onChange={(v) => updateTaskCriteria(taskId, { effort: v })}
          />
        </div>
      )}
    </div>
  );
};

function CriteriaRow<T extends number>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-2">
      <span className="text-xs text-ink-soft">{label}</span>
      <div className="grid grid-cols-3 gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={clsx(
              'px-2 py-1 rounded text-[11px] border transition-all',
              value === opt
                ? 'bg-accent-bg border-accent text-accent'
                : 'bg-white border-paper-300 text-ink-soft hover:border-paper-400',
            )}
          >
            {labels[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}
