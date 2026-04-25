import { useState, useMemo } from 'react';
import { Trash2, BookOpen } from 'lucide-react';
import { useStore } from '@/state/store';
import { Button, Badge, Divider } from './ui/Primitives';
import { formatDate, relativeTime, daysSince } from '@/lib/dates';

export const DiaryView = () => {
  const papers = useStore((s) => s.papers);
  const diary = useStore((s) => s.diary);
  const tasks = useStore((s) => s.tasks);
  const addDiaryEntry = useStore((s) => s.addDiaryEntry);
  const deleteDiaryEntry = useStore((s) => s.deleteDiaryEntry);

  const [text, setText] = useState('');
  const [paperId, setPaperId] = useState<string>('');
  const [mode, setMode] = useState<'log' | 'weekly-review'>('log');

  const paperName = (id?: string) =>
    id ? papers.find((p) => p.id === id)?.shortName || '—' : 'general';

  // Summary stats for the weekly review prompt.
  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const completedThisWeek = tasks.filter(
      (t) => t.status === 'done' && t.completedAt && t.completedAt > weekAgo,
    ).length;
    const touchedThisWeek = papers.filter((p) => p.updatedAt > weekAgo).length;
    const stalePapers = papers.filter(
      (p) => daysSince(p.updatedAt) > 14 && !p.paused && !p.archived,
    );
    return { completedThisWeek, touchedThisWeek, stalePapers };
  }, [papers, tasks]);

  // Prompt scaffolding for weekly reviews. User can edit before saving.
  const weeklyTemplate = () =>
    `Week ending ${formatDate(new Date().toISOString())}

## What moved?
${stats.touchedThisWeek} paper${stats.touchedThisWeek === 1 ? '' : 's'} touched, ${stats.completedThisWeek} task${stats.completedThisWeek === 1 ? '' : 's'} completed.

-

## What's stuck?

-

## What am I avoiding?

-

## Next week's one focus
`;

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="font-serif text-3xl">Log</h1>
          <p className="text-sm text-ink-mute mt-1">
            A running record of work and reflection. Reopening old entries is often more
            useful than writing new ones.
          </p>
        </div>

        {/* Compose */}
        <div className="card p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setMode('log')}
              className={`text-sm px-3 py-1 rounded-md ${
                mode === 'log' ? 'bg-accent text-white' : 'text-ink-soft hover:bg-paper-200'
              }`}
            >
              Log entry
            </button>
            <button
              onClick={() => {
                setMode('weekly-review');
                if (!text) setText(weeklyTemplate());
              }}
              className={`text-sm px-3 py-1 rounded-md flex items-center gap-1.5 ${
                mode === 'weekly-review'
                  ? 'bg-accent text-white'
                  : 'text-ink-soft hover:bg-paper-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Weekly review
            </button>
          </div>

          {mode === 'weekly-review' && (
            <div className="mb-3 p-3 bg-paper-200/60 rounded-md text-xs text-ink-soft">
              <p>
                <strong>This week:</strong> {stats.touchedThisWeek} paper
                {stats.touchedThisWeek === 1 ? '' : 's'} touched · {stats.completedThisWeek} task
                {stats.completedThisWeek === 1 ? '' : 's'} completed
                {stats.stalePapers.length > 0 &&
                  ` · ${stats.stalePapers.length} stale (>14 days)`}
              </p>
              {stats.stalePapers.length > 0 && (
                <p className="mt-1">
                  Stale: {stats.stalePapers.map((p) => p.shortName).join(', ')}
                </p>
              )}
            </div>
          )}

          <textarea
            className="textarea"
            rows={mode === 'weekly-review' ? 12 : 4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              mode === 'log'
                ? "What did you do today? What's on your mind?"
                : 'Fill in the weekly review...'
            }
          />

          <div className="flex items-center gap-3 mt-3">
            {mode === 'log' && (
              <select
                className="input py-1.5 w-auto"
                value={paperId}
                onChange={(e) => setPaperId(e.target.value)}
              >
                <option value="">General (not paper-specific)</option>
                {papers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shortName} — {p.title}
                  </option>
                ))}
              </select>
            )}
            <div className="flex-1" />
            <Button
              variant="primary"
              disabled={!text.trim()}
              onClick={() => {
                addDiaryEntry({
                  content: text.trim(),
                  paperId: mode === 'log' ? paperId || undefined : undefined,
                  kind: mode,
                });
                setText('');
              }}
            >
              Save entry
            </Button>
          </div>
        </div>

        {/* Entries */}
        <div className="space-y-4">
          {diary.length === 0 && (
            <p className="text-center text-sm text-ink-mute italic py-12">
              No entries yet. Writing a single line at the end of each work session
              pays compound interest.
            </p>
          )}
          {diary.map((d) => (
            <div key={d.id} className="card p-5">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {d.kind === 'weekly-review' && (
                    <Badge tone="accent">
                      <BookOpen className="w-3 h-3" /> weekly review
                    </Badge>
                  )}
                  <span className="text-xs font-mono text-ink-mute">
                    {paperName(d.paperId)}
                  </span>
                  <span className="text-xs text-ink-mute">·</span>
                  <span className="text-xs text-ink-mute">
                    {formatDate(d.createdAt, "MMM d, yyyy 'at' HH:mm")}
                  </span>
                  <span className="text-xs text-ink-mute">·</span>
                  <span className="text-xs text-ink-mute">{relativeTime(d.createdAt)}</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Delete this entry?')) deleteDiaryEntry(d.id);
                  }}
                  className="p-1 hover:bg-paper-200 rounded opacity-60 hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{d.content}</p>
            </div>
          ))}
        </div>

        <Divider className="my-8" />
        <p className="text-xs text-ink-mute text-center">
          {diary.length} {diary.length === 1 ? 'entry' : 'entries'} · first {diary.length > 0 ? formatDate(diary[diary.length - 1].createdAt) : '—'}
        </p>
      </div>
    </div>
  );
};
