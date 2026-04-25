import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  AppState,
  Paper,
  PaperId,
  Stage,
  Task,
  TaskStatus,
  TaskCriteria,
  IdeationSubstage,
  IdeationNote,
  MaturityLevel,
  DiaryEntry,
} from '@/types';
import { STAGES } from '@/types';
import {
  emptyState,
  emptyIdeationNotes,
  emptyStageStatus,
  loadFromLocalStorage,
  saveToLocalStorage,
} from './persistence';
import { now } from '@/lib/dates';
import { suggestionToTask, type Suggestion } from './suggestions';

const rid = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

interface StoreActions {
  // Lifecycle
  replaceState: (state: AppState) => void;
  resetState: () => void;

  // Papers
  addPaper: (input: {
    title: string;
    shortName: string;
    venue?: string;
    deadline?: string;
  }) => Paper;
  updatePaper: (id: PaperId, patch: Partial<Paper>) => void;
  deletePaper: (id: PaperId) => void;
  setPaperPaused: (id: PaperId, paused: boolean) => void;
  setPaperArchived: (id: PaperId, archived: boolean) => void;

  // Ideation notes
  setIdeationNote: (
    id: PaperId,
    sub: IdeationSubstage,
    patch: Partial<IdeationNote>,
  ) => void;
  setIdeationMaturity: (
    id: PaperId,
    sub: IdeationSubstage,
    level: MaturityLevel,
  ) => void;

  // Stage status (manual override)
  setStageManualDone: (id: PaperId, stage: Stage, done: boolean) => void;

  // Tasks
  addTask: (input: {
    paperId: PaperId;
    stage: Stage;
    title: string;
    criteria: TaskCriteria;
    notes?: string;
  }) => Task;
  updateTaskCriteria: (id: string, patch: Partial<TaskCriteria>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  setTaskStatus: (id: string, status: TaskStatus) => void;
  setTaskStage: (id: string, stage: Stage) => void;
  deleteTask: (id: string) => void;
  setFocusTask: (id: string) => void;
  clearFocus: () => void;
  acceptSuggestion: (s: Suggestion) => Task | null;
  dismissSuggestion: (s: Suggestion) => void;

  // Diary
  addDiaryEntry: (input: {
    content: string;
    paperId?: PaperId;
    kind?: 'log' | 'weekly-review';
  }) => void;
  deleteDiaryEntry: (id: string) => void;

  // Settings
  setWipLimit: (n: number) => void;
  setStaleDays: (n: number) => void;
}

type Store = AppState & StoreActions;

const touch = (p: Paper): Paper => ({ ...p, updatedAt: now() });

const initial: AppState = loadFromLocalStorage() ?? emptyState();

export const useStore = create<Store>()(
  subscribeWithSelector((set, get) => ({
    ...initial,

    replaceState: (state) => set(state),
    resetState: () => set(emptyState()),

    addPaper: ({ title, shortName, venue, deadline }) => {
      const paper: Paper = {
        id: rid('p'),
        title,
        shortName: shortName || title.slice(0, 24),
        venue,
        deadline,
        stageStatus: emptyStageStatus(),
        ideationNotes: emptyIdeationNotes(),
        createdAt: now(),
        updatedAt: now(),
        links: [],
        collaborators: '',
        paused: false,
        archived: false,
      };
      set((s) => ({ papers: [...s.papers, paper] }));
      return paper;
    },

    updatePaper: (id, patch) =>
      set((s) => ({
        papers: s.papers.map((p) => (p.id === id ? touch({ ...p, ...patch }) : p)),
      })),

    deletePaper: (id) =>
      set((s) => ({
        papers: s.papers.filter((p) => p.id !== id),
        tasks: s.tasks.filter((t) => t.paperId !== id),
        diary: s.diary.filter((d) => d.paperId !== id),
      })),

    setPaperPaused: (id, paused) =>
      set((s) => ({
        papers: s.papers.map((p) => (p.id === id ? touch({ ...p, paused }) : p)),
      })),

    setPaperArchived: (id, archived) =>
      set((s) => ({
        papers: s.papers.map((p) =>
          p.id === id ? touch({ ...p, archived }) : p,
        ),
      })),

    setIdeationNote: (id, sub, patch) =>
      set((s) => ({
        papers: s.papers.map((p) =>
          p.id === id
            ? touch({
                ...p,
                ideationNotes: {
                  ...p.ideationNotes,
                  [sub]: { ...p.ideationNotes[sub], ...patch },
                },
              })
            : p,
        ),
      })),

    setIdeationMaturity: (id, sub, level) =>
      get().setIdeationNote(id, sub, { maturity: level }),

    setStageManualDone: (id, stage, done) =>
      set((s) => ({
        papers: s.papers.map((p) =>
          p.id === id
            ? touch({
                ...p,
                stageStatus: {
                  ...p.stageStatus,
                  [stage]: { ...p.stageStatus[stage], manualDone: done },
                },
              })
            : p,
        ),
      })),

    addTask: ({ paperId, stage, title, criteria, notes }) => {
      const task: Task = {
        id: rid('t'),
        paperId,
        stage,
        title: title.trim(),
        status: 'todo',
        source: 'manual',
        createdAt: now(),
        notes,
        criteria,
      };
      set((s) => ({ tasks: [...s.tasks, task] }));
      return task;
    },

    updateTask: (id, patch) =>
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })),

    updateTaskCriteria: (id, patch) =>
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === id
            ? { ...t, criteria: { ...t.criteria, ...patch } }
            : t,
        ),
      })),

    setTaskStatus: (id, status) =>
      set((s) => ({
        tasks: s.tasks.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                completedAt: status === 'done' ? now() : undefined,
              }
            : t,
        ),
      })),

    setTaskStage: (id, stage) =>
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === id ? { ...t, stage } : t)),
      })),

    deleteTask: (id) =>
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),

    setFocusTask: (id) =>
      set((s) => ({
        tasks: s.tasks.map((t) => ({ ...t, isFocus: t.id === id })),
      })),

    clearFocus: () =>
      set((s) => ({ tasks: s.tasks.map((t) => ({ ...t, isFocus: false })) })),

    acceptSuggestion: (sugg) => {
      const state = get();
      if (state.tasks.some((t) => t.id === sugg.id)) return null;
      const task = suggestionToTask(sugg);
      set({ tasks: [...state.tasks, task] });
      return task;
    },

    dismissSuggestion: (sugg) =>
      set((s) => {
        if (s.tasks.some((t) => t.id === sugg.id)) return s;
        const t: Task = {
          id: sugg.id,
          paperId: sugg.paperId,
          stage: sugg.stage,
          title: '(dismissed suggestion)',
          status: 'done',
          source: 'suggested',
          createdAt: now(),
          completedAt: now(),
          criteria: sugg.criteria,
        };
        return { tasks: [...s.tasks, t] };
      }),

    addDiaryEntry: ({ content, paperId, kind = 'log' }) =>
      set((s) => ({
        diary: [
          { id: rid('d'), paperId, kind, content, createdAt: now() },
          ...s.diary,
        ],
      })),

    deleteDiaryEntry: (id) =>
      set((s) => ({ diary: s.diary.filter((d) => d.id !== id) })),

    setWipLimit: (n) =>
      set((s) => ({ settings: { ...s.settings, wipLimit: Math.max(1, n) } })),

    setStaleDays: (n) =>
      set((s) => ({ settings: { ...s.settings, staleDays: Math.max(1, n) } })),
  })),
);

// Auto-save to localStorage on every change.
useStore.subscribe((state) => {
  saveToLocalStorage({
    schemaVersion: 3,
    papers: state.papers,
    tasks: state.tasks,
    diary: state.diary,
    settings: state.settings,
    lastSavedAt: now(),
  });
});

// -----------------------------------------------------------------------------
// Selectors — pure functions on state, reused across components.
// -----------------------------------------------------------------------------

/** Count tasks currently in_progress across all active papers. */
export const selectWipCount = (s: AppState): number =>
  s.tasks.filter((t) => {
    if (t.status !== 'in_progress') return false;
    const p = s.papers.find((pp) => pp.id === t.paperId);
    return p && !p.paused && !p.archived;
  }).length;

export const selectTasksForPaper = (s: AppState, paperId: PaperId): Task[] =>
  s.tasks.filter((t) => t.paperId === paperId);

export const selectTasksByStage = (s: AppState, stage: Stage): Task[] =>
  s.tasks.filter((t) => t.stage === stage);

export const selectDiaryForPaper = (s: AppState, paperId: PaperId): DiaryEntry[] =>
  s.diary.filter((d) => d.paperId === paperId);

/**
 * Stage progress for a paper.
 *   - openTasks: non-done tasks in this stage
 *   - doneTasks: done tasks
 *   - autoDone: true if total > 0 AND all are done (auto-completion)
 *   - effectivelyDone: autoDone OR manualDone — what the UI should display
 */
export interface StageProgress {
  stage: Stage;
  total: number;
  open: number;
  done: number;
  inProgress: number;
  autoDone: boolean;
  manualDone: boolean;
  effectivelyDone: boolean;
  /** true when user marked manual-done but open tasks exist — flagged in UI */
  manualOverrideWithOpen: boolean;
}

export const selectStageProgress = (
  s: AppState,
  paperId: PaperId,
  stage: Stage,
): StageProgress => {
  const tasks = s.tasks.filter((t) => t.paperId === paperId && t.stage === stage);
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const open = total - done;
  const autoDone = total > 0 && done === total;
  const paper = s.papers.find((p) => p.id === paperId);
  const manualDone = paper?.stageStatus[stage]?.manualDone ?? false;
  const effectivelyDone = autoDone || manualDone;
  const manualOverrideWithOpen = manualDone && open > 0;
  return {
    stage,
    total,
    open,
    done,
    inProgress,
    autoDone,
    manualDone,
    effectivelyDone,
    manualOverrideWithOpen,
  };
};

/** Stage progress across all stages for a given paper. */
export const selectAllStageProgress = (
  s: AppState,
  paperId: PaperId,
): Record<Stage, StageProgress> => {
  const out = {} as Record<Stage, StageProgress>;
  for (const stage of STAGES) {
    out[stage] = selectStageProgress(s, paperId, stage);
  }
  return out;
};

/** Overall paper completion (0..1) as share of stages effectively done. */
export const selectPaperCompletion = (
  s: AppState,
  paperId: PaperId,
): number => {
  const all = selectAllStageProgress(s, paperId);
  const done = STAGES.filter((st) => all[st].effectivelyDone).length;
  return done / STAGES.length;
};

/** Papers visible in active views (not paused, not archived). */
export const selectActivePapers = (s: AppState): Paper[] =>
  s.papers.filter((p) => !p.paused && !p.archived);
