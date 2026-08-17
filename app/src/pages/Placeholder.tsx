interface PlaceholderProps {
  title: string;
  phase: string;
}

export default function Placeholder({ title, phase }: PlaceholderProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold text-ctp-blue">{title}</h1>
      <p className="mt-2 text-ctp-subtext1">Coming in {phase}.</p>
    </div>
  );
}
