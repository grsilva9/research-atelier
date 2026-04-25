/**
 * Rules engine: generates concrete next-action suggestions from state.
 *
 * This file is a FEATURE GENERATOR — it detects situations (a deadline is
 * close, an idea is clear but unwritten, a stage is overloaded) and emits
 * suggestion objects that carry MCDM criteria values. The actual ranking
 * happens in the utility function (see src/lib/utility.ts), unified across
 * manual tasks and suggestions.
 *
 * Design:
 *   - Deterministic. Same state → same suggestions.
 *   - Every suggestion carries a rationale.
 *   - Phrased as concrete actions with verbs.
 *   - Each rule sets criteria values appropriate to what the rule knows.
 *     (A deadline rule sets timeSensitivity=1.0; a stale-WIP rule sets
 *     effort=1 because it's a decision, not a big task; etc.)
 *
 * The old `score: number` field is gone. Ranking is now done by the
 * utility function over the criteria, so suggestions and tasks compete
 * on the same axis.
 */

import type { AppState, Paper, Stage, Task, TaskCriteria } from '@/types';
import {
  STAGES,
  STAGE_LABELS,
  IDEATION_SUBSTAGE_LABELS,
} from '@/types';
import { daysSince, daysUntil, now } from '@/lib/dates';
import { defaultCriteriaForStage, taskUtility } from '@/lib/utility';

export interface Suggestion {
  id: string; // deterministic
  paperId: string;
  stage: Stage;
  title: string;
  rationale: string;
  criteria: TaskCriteria;
}

const sid = (paperId: string, kind: string, extra?: string) =>
  `sugg:${paperId}:${kind}${extra ? ':' + extra : ''}`;

/**
 * Compute a time-sensitivity value from a paper's deadline.
 * This is used by any rule that doesn't have a more specific signal.
 */
const deadlineTimeSensitivity = (paper: Paper): TaskCriteria['timeSensitivity'] => {
  const dl = daysUntil(paper.deadline);
  if (dl === null) return 0.3;
  if (dl <= 14) return 1.0;
  if (dl <= 45) return 0.6;
  return 0.3;
};

/** Suggestions for a single paper. Unsorted. */
export const suggestForPaper = (state: AppState, paper: Paper): Suggestion[] => {
  if (paper.paused || paper.archived) return [];

  const out: Suggestion[] = [];
  const paperTasks = state.tasks.filter((t) => t.paperId === paper.id);
  const openTasks = paperTasks.filter((t) => t.status !== 'done');
  const tasksByStage = groupTasksByStage(paperTasks);
  const openByStage = groupTasksByStage(openTasks);

  const T = deadlineTimeSensitivity(paper);

  // Rule 1: Ideation sub-stage is clear-enough to act on.
  // Drafting a well-formed idea: high probability (writing is reliable),
  // zero info gain (it's execution), moderate impact (a section gets filled).
  for (const [sub, note] of Object.entries(paper.ideationNotes)) {
    if (note.maturity >= 2 && note.notes.trim().length > 20) {
      const subLabel =
        IDEATION_SUBSTAGE_LABELS[sub as keyof typeof IDEATION_SUBSTAGE_LABELS];
      if (openByStage.drafting.length === 0 && tasksByStage.drafting.length === 0) {
        out.push({
          id: sid(paper.id, 'draft-from-idea', sub),
          paperId: paper.id,
          stage: 'drafting',
          title: `Draft the ${subLabel.toLowerCase()} of ${paper.shortName}`,
          rationale: `Your ${subLabel.toLowerCase()} note is at maturity ${note.maturity}/4 — clear enough to write down.`,
          criteria: {
            impact: 0.6,
            probability: 0.9,
            infoGain: 0,
            timeSensitivity: T,
            effort: 2,
          },
        });
      }
    }
  }

  // Rule 2: Only ideation, nothing produced elsewhere.
  // High info gain (leaving ideation reshapes the plan), high impact.
  const producedTotal =
    tasksByStage.drafting.length +
    tasksByStage.code.length +
    tasksByStage.experiments.length;
  const ideationProgress = paperTasks.filter(
    (t) => t.stage === 'ideation' && t.status === 'done',
  ).length;
  if (
    producedTotal === 0 &&
    (ideationProgress >= 2 || averageMaturity(paper) >= 1.5) &&
    daysSince(paper.createdAt) >= 14
  ) {
    out.push({
      id: sid(paper.id, 'start-producing'),
      paperId: paper.id,
      stage: 'drafting',
      title: `Start producing artifacts for ${paper.shortName} (draft, code, or experiment)`,
      rationale: `The idea has matured but no draft, code, or experiment exists yet.`,
      criteria: {
        impact: 1.0,
        probability: 0.9,
        infoGain: 1.0,
        timeSensitivity: T,
        effort: 2,
      },
    });
  }

  // Rule 3: A stage has 4+ open tasks — consolidate.
  // This is a decision/action, not a big task. Low effort, high probability.
  for (const stage of STAGES) {
    const openHere = openByStage[stage].length;
    if (openHere >= 4) {
      out.push({
        id: sid(paper.id, 'consolidate', stage),
        paperId: paper.id,
        stage,
        title: `Finish one ${STAGE_LABELS[stage].toLowerCase()} task for ${paper.shortName}`,
        rationale: `${openHere} open tasks in ${STAGE_LABELS[stage]} — pick one and close it before adding more.`,
        criteria: {
          impact: 0.6,
          probability: 0.9,
          infoGain: 0.5,
          timeSensitivity: T,
          effort: 1,
        },
      });
    }
  }

  // Rule 4: Stale in-progress tasks.
  // Deciding what to do with them is quick and impactful (unblocks WIP budget).
  for (const t of paperTasks) {
    if (t.status !== 'in_progress') continue;
    const age = daysSince(t.createdAt);
    if (age >= 7) {
      out.push({
        id: sid(t.id, 'revive-wip'),
        paperId: paper.id,
        stage: t.stage,
        title: `Revive or drop: "${truncate(t.title, 60)}"`,
        rationale: `Sitting in-progress for ${age} days. It's blocking your WIP budget.`,
        criteria: {
          impact: 0.6,
          probability: 0.9,
          infoGain: 0.5,
          timeSensitivity: 1.0,
          effort: 1,
        },
      });
    }
  }

  // Rule 5: Close deadline, drafting incomplete.
  // Maximum time sensitivity and high impact.
  const dl = daysUntil(paper.deadline);
  if (dl !== null && dl >= 0 && dl <= 21) {
    const draftDone = tasksByStage.drafting.every((t) => t.status === 'done');
    const hasDrafting = tasksByStage.drafting.length > 0;
    if (!hasDrafting || !draftDone) {
      out.push({
        id: sid(paper.id, 'deadline-draft'),
        paperId: paper.id,
        stage: 'drafting',
        title: `Push ${paper.shortName} drafting — ${dl} day${dl === 1 ? '' : 's'} to deadline`,
        rationale: `Deadline in ${dl} day${dl === 1 ? '' : 's'} and drafting is ${hasDrafting ? 'not complete' : 'not started'}.`,
        criteria: {
          impact: 1.0,
          probability: 0.9,
          infoGain: 0,
          timeSensitivity: 1.0,
          effort: 3,
        },
      });
    }
  }

  // Rule 6: Code/experiments advanced but aesthetics empty.
  const codeDone = tasksByStage.code.filter((t) => t.status === 'done').length;
  const expDone = tasksByStage.experiments.filter(
    (t) => t.status === 'done',
  ).length;
  const aestheticsTotal = tasksByStage.aesthetics.length;
  if (codeDone + expDone >= 3 && aestheticsTotal === 0) {
    out.push({
      id: sid(paper.id, 'aesthetics-bottleneck'),
      paperId: paper.id,
      stage: 'aesthetics',
      title: `Plan figures for ${paper.shortName}`,
      rationale: `Code and experiments are progressing but no aesthetics tasks exist — figures often bottleneck submission.`,
      criteria: {
        impact: 0.6,
        probability: 0.9,
        infoGain: 0.5,
        timeSensitivity: T,
        effort: 1,
      },
    });
  }

  // Rule 7: Scattered across many stages — consolidate globally.
  const activeStages = STAGES.filter((s) => openByStage[s].length > 0).length;
  if (activeStages >= 4) {
    out.push({
      id: sid(paper.id, 'too-spread'),
      paperId: paper.id,
      stage: 'ideation',
      title: `Pick one stage to finish for ${paper.shortName}`,
      rationale: `Active work in ${activeStages} different stages. Consolidate before opening more fronts.`,
      criteria: {
        impact: 0.6,
        probability: 0.9,
        infoGain: 0.5,
        timeSensitivity: T,
        effort: 1,
      },
    });
  }

  return out;
};

/**
 * All suggestions across all papers. Sorted by utility (highest first).
 * Existing task ids are excluded (suggestions you've already accepted or
 * dismissed).
 */
export const suggestAll = (state: AppState): Suggestion[] => {
  const existingIds = new Set(state.tasks.map((t) => t.id));
  const out: Suggestion[] = [];
  for (const p of state.papers) {
    for (const s of suggestForPaper(state, p)) {
      if (!existingIds.has(s.id)) out.push(s);
    }
  }
  // Rank by utility. Suggestions have no switch-cost context (the user
  // hasn't "started" them yet), so S=0.
  out.sort((a, b) => utilityOfSuggestion(b) - utilityOfSuggestion(a));
  return out;
};

const utilityOfSuggestion = (s: Suggestion): number => {
  const { impact, probability, infoGain, timeSensitivity, effort } = s.criteria;
  return (impact * probability * (1 + infoGain) * timeSensitivity) / effort;
};

/** The unified queue for the Focus view. */
export interface QueueItem {
  kind: 'task' | 'suggestion';
  utility: number;
  paperId: string;
  stage: Stage;
  title: string;
  rationale?: string;
  taskStatus?: 'todo' | 'in_progress' | 'done';
  task?: Task;
  suggestion?: Suggestion;
  isFocus?: boolean;
}

/**
 * The ranked queue. Interleaves open tasks with fresh suggestions.
 * Ordering rules:
 *   1. Any task marked isFocus wins and goes to the top.
 *   2. Everything else is sorted by utility, descending.
 *
 * Switch cost (S) is computed against the currently-focused task's
 * paper/stage. If nothing is focused, S = 0 for everyone.
 */
export const buildQueue = (state: AppState): QueueItem[] => {
  const items: QueueItem[] = [];

  const activePaperIds = new Set(
    state.papers.filter((p) => !p.paused && !p.archived).map((p) => p.id),
  );

  // Determine the reference task for switch-cost computation.
  const focused = state.tasks.find((t) => t.isFocus && t.status !== 'done');
  const reference = focused
    ? { paperId: focused.paperId, stage: focused.stage }
    : null;

  for (const t of state.tasks) {
    if (t.status === 'done') continue;
    if (!activePaperIds.has(t.paperId)) continue;

    items.push({
      kind: 'task',
      utility: taskUtility(t, reference),
      paperId: t.paperId,
      stage: t.stage,
      title: t.title,
      rationale: t.rationale,
      taskStatus: t.status,
      task: t,
      isFocus: t.isFocus,
    });
  }

  for (const s of suggestAll(state)) {
    items.push({
      kind: 'suggestion',
      utility: utilityOfSuggestion(s),
      paperId: s.paperId,
      stage: s.stage,
      title: s.title,
      rationale: s.rationale,
      suggestion: s,
    });
  }

  items.sort((a, b) => {
    if (a.isFocus && !b.isFocus) return -1;
    if (!a.isFocus && b.isFocus) return 1;
    return b.utility - a.utility;
  });

  return items;
};

/** Convert a suggestion to a task. Preserves deterministic id. */
export const suggestionToTask = (s: Suggestion): Task => ({
  id: s.id,
  paperId: s.paperId,
  stage: s.stage,
  title: s.title,
  status: 'todo',
  source: 'suggested',
  rationale: s.rationale,
  createdAt: now(),
  criteria: s.criteria,
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const groupTasksByStage = (tasks: Task[]): Record<Stage, Task[]> => {
  const out = {} as Record<Stage, Task[]>;
  for (const s of STAGES) out[s] = [];
  for (const t of tasks) out[t.stage].push(t);
  return out;
};

const averageMaturity = (paper: Paper): number => {
  const vals = Object.values(paper.ideationNotes).map((n) => n.maturity);
  if (vals.length === 0) return 0;
  return vals.reduce<number>((a, b) => a + b, 0) / vals.length;
};

const truncate = (s: string, n: number): string =>
  s.length <= n ? s : s.slice(0, n - 1) + '…';

// Keep the import for defaultCriteriaForStage available to callers that still
// import it from this module (like the normalizeTask migration path did in an
// older version). Explicit re-export for clarity.
export { defaultCriteriaForStage };
