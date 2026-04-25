import { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Pause,
  Archive,
  Play,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { IdeationSubstage, MaturityLevel, Stage, TaskStatus } from '@/types';
import {
  STAGES,
  STAGE_LABELS,
  STAGE_DESCRIPTIONS,
  IDEATION_SUBSTAGES,
  IDEATION_SUBSTAGE_LABELS,
  MATURITY_LABELS,
} from '@/types';
import {
  useStore,
  selectAllStageProgress,
  selectTasksForPaper,
  selectDiaryForPaper,
  selectPaperCompletion,
  type StageProgress,
} from '@/state/store';
import {
  Badge,
  Button,
  Divider,
  LevelDots,
} from './ui/Primitives';
import { formatDate, relativeTime } from '@/lib/dates';

export const PaperDetail = ({
  paperId,
  onClose,
  onAddTask,
  onOpenTask,
}: {
  paperId: string;
  onClose: () => void;
  onAddTask: (stage: Stage, paperId: string) => void;
  onOpenTask: (id: string) => void;
}) => {
  const paper = useStore((s) => s.papers.find((p) => p.id === paperId));
  const stageProgress = useStore((s) =>
    paper ? selectAllStageProgress(s, paper.id) : null,
  );
  const completion = useStore((s) =>
    paper ? selectPaperCompletion(s, paper.id) : 0,
  );
  const tasks = useStore((s) => (paper ? selectTasksForPaper(s, paper.id) : []));
  const diary = useStore((s) => (paper ? selectDiaryForPaper(s, paper.id) : []));

  const updatePaper = useStore((s) => s.updatePaper);
  const deletePaper = useStore((s) => s.deletePaper);
  const setPaperPaused = useStore((s) => s.setPaperPaused);
  const setPaperArchived = useStore((s) => s.setPaperArchived);
  const addDiaryEntry = useStore((s) => s.addDiaryEntry);

  const [logText, setLogText] = useState('');

  if (!paper || !stageProgress) return null;

  return (
    <div className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px] animate-fade-in flex">
      <div className="flex-1" onClick={onClose} />
      <div className="w-full max-w-5xl bg-paper-50 shadow-floating overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-paper-50/95 backdrop-blur-sm border-b border-paper-300 px-8 py-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <input
                className="font-serif text-2xl w-full bg-transparent outline-none focus:bg-white focus:px-2 focus:-mx-2 rounded transition-all"
                value={paper.title}
                onChange={(e) => updatePaper(paper.id, { title: e.target.value })}
              />
              <div className="flex items-center gap-3 mt-1 text-sm text-ink-mute">
                <input
                  className="font-mono text-xs bg-transparent outline-none focus:bg-white focus:px-1.5 focus:py-0.5 rounded"
                  value={paper.shortName}
                  onChange={(e) =>
                    updatePaper(paper.id, { shortName: e.target.value })
                  }
                />
                <span>·</span>
                <span>created {formatDate(paper.createdAt)}</span>
                {paper.paused && <Badge tone="warn">paused</Badge>}
                {paper.archived && <Badge tone="neutral">archived</Badge>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-paper-200 rounded-md"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Overall completion bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between mb-1">
                <span className="text-[11px] uppercase tracking-wider text-ink-mute">
                  Completion
                </span>
                <span className="text-[11px] font-mono text-ink-mute tabular-nums">
                  {Math.round(completion * 100)}% of stages done
                </span>
              </div>
              <div className="h-1.5 bg-paper-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${Math.round(completion * 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                onClick={() => setPaperPaused(paper.id, !paper.paused)}
                title={paper.paused ? 'Resume' : 'Pause'}
              >
                {paper.paused ? (
                  <>
                    <Play className="w-3.5 h-3.5" /> Resume
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                )}
              </Button>
              <Button
                onClick={() => setPaperArchived(paper.id, !paper.archived)}
                title={paper.archived ? 'Un-archive' : 'Archive'}
              >
                <Archive className="w-3.5 h-3.5" />
              </Button>
              <Button
                onClick={() => {
                  if (
                    confirm(
                      `Delete "${paper.title}" and all its tasks & log entries? Cannot be undone.`,
                    )
                  ) {
                    deletePaper(paper.id);
                    onClose();
                  }
                }}
                className="text-signal-danger hover:border-signal-danger"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-8">
          {/* Metadata */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="section-label">Venue</label>
              <input
                className="input mt-1"
                value={paper.venue ?? ''}
                onChange={(e) => updatePaper(paper.id, { venue: e.target.value })}
                placeholder="NeurIPS, JMLR, …"
              />
            </div>
            <div>
              <label className="section-label">Deadline</label>
              <input
                type="date"
                className="input mt-1"
                value={paper.deadline ?? ''}
                onChange={(e) =>
                  updatePaper(paper.id, { deadline: e.target.value })
                }
              />
            </div>
            <div>
              <label className="section-label">Collaborators</label>
              <input
                className="input mt-1"
                value={paper.collaborators}
                onChange={(e) =>
                  updatePaper(paper.id, { collaborators: e.target.value })
                }
                placeholder="names, free text"
              />
            </div>
          </div>

          {/* Stage grid */}
          <div>
            <h3 className="font-serif text-lg mb-3">Stages</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {STAGES.map((stage) => (
                <StageCell
                  key={stage}
                  paperId={paper.id}
                  stage={stage}
                  progress={stageProgress[stage]}
                  onAddTask={() => onAddTask(stage, paper.id)}
                  onOpenTask={onOpenTask}
                />
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-serif text-lg mb-3">Links</h3>
            <div className="space-y-1.5 mb-3">
              {paper.links.map((l, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <ExternalLink className="w-3.5 h-3.5 text-ink-mute" />
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent hover:underline truncate"
                  >
                    {l.label || l.url}
                  </a>
                  <button
                    onClick={() =>
                      updatePaper(paper.id, {
                        links: paper.links.filter((_, j) => j !== i),
                      })
                    }
                    className="opacity-60 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <LinkForm
              onAdd={(label, url) =>
                updatePaper(paper.id, {
                  links: [...paper.links, { label, url }],
                })
              }
            />
          </div>

          {/* Log */}
          <div>
            <h3 className="font-serif text-lg mb-3">Log</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (logText.trim()) {
                  addDiaryEntry({ content: logText.trim(), paperId: paper.id });
                  setLogText('');
                }
              }}
            >
              <textarea
                className="textarea"
                rows={3}
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="What happened on this paper today?"
              />
              <div className="flex justify-end mt-2">
                <Button type="submit" disabled={!logText.trim()}>
                  Add entry
                </Button>
              </div>
            </form>
            <div className="mt-4 space-y-3">
              {diary.slice(0, 10).map((d) => (
                <div key={d.id} className="border-l-2 border-paper-300 pl-3">
                  <div className="text-[11px] font-mono text-ink-mute mb-1">
                    {relativeTime(d.createdAt)} ·{' '}
                    {formatDate(d.createdAt, "MMM d, HH:mm")}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{d.content}</p>
                </div>
              ))}
              {diary.length === 0 && (
                <p className="text-sm text-ink-mute italic">No entries yet.</p>
              )}
            </div>
          </div>

          <Divider className="mt-4" />
          <p className="text-xs text-ink-mute text-center py-2">
            {tasks.length} task{tasks.length === 1 ? '' : 's'} · updated{' '}
            {relativeTime(paper.updatedAt)}
          </p>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// StageCell — a tile in the 2x3 grid. Shows progress, tasks, add-task.
// Ideation is special: it also shows the sub-stage note editor.
// ---------------------------------------------------------------------------

const StageCell = ({
  paperId,
  stage,
  progress,
  onAddTask,
  onOpenTask,
}: {
  paperId: string;
  stage: Stage;
  progress: StageProgress;
  onAddTask: () => void;
  onOpenTask: (id: string) => void;
}) => {
  const tasks = useStore((s) =>
    s.tasks.filter((t) => t.paperId === paperId && t.stage === stage),
  );
  const setStageManualDone = useStore((s) => s.setStageManualDone);
  const setTaskStatus = useStore((s) => s.setTaskStatus);

  const [expanded, setExpanded] = useState(stage === 'ideation');

  const pct =
    progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100);

  return (
    <div
      className={clsx(
        'card p-4 flex flex-col',
        progress.effectivelyDone && 'bg-paper-50',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm flex items-center gap-1.5">
            {STAGE_LABELS[stage]}
            {progress.effectivelyDone && (
              <CheckCircle2 className="w-3.5 h-3.5 text-signal-ok" />
            )}
            {progress.manualOverrideWithOpen && (
              <span title="Marked done but open tasks exist">
                <AlertTriangle className="w-3 h-3 text-signal-warn" />
              </span>
            )}
          </h4>
          <p className="text-[10px] text-ink-mute mt-0.5">
            {STAGE_DESCRIPTIONS[stage]}
          </p>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-0.5 text-ink-mute hover:text-ink"
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 text-[11px] font-mono text-ink-mute mb-2">
        <span>{progress.done}/{progress.total}</span>
        {progress.total > 0 && (
          <>
            <div className="flex-1 h-1 bg-paper-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="tabular-nums">{pct}%</span>
          </>
        )}
        {progress.total === 0 && (
          <span className="italic text-ink-mute/60">no tasks</span>
        )}
      </div>

      {/* Manual-done toggle */}
      <label className="flex items-center gap-1.5 text-[11px] text-ink-soft mb-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={progress.manualDone}
          onChange={(e) => setStageManualDone(paperId, stage, e.target.checked)}
          className="accent-accent"
        />
        Mark this stage complete
      </label>

      {expanded && (
        <>
          {/* Tasks list */}
          {tasks.length > 0 && (
            <div className="space-y-1 mb-3">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className={clsx(
                    'flex items-start gap-1.5 text-xs group rounded px-1 py-0.5 hover:bg-paper-200/50 cursor-pointer',
                    t.status === 'done' && 'opacity-60',
                  )}
                  onClick={() => onOpenTask(t.id)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const next: TaskStatus =
                        t.status === 'todo'
                          ? 'in_progress'
                          : t.status === 'in_progress'
                            ? 'done'
                            : 'todo';
                      setTaskStatus(t.id, next);
                    }}
                    className="mt-0.5 shrink-0"
                  >
                    {t.status === 'done' ? (
                      <CheckCircle2 className="w-3 h-3 text-signal-ok" />
                    ) : t.status === 'in_progress' ? (
                      <Clock className="w-3 h-3 text-accent" />
                    ) : (
                      <Circle className="w-3 h-3 text-ink-mute" />
                    )}
                  </button>
                  <span
                    className={clsx(
                      'flex-1 min-w-0 truncate',
                      t.status === 'done' && 'line-through',
                    )}
                  >
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={onAddTask}
            className="flex items-center gap-1 text-xs text-ink-mute hover:text-ink mb-2"
          >
            <Plus className="w-3 h-3" /> Add task
          </button>

          {/* Ideation sub-stages */}
          {stage === 'ideation' && (
            <div className="mt-3 pt-3 border-t border-paper-200 space-y-3">
              <p className="section-label">Conceptual notes</p>
              {IDEATION_SUBSTAGES.map((sub) => (
                <SubstageEditor key={sub} paperId={paperId} substage={sub} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const SubstageEditor = ({
  paperId,
  substage,
}: {
  paperId: string;
  substage: IdeationSubstage;
}) => {
  const note = useStore(
    (s) => s.papers.find((p) => p.id === paperId)?.ideationNotes[substage],
  );
  const setIdeationNote = useStore((s) => s.setIdeationNote);
  const setIdeationMaturity = useStore((s) => s.setIdeationMaturity);

  if (!note) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-medium">
          {IDEATION_SUBSTAGE_LABELS[substage]}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-ink-mute">
            {MATURITY_LABELS[note.maturity]}
          </span>
          <LevelDots
            value={note.maturity}
            onChange={(v) =>
              setIdeationMaturity(paperId, substage, v as MaturityLevel)
            }
          />
        </div>
      </div>
      <textarea
        className="textarea text-xs"
        rows={2}
        value={note.notes}
        onChange={(e) =>
          setIdeationNote(paperId, substage, { notes: e.target.value })
        }
        placeholder="Rough thinking, sub-claims, what's missing..."
      />
    </div>
  );
};

const LinkForm = ({ onAdd }: { onAdd: (label: string, url: string) => void }) => {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (url.trim()) {
          onAdd(label.trim() || url.trim(), url.trim());
          setLabel('');
          setUrl('');
        }
      }}
      className="flex gap-2"
    >
      <input
        className="input flex-1"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Label (e.g. Overleaf)"
      />
      <input
        className="input flex-[2]"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…"
      />
      <Button type="submit" disabled={!url.trim()}>
        <Plus className="w-4 h-4" />
      </Button>
    </form>
  );
};
