import { Sparkles } from 'lucide-react';
import { Button } from './ui/Primitives';

export const EmptyState = ({ onAddPaper }: { onAddPaper: () => void }) => {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-bg mb-4">
          <Sparkles className="w-6 h-6 text-accent" />
        </div>
        <h2 className="font-serif text-2xl mb-2">A quiet place to think</h2>
        <p className="text-sm text-ink-soft mb-6 leading-relaxed">
          Add your first paper to get started. Each paper gets tracked on two
          independent axes: how clear the <em>idea</em> is in your head, and how much
          <em> text</em> exists. The tool uses both to suggest the next action.
        </p>
        <Button variant="primary" onClick={onAddPaper}>
          Add paper
        </Button>
      </div>
    </div>
  );
};
