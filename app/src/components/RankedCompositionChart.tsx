import type { DonutSegment } from "./DonutChart";
import HorizontalBarChart from "./HorizontalBarChart";

export default function RankedCompositionChart({ title, segments }: { title: string; segments: DonutSegment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const displayed = segments.length > 8
    ? [...segments.slice(0, 7), { label: "Other", value: segments.slice(7).reduce((sum, segment) => sum + segment.value, 0), color: "var(--color-ctp-overlay0)" }]
    : segments;
  return (
    <HorizontalBarChart
      title={title}
      bars={displayed.map((segment) => ({
        key: segment.label,
        label: segment.label,
        value: segment.value,
        valueLabel: total > 0 ? `${segment.value} · ${((segment.value / total) * 100).toFixed(0)}%` : `${segment.value}`,
      }))}
    />
  );
}
