import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import type {
  Stage,
  Impact,
  Probability,
  InfoGain,
  TimeSensitivity,
  Effort,
} from '@/types';
import {
  STAGES,
  STAGE_LABELS,
  STAGE_DESCRIPTIONS,
  IMPACT_LABELS,
  IMPACT_HELP,
  PROBABILITY_LABELS,
  PROBABILITY_HELP,
  INFO_GAIN_LABELS,
  INFO_GAIN_HELP,
  TIME_SENSITIVITY_LABELS,
  TIME_SENSITIVITY_HELP,
  EFFORT_LABELS,
  EFFORT_HELP,
} from '@/types';
import { useStore, selectActivePapers } from '@/state/store';
import { Button, Modal } from './ui/Primitives';

/**
 * NewTaskModal — creates a task with explicit MCDM criteria.
 *
 * Per user choice, criteria are ALWAYS prompted at creation — no defaults
 * auto-applied. The user must consciously rate the task on five dimensions:
 *   - Impact       (V)
 *   - Probability  (P)
 *   - Info gain    (I)
 *   - Time pressure (T)
 *   - Effort       (C)
 *
 * Switch cost S is computed automatically, not entered here.
 */

// No defaults chosen — start with no selection and require all five.
type PartialCriteria = {
  impact?: Impact;
  probability?: Probability;
  infoGain?: InfoGain;
  timeSensitivity?: TimeSensitivity;
  effort?: Effort;
};

export const NewTaskModal = ({
  open,
  onClose,
  initialStage,
  initialPaperId,
}: {
  open: boolean;
  onClose: () => void;
  initialStage?: Stage;
  initialPaperId?: string;
}) => {
  const activePapers = useStore(selectActivePapers);
  const addTask = useStore((s) => s.addTask);

  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<Stage>(initialStage ?? 'ideation');
  const [paperId, setPaperId] = useState(
    initialPaperId ?? activePapers[0]?.id ?? '',
  );
  const [criteria, setCriteria] = useState<PartialCriteria>({});

  useEffect(() => {
    if (open) {
      setStage(initialStage ?? 'ideation');
      setPaperId(initialPaperId ?? activePapers[0]?.id ?? '');
      setTitle('');
      setCriteria({});
    }
  }, [open, initialStage, initialPaperId, activePapers]);

  const complete =
    title.trim().length > 0 &&
    paperId !== '' &&
    criteria.impact !== undefined &&
    criteria.probability !== undefined &&
    criteria.infoGain !== undefined &&
    criteria.timeSensitivity !== undefined &&
    criteria.effort !== undefined;

  const handleCreate = () => {
    if (!complete) return;
    addTask({
      paperId,
      stage,
      title: title.trim(),
      criteria: {
        impact: criteria.impact!,
        probability: criteria.probability!,
        infoGain: criteria.infoGain!,
        timeSensitivity: criteria.timeSensitivity!,
        effort: criteria.effort!,
      },
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="New task" wide>
      <div className="space-y-4">
        {/* Task title */}
        <div>
          <label className="section-label">Task title</label>
          <input
            className="input mt-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='Concrete action, e.g. "Draft 3 paragraphs on Method limitations"'
            autoFocus
          />
          <p className="text-[11px] text-ink-mute mt-1">
            Start with a verb. A task you can begin in the next five minutes.
          </p>
        </div>

        {/* Paper + stage */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-label">Paper</label>
            <select
              className="input mt-1"
              value={paperId}
              onChange={(e) => setPaperId(e.target.value)}
            >
              {activePapers.length === 0 && (
                <option value="">No active papers</option>
              )}
              {activePapers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.shortName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="section-label">Stage</label>
            <select
              className="input mt-1"
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-[11px] text-ink-mute italic">
          {STAGE_DESCRIPTIONS[stage]}
        </p>

        {/* MCDM criteria */}
        <div className="pt-3 border-t border-paper-300">
          <div className="flex items-baseline justify-between mb-3">
            <label className="section-label">Priority criteria</label>
            <span className="text-[11px] text-ink-mute italic">
              All five required
            </span>
          </div>

          <div className="space-y-3">
            <CriteriaRow<Impact>
              label="Impact (V)"
              hint="How much does this move the paper toward acceptance?"
              value={criteria.impact}
              options={[0.3, 0.6, 1.0]}
              labels={IMPACT_LABELS}
              help={IMPACT_HELP}
              onChange={(v) => setCriteria({ ...criteria, impact: v })}
            />
            <CriteriaRow<Probability>
              label="Probability (P)"
              hint="How likely is this task to succeed?"
              value={criteria.probability}
              options={[0.4, 0.7, 0.9]}
              labels={PROBABILITY_LABELS}
              help={PROBABILITY_HELP}
              onChange={(v) => setCriteria({ ...criteria, probability: v })}
            />
            <CriteriaRow<InfoGain>
              label="Info gain (I)"
              hint="Does this reshape what you do next?"
              value={criteria.infoGain}
              options={[0, 0.5, 1.0]}
              labels={INFO_GAIN_LABELS}
              help={INFO_GAIN_HELP}
              onChange={(v) => setCriteria({ ...criteria, infoGain: v })}
            />
            <CriteriaRow<TimeSensitivity>
              label="Time pressure (T)"
              hint="How much does delay reduce its value?"
              value={criteria.timeSensitivity}
              options={[0.3, 0.6, 1.0]}
              labels={TIME_SENSITIVITY_LABELS}
              help={TIME_SENSITIVITY_HELP}
              onChange={(v) =>
                setCriteria({ ...criteria, timeSensitivity: v })
              }
            />
            <CriteriaRow<Effort>
              label="Effort (C)"
              hint="How much time and energy does it cost?"
              value={criteria.effort}
              options={[1, 2, 3]}
              labels={EFFORT_LABELS}
              help={EFFORT_HELP}
              onChange={(v) => setCriteria({ ...criteria, effort: v })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3 border-t border-paper-300">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!complete} onClick={handleCreate}>
            Add task
          </Button>
        </div>
      </div>
    </Modal>
  );
};

/**
 * Generic row of 3 buttons for picking one of three criterion values.
 * Typed on the value so TS knows which union each row operates over.
 */
function CriteriaRow<T extends number>({
  label,
  hint,
  value,
  options,
  labels,
  help,
  onChange,
}: {
  label: string;
  hint: string;
  value: T | undefined;
  options: T[];
  labels: Record<T, string>;
  help: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-[170px_1fr] items-start gap-3">
      <div>
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[10px] text-ink-mute">{hint}</p>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            title={help[opt]}
            className={clsx(
              'px-2 py-1.5 rounded-md text-xs border transition-all text-left',
              value === opt
                ? 'bg-accent-bg border-accent text-accent'
                : 'bg-white border-paper-300 text-ink-soft hover:border-paper-400',
            )}
          >
            <div className="font-medium">{labels[opt]}</div>
            <div className="text-[10px] text-ink-mute mt-0.5 line-clamp-1">
              {help[opt]}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
