import Button from "../ui/Button";

export default function AddDeckCard({ section, onAdd, list = false }: { section: string; onAdd: () => void; list?: boolean }) {
  return <Button onClick={onAdd} aria-label={`Add to ${section}`} className={`flex w-full min-w-0 items-center justify-center gap-3 self-start rounded-xl border-dashed bg-ctp-base ${list ? "min-h-24" : "min-h-24 flex-row sm:aspect-[5/7] sm:flex-col"}`}>
    <span aria-hidden="true" className="text-3xl sm:text-5xl font-light leading-none text-ctp-blue">+</span>
    <span>Add cards</span>
  </Button>;
}
