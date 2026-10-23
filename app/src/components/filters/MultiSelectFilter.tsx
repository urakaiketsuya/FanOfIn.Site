import ClassIcon from "../ClassIcon";
import ElementIcon from "../ElementIcon";
import TypeIcon from "../TypeIcon";
import { excludeFilterValue, hasFilterValue, type OptionValue } from "@gatcg/shared";
import FilterGroup from "./FilterGroup";
import Button from "../ui/Button";

type IconKind = "classes" | "types" | "elements";
export default function MultiSelectFilter({ label, options, selected, onToggle, hint, iconKind, onClear }: {
  label: string; options: OptionValue[]; selected: ReadonlySet<string>; onToggle: (value: string) => void;
  onClear?: () => void; iconKind?: IconKind; hint?: string;
}) {
  return <FilterGroup label={label} hint={hint} onClear={selected.size ? onClear : undefined}>
    <div className="space-y-2">{options.map(option => <div key={option.value} className="flex flex-wrap items-center justify-between gap-2 border-b border-ctp-surface0 py-1">
      <span className="flex items-center gap-2 text-sm">{iconKind === "classes" && <ClassIcon cardClass={option.value} size={16} />}{iconKind === "elements" && <ElementIcon element={option.value} size={18} />}{iconKind === "types" && <TypeIcon type={option.value} size={16} />}{option.text}</span>
      <div className="flex gap-2" role="group" aria-label={option.text}>
        <Button className="aria-pressed:border-ctp-blue aria-pressed:bg-ctp-blue/15" size="sm" aria-label={`Include ${option.text}`} aria-pressed={hasFilterValue(selected, option.value)} onClick={() => onToggle(option.value)}>Include</Button>
        <Button className="aria-pressed:border-ctp-peach aria-pressed:bg-ctp-peach/15" size="sm" aria-label={`Exclude ${option.text}`} aria-pressed={hasFilterValue(selected, excludeFilterValue(option.value))} onClick={() => onToggle(excludeFilterValue(option.value))}>Exclude</Button>
      </div>
    </div>)}</div>
  </FilterGroup>;
}
