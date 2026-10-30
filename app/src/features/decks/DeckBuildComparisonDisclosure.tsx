import { useId, useState, type ReactNode } from 'react';
import Button from '../../components/ui/Button';
import DisclosureChevron from '../../components/DisclosureChevron';

/** Mount data consumers only on demand; closing cancels their outstanding work. */
export default function DeckBuildComparisonDisclosure({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return <div className="rounded-b-xl bg-ctp-mantle px-3 pb-2">
    <Button className="flex w-full items-center justify-between gap-2" aria-expanded={open} aria-controls={id} onClick={() => setOpen(value => !value)}>
      Compare with build<DisclosureChevron className={open ? 'rotate-180' : ''} />
    </Button>
    <div id={id} hidden={!open}>{open && children}</div>
  </div>;
}
