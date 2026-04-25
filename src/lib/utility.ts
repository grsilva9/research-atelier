/**
 * Multi-Criteria Decision Making utility function for task prioritization.
 *
 * Grounded in Expected Utility Theory with additions from WSJF (Weighted
 * Shortest Job First), temporal discounting, and cognitive load theory.
 *
 *   U(a) = [V(a) * P(a) * (1 + I(a)) * T(a)] / [C(a) + S(a)]
 *
 * where:
 *   V  impact               (0.3 / 0.6 / 1.0)
 *   P  probability          (0.4 / 0.7 / 0.9)
 *   I  information gain     (0 / 0.5 / 1.0)
 *   T  time sensitivity     (0.3 / 0.6 / 1.0)
 *   C  effort               (1 / 2 / 3)
 *   S  switch cost          (0 / 0.5 / 1, computed from context)
 *
 * This is a heuristic, not a scientifically-derived truth. Its value is
 * that the axes are named and legible — when the ranking disagrees with
 * your judgement, you can see which dimension is responsible.
 */

import type { Stage, Task, TaskCriteria } from '@/types';

/** Switch cost relative to a reference task (usually the current focus). */
export const switchCost = (
  target: { paperId: string; stage: Stage },
  reference: { paperId: string; stage: Stage } | null,
): 0 | 0.5 | 1 => {
  if (!reference) return 0;
  if (reference.paperId !== target.paperId) return 1;
  if (reference.stage !== target.stage) return 0.5;
  return 0;
};

/** Compute raw utility for a task given an optional reference for switch cost. */
export const utility = (
  criteria: TaskCriteria,
  switchC: 0 | 0.5 | 1 = 0,
): number => {
  const { impact, probability, infoGain, timeSensitivity, effort } = criteria;
  const numerator = impact * probability * (1 + infoGain) * timeSensitivity;
  const denominator = effort + switchC;
  if (denominator === 0) return numerator; // safety; C>=1 always so unreachable
  return numerator / denominator;
};

/** Utility for a task in the context of a reference (usually the focused task). */
export const taskUtility = (
  task: Task,
  reference: { paperId: string; stage: Stage } | null,
): number => {
  const s = switchCost(task, reference);
  return utility(task.criteria, s);
};

/**
 * Normalize a set of utility values to 0-100 within the set.
 * The max utility in the set becomes 100, the min becomes 0.
 * If all values are equal, everything gets 50.
 */
export const normalizeScores = (values: number[]): number[] => {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => Math.round(((v - min) / (max - min)) * 100));
};

/**
 * Get the priority bucket label for a normalized 0-100 score.
 * Useful when you want a coarse-grained indicator (chip color).
 */
export const priorityBucket = (normalized: number): 'top' | 'high' | 'medium' | 'low' => {
  if (normalized >= 80) return 'top';
  if (normalized >= 55) return 'high';
  if (normalized >= 30) return 'medium';
  return 'low';
};

/** Default criteria for a new task, pre-filled by stage. These are NOT applied
 * automatically in the current UI (user always picks), but exposed as a hint
 * for the NewTaskModal's starting selection and for the rules engine. */
export const defaultCriteriaForStage = (stage: Stage): TaskCriteria => {
  switch (stage) {
    case 'ideation':
      return {
        impact: 0.6,
        probability: 0.9,
        infoGain: 1.0,
        timeSensitivity: 0.3,
        effort: 1,
      };
    case 'literature':
      return {
        impact: 0.6,
        probability: 0.9,
        infoGain: 0.5,
        timeSensitivity: 0.3,
        effort: 2,
      };
    case 'drafting':
      return {
        impact: 0.6,
        probability: 0.9,
        infoGain: 0,
        timeSensitivity: 0.6,
        effort: 2,
      };
    case 'code':
      return {
        impact: 0.6,
        probability: 0.7,
        infoGain: 0.5,
        timeSensitivity: 0.3,
        effort: 2,
      };
    case 'experiments':
      return {
        impact: 1.0,
        probability: 0.7,
        infoGain: 1.0,
        timeSensitivity: 0.6,
        effort: 3,
      };
    case 'aesthetics':
      return {
        impact: 0.3,
        probability: 0.9,
        infoGain: 0,
        timeSensitivity: 0.3,
        effort: 1,
      };
  }
};
