import { useState } from 'react';
import type { Stage } from '@/types';
import { useStore, selectActivePapers } from '@/state/store';
import { Sidebar, type ViewKey } from './components/Sidebar';
import { BoardView } from './components/BoardView';
import { FocusView } from './components/FocusView';
import { DiaryView } from './components/DiaryView';
import { PaperDetail } from './components/PaperDetail';
import { EmptyState } from './components/EmptyState';
import { NewPaperModal } from './components/NewPaperModal';
import { NewTaskModal } from './components/NewTaskModal';
import { TaskDetailModal } from './components/TaskDetailModal';

export default function App() {
  const papers = useStore((s) => s.papers);
  const activePapers = useStore(selectActivePapers);

  const [view, setView] = useState<ViewKey>('focus');
  const [openPaperId, setOpenPaperId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const [showAddPaper, setShowAddPaper] = useState(false);

  const [showAddTask, setShowAddTask] = useState(false);
  const [addTaskInitialStage, setAddTaskInitialStage] = useState<Stage>('ideation');
  const [addTaskInitialPaper, setAddTaskInitialPaper] = useState<string | undefined>();

  const openAddPaper = () => setShowAddPaper(true);

  const openAddTask = (stage: Stage, paperId?: string) => {
    if (activePapers.length === 0) {
      // No papers to attach a task to — prompt to create a paper first.
      setShowAddPaper(true);
      return;
    }
    setAddTaskInitialStage(stage);
    setAddTaskInitialPaper(paperId);
    setShowAddTask(true);
  };

  const showEmpty = papers.length === 0 && view !== 'log';

  return (
    <div className="h-screen flex">
      <Sidebar view={view} setView={setView} onOpenPaper={(id) => setOpenPaperId(id)} onAddPaper={openAddPaper} />
      <main className="flex-1 flex flex-col min-w-0">
        {showEmpty ? (
          <EmptyState onAddPaper={openAddPaper} />
        ) : view === 'focus' ? (
          <FocusView
            onOpenTask={(id) => setOpenTaskId(id)}
            onOpenPaper={(id) => setOpenPaperId(id)}
          />
        ) : view === 'board' ? (
          <BoardView
            onOpenTask={(id) => setOpenTaskId(id)}
            onAddTask={openAddTask}
            onOpenPaper={(id) => setOpenPaperId(id)}
          />
        ) : (
          <DiaryView />
        )}
      </main>

      {openPaperId && (
        <PaperDetail
          paperId={openPaperId}
          onClose={() => setOpenPaperId(null)}
          onAddTask={openAddTask}
          onOpenTask={(id) => setOpenTaskId(id)}
        />
      )}

      <TaskDetailModal
        taskId={openTaskId}
        onClose={() => setOpenTaskId(null)}
        onOpenPaper={(id) => setOpenPaperId(id)}
      />

      <NewPaperModal open={showAddPaper} onClose={() => setShowAddPaper(false)} />

      <NewTaskModal
        open={showAddTask}
        onClose={() => setShowAddTask(false)}
        initialStage={addTaskInitialStage}
        initialPaperId={addTaskInitialPaper}
      />
    </div>
  );
}
