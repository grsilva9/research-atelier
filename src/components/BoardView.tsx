import { useState, useMemo } from 'react';
import { Plus, Filter, LayoutGrid, FileText } from 'lucide-react';
import { clsx } from 'clsx';
import type { Stage, Task } from '@/types';
import { STAGES, STAGE_LABELS } from '@/types';
import { useStore, selectWipCount, selectActivePapers } from '@/state/store';
import { TaskCard } from './TaskCard';
import { PapersView } from './PapersView';

type BoardMode = 'tasks' | 'papers';

export const BoardView = ({
  onOpenTask,
  onAddTask,
  onOpenPaper,
}: {
  onOpenTask: (taskId: string) => void;
  onAddTask: (stage: Stage, paperId?: string) => void;
  onOpenPaper: (id: string) => void;
}) => {
  const [mode, setMode] = useState<BoardMode>('tasks');
  const wipCount = useStore(selectWipCount);
  const wipLimit = useStore((s) => s.settings.wipLimit);

  const wipOver = wipCount > wipLimit;

  return (
    <div className="flex-1 overflow-auto flex flex-col">
      <div className="flex items-start justify-between px-6 py-4 flex-wrap gap-3">
        <div>
          <h1 className="font-serif text-2xl">Board</h1>
          <p className="text-sm text-ink-mute mt-0.5">
            {mode === 'tasks'
              ? 'Tasks across all active papers, by stage'
              : 'Per-paper progress across the six stages'}
            {' · '}
            <span className={clsx(wipOver && 'text-signal-danger font-medium')}>
              WIP {wipCount}/{wipLimit}
            </span>
          </p>
        </div>

        <ViewToggle mode={mode} setMode={setMode} />
      </div>

      {mode === 'tasks' ? (
        <TasksView onOpenTask={onOpenTask} onAddTask={onAddTask} />
      ) : (
        <PapersView onOpenPaper={onOpenPaper} />
      )}
    </div>
  );
};

const ViewToggle = ({
  mode,
  setMode,
}: {
  mode: BoardMode;
  setMode: (m: BoardMode) => void;
}) => {
  const btn = (m: BoardMode, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setMode(m)}
      className={clsx(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
        mode === m
          ? 'bg-white text-ink shadow-soft'
          : 'text-ink-soft hover:text-ink',
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-paper-200">
      {btn('tasks', 'Tasks', <LayoutGrid className="w-3.5 h-3.5" />)}
      {btn('papers', 'Papers', <FileText className="w-3.5 h-3.5" />)}
    </div>
  );
};

// -----------------------------------------------------------------------------
// TasksView — the Kanban-style view: columns are stages, cards are tasks.
// -----------------------------------------------------------------------------

const TasksView = ({
  onOpenTask,
  onAddTask,
}: {
  onOpenTask: (taskId: string) => void;
  onAddTask: (stage: Stage, paperId?: string) => void;
}) => {
  const tasks = useStore((s) => s.tasks);
  const activePapers = useStore(selectActivePapers);
  const setTaskStage = useStore((s) => s.setTaskStage);

  const [paperFilter, setPaperFilter] = useState<string>('all');
  const [showDone, setShowDone] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const activeIds = useMemo(
    () => new Set(activePapers.map((p) => p.id)),
    [activePapers],
  );

  const grouped = useMemo(() => {
    const out: Record<Stage, Task[]> = {} as Record<Stage, Task[]>;
    for (const s of STAGES) out[s] = [];

    for (const t of tasks) {
      if (!activeIds.has(t.paperId)) continue;
      if (paperFilter !== 'all' && t.paperId !== paperFilter) continue;
      if (!showDone && t.status === 'done') continue;
      out[t.stage].push(t);
    }

    const rank = (t: Task): number => {
      if (t.isFocus) return 0;
      if (t.status === 'in_progress') return 1;
      if (t.status === 'todo') return 2;
      return 3;
    };
    for (const s of STAGES) {
      out[s].sort((a, b) => rank(a) - rank(b));
    }

    return out;
  }, [tasks, activeIds, paperFilter, showDone]);

  const handleDrop = (stage: Stage) => {
    if (!dragId) return;
    setTaskStage(dragId, stage);
    setDragId(null);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap px-6 pb-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Filter className="w-3.5 h-3.5 text-ink-mute" />
          <select
            className="input py-1 text-sm"
            value={paperFilter}
            onChange={(e) => setPaperFilter(e.target.value)}
          >
            <option value="all">All papers</option>
            {activePapers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.shortName}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-ink-soft cursor-pointer">
          <input
            type="checkbox"
            checked={showDone}
            onChange={(e) => setShowDone(e.target.checked)}
            className="accent-accent"
          />
          Show done
        </label>
      </div>

      <div className="px-6 pb-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {STAGES.map((stage) => {
            const col = grouped[stage];
            return (
              <div
                key={stage}
                className="w-[300px] shrink-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage)}
              >
                <div className="flex items-center justify-between mb-2 px-1">
                  <h2 className="section-label">{STAGE_LABELS[stage]}</h2>
                  <span className="text-[11px] font-mono text-ink-mute">
                    {col.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[200px] rounded-lg bg-paper-200/50 p-2">
                  {col.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => setDragId(null)}
                      className={clsx(
                        'cursor-grab active:cursor-grabbing',
                        dragId === task.id && 'opacity-40',
                      )}
                    >
                      <TaskCard task={task} onClick={() => onOpenTask(task.id)} />
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      onAddTask(
                        stage,
                        paperFilter !== 'all' ? paperFilter : undefined,
                      )
                    }
                    className="w-full flex items-center gap-1.5 px-2 py-2 rounded-md text-xs text-ink-mute hover:bg-paper-200 hover:text-ink transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add task
                  </button>
                  {col.length === 0 && (
                    <p className="text-xs text-ink-mute/60 text-center py-2 italic">
                      nothing here
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {activePapers.length === 0 && (
        <div className="text-center text-sm text-ink-mute italic mt-8 px-6">
          No active papers. Add one from the sidebar, or un-pause an existing one.
        </div>
      )}
    </>
  );
};
