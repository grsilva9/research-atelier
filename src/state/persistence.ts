import type {
  AppState,
  Paper,
  Stage,
  IdeationSubstage,
  IdeationNote,
  StageStatus,
  Task,
  TaskStatus,
  TaskCriteria,
} from '@/types';
import { STAGES, IDEATION_SUBSTAGES } from '@/types';
import { defaultCriteriaForStage } from '@/lib/utility';

const LOCALSTORAGE_KEY = 'research-atelier:state';

/** Fresh empty state. */
export const emptyState = (): AppState => ({
  schemaVersion: 3,
  papers: [],
  tasks: [],
  diary: [],
  settings: {
    wipLimit: 3,
    staleDays: 14,
  },
  lastSavedAt: new Date().toISOString(),
});

/** Empty ideation note. */
export const emptyIdeationNote = (): IdeationNote => ({
  maturity: 0,
  notes: '',
});

/** Build a full record of empty ideation notes. */
export const emptyIdeationNotes = (): Record<IdeationSubstage, IdeationNote> => {
  const out = {} as Record<IdeationSubstage, IdeationNote>;
  for (const k of IDEATION_SUBSTAGES) out[k] = emptyIdeationNote();
  return out;
};

/** Build a full record of empty stage statuses. */
export const emptyStageStatus = (): Record<Stage, StageStatus> => {
  const out = {} as Record<Stage, StageStatus>;
  for (const s of STAGES) out[s] = { manualDone: false };
  return out;
};

/** Load from localStorage — returns null if nothing stored or parse fails. */
export const loadFromLocalStorage = (): AppState | null => {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
    return null;
  }
};

/** Persist to localStorage. */
export const saveToLocalStorage = (state: AppState): void => {
  try {
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
};

/** Download current state as state.json. */
export const exportState = (state: AppState, filename = 'state.json'): void => {
  const payload = { ...state, lastSavedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Read a File and parse it as AppState. */
export const importStateFromFile = async (file: File): Promise<AppState> => {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid state file: not an object.');
  }
  return migrate(parsed);
};

/**
 * Migrate any known schema version to the current one (v3).
 *
 * v1 (legacy):
 *   - Paper had a single pipeline `stage` field
 *   - Paper had `sections: Record<SectionKey, Section>` (conceptual+manuscript)
 *   - Task had optional `sectionKey`, boolean `done`
 *
 * v2:
 *   - Paper: `stageStatus`, `ideationNotes`, `paused`, `archived`
 *   - Task: `stage` and `status` ('todo'|'in_progress'|'done')
 *
 * v3 (current):
 *   - Task: adds MCDM `criteria` (V/P/I/T/C) for utility-based prioritization
 *
 * All migrations assign stage-based default criteria to existing tasks via
 * `defaultCriteriaForStage`. Users can edit these values per task later.
 */
const migrate = (raw: any): AppState => {
  if (!raw || typeof raw !== 'object') return emptyState();

  const version = raw.schemaVersion ?? 1;

  if (version === 3) {
    return normalizeV3(raw);
  }

  if (version === 2) {
    return normalizeV3(upgradeV2Shape(raw));
  }

  if (version === 1) {
    return normalizeV3(upgradeV2Shape(migrateV1toV2Shape(raw)));
  }

  // Unknown version — best-effort v3 parse, fall back to empty.
  try {
    return normalizeV3(raw);
  } catch {
    return emptyState();
  }
};

/** Parse + fill defaults for a v3-shaped input. */
const normalizeV3 = (raw: any): AppState => {
  const papers: Paper[] = Array.isArray(raw.papers)
    ? raw.papers.map((p: any) => normalizePaper(p))
    : [];
  const tasks: Task[] = Array.isArray(raw.tasks)
    ? raw.tasks
        .map((t: any) => normalizeTask(t))
        .filter((t: Task | null): t is Task => t !== null)
    : [];

  return {
    schemaVersion: 3,
    papers,
    tasks,
    diary: Array.isArray(raw.diary) ? raw.diary : [],
    settings: {
      wipLimit: Number(raw.settings?.wipLimit) || 3,
      staleDays: Number(raw.settings?.staleDays) || 14,
    },
    lastSavedAt: raw.lastSavedAt || new Date().toISOString(),
  };
};

/** v2 → v2-shape (no changes to the shape — just a no-op pass-through).
 * Upgrade to v3 happens in normalizeV3 via default criteria injection. */
const upgradeV2Shape = (raw: any): any => raw;

const normalizePaper = (p: any): Paper => {
  const ideationNotes = emptyIdeationNotes();
  if (p.ideationNotes && typeof p.ideationNotes === 'object') {
    for (const k of IDEATION_SUBSTAGES) {
      if (p.ideationNotes[k]) {
        ideationNotes[k] = {
          maturity: clampMaturity(p.ideationNotes[k].maturity ?? 0),
          notes: String(p.ideationNotes[k].notes ?? ''),
        };
      }
    }
  }

  const stageStatus = emptyStageStatus();
  if (p.stageStatus && typeof p.stageStatus === 'object') {
    for (const s of STAGES) {
      if (p.stageStatus[s]) {
        stageStatus[s] = { manualDone: Boolean(p.stageStatus[s].manualDone) };
      }
    }
  }

  return {
    id: String(p.id),
    title: String(p.title ?? 'Untitled'),
    shortName: String(p.shortName ?? p.title ?? 'untitled'),
    venue: p.venue,
    deadline: p.deadline,
    stageStatus,
    ideationNotes,
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || new Date().toISOString(),
    links: Array.isArray(p.links) ? p.links : [],
    collaborators: String(p.collaborators ?? ''),
    paused: Boolean(p.paused),
    archived: Boolean(p.archived),
  };
};

const normalizeTask = (t: any): Task | null => {
  if (!t?.id || !t?.paperId) return null;
  const stage = STAGES.includes(t.stage) ? (t.stage as Stage) : 'ideation';
  const status: TaskStatus =
    t.status === 'todo' || t.status === 'in_progress' || t.status === 'done'
      ? t.status
      : 'todo';
  return {
    id: String(t.id),
    paperId: String(t.paperId),
    stage,
    title: String(t.title ?? ''),
    status,
    source: t.source === 'suggested' ? 'suggested' : 'manual',
    rationale: t.rationale,
    createdAt: t.createdAt || new Date().toISOString(),
    completedAt: t.completedAt,
    notes: t.notes,
    isFocus: Boolean(t.isFocus),
    criteria: normalizeCriteria(t.criteria, stage),
  };
};

/** Normalize a task.criteria field, falling back to stage-based defaults. */
const normalizeCriteria = (raw: any, stage: Stage): TaskCriteria => {
  const defaults = defaultCriteriaForStage(stage);
  if (!raw || typeof raw !== 'object') return defaults;
  return {
    impact: clampImpact(raw.impact, defaults.impact),
    probability: clampProbability(raw.probability, defaults.probability),
    infoGain: clampInfoGain(raw.infoGain, defaults.infoGain),
    timeSensitivity: clampTimeSensitivity(raw.timeSensitivity, defaults.timeSensitivity),
    effort: clampEffort(raw.effort, defaults.effort),
  };
};

const clampImpact = (v: any, fallback: TaskCriteria['impact']): TaskCriteria['impact'] => {
  const n = Number(v);
  if (n === 0.3 || n === 0.6 || n === 1.0) return n as TaskCriteria['impact'];
  return fallback;
};
const clampProbability = (v: any, fallback: TaskCriteria['probability']): TaskCriteria['probability'] => {
  const n = Number(v);
  if (n === 0.4 || n === 0.7 || n === 0.9) return n as TaskCriteria['probability'];
  return fallback;
};
const clampInfoGain = (v: any, fallback: TaskCriteria['infoGain']): TaskCriteria['infoGain'] => {
  const n = Number(v);
  if (n === 0 || n === 0.5 || n === 1.0) return n as TaskCriteria['infoGain'];
  return fallback;
};
const clampTimeSensitivity = (v: any, fallback: TaskCriteria['timeSensitivity']): TaskCriteria['timeSensitivity'] => {
  const n = Number(v);
  if (n === 0.3 || n === 0.6 || n === 1.0) return n as TaskCriteria['timeSensitivity'];
  return fallback;
};
const clampEffort = (v: any, fallback: TaskCriteria['effort']): TaskCriteria['effort'] => {
  const n = Number(v);
  if (n === 1 || n === 2 || n === 3) return n as TaskCriteria['effort'];
  return fallback;
};

const clampMaturity = (n: any): 0 | 1 | 2 | 3 | 4 => {
  const x = Math.max(0, Math.min(4, Math.round(Number(n) || 0)));
  return x as 0 | 1 | 2 | 3 | 4;
};

/**
 * v1 → v2 migration.
 *
 * Strategy:
 *   - Paper.stage (v1 pipeline) maps to paused/archived flags:
 *       'paused'   → paused=true
 *       'submitted', 'published' → archived=true
 *       everything else → active
 *   - Paper.sections (v1) becomes Paper.ideationNotes. The v1 `conceptual`
 *     score carries over as maturity. The v1 `manuscript` score is
 *     dropped — in v2, manuscript progress is measured by tasks in the
 *     Drafting stage, not by a per-section score. The user may want to
 *     generate tasks to capture that.
 *   - v1 section keys map directly where possible:
 *       title → title
 *       gap → gap
 *       hypothesis → hypothesis
 *       method → method
 *       experiments → experimentDesign  (v2 sub-stage is about DESIGN; actual
 *                                        experiment runs are top-level stage)
 *       outlook → outlook
 *       conclusion → conclusion
 *     v1 'literature' section is dropped — in v2, literature is a top-level
 *     stage, not an ideation sub-stage.
 *   - Tasks are assigned stage='ideation' by default unless their sectionKey
 *     hints otherwise. Status 'done' maps from v1 boolean `done`.
 */
/** v1 → v2-shape. The v2→v3 step happens later in normalizeV3. */
const migrateV1toV2Shape = (raw: any): any => {
  const papers: Paper[] = Array.isArray(raw.papers)
    ? raw.papers.map((p: any) => {
        const ideationNotes = emptyIdeationNotes();
        if (p.sections && typeof p.sections === 'object') {
          const sectionMap: Record<string, IdeationSubstage> = {
            title: 'title',
            gap: 'gap',
            hypothesis: 'hypothesis',
            method: 'method',
            experiments: 'experimentDesign',
            outlook: 'outlook',
            conclusion: 'conclusion',
          };
          for (const [oldKey, newKey] of Object.entries(sectionMap)) {
            const s = p.sections[oldKey];
            if (s) {
              ideationNotes[newKey] = {
                maturity: clampMaturity(s.conceptual ?? 0),
                notes: String(s.notes ?? ''),
              };
            }
          }
        }

        return {
          id: String(p.id),
          title: String(p.title ?? 'Untitled'),
          shortName: String(p.shortName ?? p.title ?? 'untitled'),
          venue: p.venue,
          deadline: p.deadline,
          stageStatus: emptyStageStatus(),
          ideationNotes,
          createdAt: p.createdAt || new Date().toISOString(),
          updatedAt: p.updatedAt || new Date().toISOString(),
          links: Array.isArray(p.links) ? p.links : [],
          collaborators: String(p.collaborators ?? ''),
          paused: p.stage === 'paused',
          archived: p.stage === 'submitted' || p.stage === 'published',
        };
      })
    : [];

  const tasks: any[] = Array.isArray(raw.tasks)
    ? raw.tasks.map((t: any) => {
        // Infer stage from the legacy sectionKey if present.
        let stage: Stage = 'ideation';
        if (t.sectionKey === 'literature') stage = 'literature';
        else if (t.sectionKey === 'experiments') stage = 'experiments';
        // else keep as ideation — user can re-classify.

        return {
          id: String(t.id),
          paperId: String(t.paperId),
          stage,
          title: String(t.title ?? ''),
          status: t.done ? 'done' : 'todo',
          source: t.source === 'suggested' ? 'suggested' : 'manual',
          rationale: t.rationale,
          createdAt: t.createdAt || new Date().toISOString(),
          completedAt: t.completedAt,
          isFocus: Boolean(t.isFocus),
          // No criteria yet — normalizeV3 will inject stage-based defaults.
        };
      })
    : [];

  return {
    // Pass schemaVersion=2 so normalizeV3 treats this as a v2-shape blob,
    // filling in criteria from stage defaults.
    schemaVersion: 2,
    papers,
    tasks,
    diary: Array.isArray(raw.diary) ? raw.diary : [],
    settings: {
      wipLimit: Number(raw.settings?.wipLimit) || 3,
      staleDays: Number(raw.settings?.staleDays) || 14,
    },
    lastSavedAt: new Date().toISOString(),
  };
};
