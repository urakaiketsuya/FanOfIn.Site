import { ForecastChart, ForecastCheckpointSelector, ForecastHeadline } from "../../components/ui/ForecastVisual";

export function ProbabilityCheckpointPicker({ checkpoints, selected, deckSize, onSelect }: {
  checkpoints: { label: string; seen: number }[];
  selected: number;
  deckSize: number;
  onSelect: (seen: number) => void;
}) {
  return <div className="mt-3"><ForecastCheckpointSelector checkpoints={checkpoints} selected={selected} onSelect={(value) => onSelect(Math.min(value, deckSize))} /></div>;
}

export function ProbabilityHeadline({ label, probability, detail }: { label: string; probability: number; detail?: string }) {
  return <div className="mt-4"><ForecastHeadline label={label} value={`${(probability * 100).toFixed(1)}%`} detail={detail} /></div>;
}

export function ProbabilityCurve({ values, selected }: { values: number[]; selected: number }) {
  if (values.length < 2) return null;
  return <div className="mt-2">
    <ForecastChart values={values} height={36} selectedIndex={Math.min(selected, values.length) - 1} />
    <div className="mt-1 flex justify-between text-[10px] text-ctp-subtext0">
      <span>1 seen: {(values[0] * 100).toFixed(0)}%</span>
      <span>{values.length} seen: {(values[values.length - 1] * 100).toFixed(0)}%</span>
    </div>
  </div>;
}
