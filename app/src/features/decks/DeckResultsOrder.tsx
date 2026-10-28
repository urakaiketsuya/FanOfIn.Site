import { useState, type ReactNode } from 'react';
import Button from '../../components/ui/Button';
import DialogSheet from '../../components/ui/DialogSheet';
import DisclosureChevron from '../../components/DisclosureChevron';

export default function DeckResultsOrder({ summary, label, children }: { summary: ReactNode; label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
    <p role="status" className="text-xs text-ctp-subtext0">{summary}</p>
    <Button aria-haspopup="dialog" onClick={event => { event.currentTarget.focus(); setOpen(true); }} className="flex max-w-full items-center gap-2"><span>Sort: {label}</span><DisclosureChevron /></Button>
    {open && <DialogSheet title="Sort decks" onDismiss={() => setOpen(false)} footer={<Button variant="primary" onClick={() => setOpen(false)}>Done</Button>}><div className="space-y-4">{children}</div></DialogSheet>}
  </div>;
}
