import type { OptionValue } from "@gatcg/shared";
import ClassIcon from "../ClassIcon";
import ElementIcon from "../ElementIcon";
import TypeIcon from "../TypeIcon";
import FilterGroup from "./FilterGroup";

type IconKind = "classes" | "types" | "elements";

export default function MultiSelectFilter({ label, options, selected, onToggle, iconKind, hint }: {
  label: string;
  options: OptionValue[];
  selected: ReadonlySet<string>;
  onToggle: (value: string) => void;
  iconKind?: IconKind;
  hint?: string;
}) {
  return (
    <FilterGroup label={label} hint={hint} onClear={selected.size > 0 ? () => [...selected].forEach(onToggle) : undefined}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = selected.has(option.value);
          return (
            <button key={option.value} type="button" aria-pressed={active} onClick={() => onToggle(option.value)} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${active ? "border-ctp-blue bg-ctp-blue/15 text-ctp-blue" : "border-ctp-surface1 bg-ctp-mantle text-ctp-subtext1 hover:border-ctp-overlay0 hover:bg-ctp-surface0 hover:text-ctp-text"}`}>
              {iconKind === "classes" && <ClassIcon cardClass={option.value} size={14} />}
              {iconKind === "types" && <TypeIcon type={option.value} size={14} />}
              {iconKind === "elements" && <ElementIcon element={option.value} size={18} />}
              {option.text}
              {active && <span aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    </FilterGroup>
  );
}
