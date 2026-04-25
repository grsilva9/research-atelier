import { useState } from 'react';
import { useStore } from '@/state/store';
import { Button, Modal } from './ui/Primitives';

export const NewPaperModal = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const addPaper = useStore((s) => s.addPaper);
  const [form, setForm] = useState({
    title: '',
    shortName: '',
    venue: '',
    deadline: '',
  });

  const reset = () =>
    setForm({ title: '', shortName: '', venue: '', deadline: '' });

  const handleCreate = () => {
    if (!form.title.trim()) return;
    addPaper({
      title: form.title.trim(),
      shortName: form.shortName.trim() || form.title.trim(),
      venue: form.venue.trim() || undefined,
      deadline: form.deadline || undefined,
    });
    reset();
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New paper"
    >
      <div className="space-y-3">
        <div>
          <label className="section-label">Title</label>
          <input
            className="input mt-1"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Full paper title"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
        </div>
        <div>
          <label className="section-label">Short name</label>
          <input
            className="input mt-1"
            value={form.shortName}
            onChange={(e) => setForm({ ...form, shortName: e.target.value })}
            placeholder="e.g. TransformerRL (used in compact views)"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-label">Venue</label>
            <input
              className="input mt-1"
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="NeurIPS, JMLR, …"
            />
          </div>
          <div>
            <label className="section-label">Deadline</label>
            <input
              type="date"
              className="input mt-1"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!form.title.trim()}
            onClick={handleCreate}
          >
            Create paper
          </Button>
        </div>
      </div>
    </Modal>
  );
};
