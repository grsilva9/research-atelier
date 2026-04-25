import { useRef, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import {
  LayoutGrid,
  Target,
  BookOpen,
  Settings as SettingsIcon,
  Download,
  Upload,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useStore } from '@/state/store';
import { exportState, importStateFromFile } from '@/state/persistence';
import { Button, Modal } from './ui/Primitives';

export type ViewKey = 'focus' | 'board' | 'log';

export const Sidebar = ({
  view,
  setView,
  onOpenPaper,
  onAddPaper,
}: {
  view: ViewKey;
  setView: (v: ViewKey) => void;
  onOpenPaper: (id: string) => void;
  onAddPaper: () => void;
}) => {
  const state = useStore();
  const papers = useStore((s) => s.papers);
  const replaceState = useStore((s) => s.replaceState);
  const resetState = useStore((s) => s.resetState);
  const setWipLimit = useStore((s) => s.setWipLimit);
  const setStaleDays = useStore((s) => s.setStaleDays);

  const [showSettings, setShowSettings] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    try {
      setImportError(null);
      const imported = await importStateFromFile(file);
      if (
        confirm(
          `Replace current state with file contents?\n\nImported file has ${imported.papers.length} papers, ${imported.tasks.length} tasks, ${imported.diary.length} diary entries.\n\nYour current data will be overwritten.`,
        )
      ) {
        replaceState(imported);
      }
    } catch (e: any) {
      setImportError(e?.message || 'Failed to import file.');
    }
  };

  const items: Array<{ key: ViewKey; label: string; icon: ReactNode }> = [
    { key: 'focus', label: 'Focus', icon: <Target className="w-4 h-4" /> },
    { key: 'board', label: 'Board', icon: <LayoutGrid className="w-4 h-4" /> },
    { key: 'log', label: 'Log', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-56 shrink-0 bg-paper-200/40 border-r border-paper-300 flex flex-col">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-paper-300">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center text-paper-50 font-serif text-sm">
            A
          </div>
          <div>
            <h1 className="font-serif text-base leading-none">Atelier</h1>
            <p className="text-[10px] text-ink-mute mt-0.5 font-mono">research tracker</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map((it) => (
          <button
            key={it.key}
            onClick={() => setView(it.key)}
            className={clsx(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
              view === it.key
                ? 'bg-accent-bg text-accent font-medium'
                : 'text-ink-soft hover:bg-paper-200 hover:text-ink',
            )}
          >
            {it.icon}
            <span>{it.label}</span>
          </button>
        ))}

        <div className="mt-5 pt-4 border-t border-paper-300">
          <div className="flex items-center justify-between px-3 mb-1.5">
            <p className="section-label">Papers</p>
            <button
              onClick={onAddPaper}
              className="p-0.5 rounded text-ink-mute hover:text-ink hover:bg-paper-200 transition-colors"
              title="New paper"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {papers.length === 0 ? (
            <p className="px-3 text-[11px] text-ink-mute italic">
              No papers yet
            </p>
          ) : (
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
              {papers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onOpenPaper(p.id)}
                  className={clsx(
                    'w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors truncate',
                    'text-ink-soft hover:bg-paper-200 hover:text-ink',
                    (p.paused || p.archived) && 'opacity-60',
                  )}
                  title={p.title}
                >
                  <span className="font-mono">{p.shortName}</span>
                  {p.paused && <span className="ml-1 text-[10px]">⏸</span>}
                  {p.archived && <span className="ml-1 text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* State controls */}
      <div className="p-3 border-t border-paper-300 space-y-1.5">
        <button
          onClick={() => exportState(state)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink-soft hover:bg-paper-200 hover:text-ink transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Export state</span>
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink-soft hover:bg-paper-200 hover:text-ink transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>Import state</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => setShowSettings(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink-soft hover:bg-paper-200 hover:text-ink transition-colors"
        >
          <SettingsIcon className="w-4 h-4" />
          <span>Settings</span>
        </button>

        {importError && (
          <div className="mt-2 p-2 rounded-md bg-[#f0dcdc] text-signal-danger text-xs flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{importError}</span>
          </div>
        )}
      </div>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings">
        <div className="space-y-4">
          <div>
            <label className="section-label">WIP limit</label>
            <p className="text-xs text-ink-mute mb-2">
              Max papers in Drafting or Revising at once. Low limits protect focus.
            </p>
            <input
              type="number"
              min={1}
              max={10}
              className="input w-24"
              value={state.settings.wipLimit}
              onChange={(e) => setWipLimit(parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className="section-label">Stale threshold (days)</label>
            <p className="text-xs text-ink-mute mb-2">
              Papers idle longer than this get flagged on the board.
            </p>
            <input
              type="number"
              min={1}
              max={90}
              className="input w-24"
              value={state.settings.staleDays}
              onChange={(e) => setStaleDays(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="pt-4 border-t border-paper-300">
            <label className="section-label text-signal-danger">Danger zone</label>
            <p className="text-xs text-ink-mute mb-2 mt-1">
              Clears all papers, tasks, and entries. Cannot be undone.
            </p>
            <Button
              onClick={() => {
                if (confirm('Really wipe all state? This cannot be undone.')) {
                  resetState();
                  setShowSettings(false);
                }
              }}
              className="text-signal-danger hover:border-signal-danger"
            >
              Reset everything
            </Button>
          </div>
        </div>
      </Modal>
    </aside>
  );
};
