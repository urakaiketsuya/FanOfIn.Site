import type { OptionValue } from "@gatcg/shared";
import ElementIcon from "../../components/ElementIcon";
import ClassIcon from "../../components/ClassIcon";
import TypeIcon from "../../components/TypeIcon";

interface FilterCheckboxGroupProps {
  label: string;
  options: OptionValue[];
  selected: Set<string>;
  onToggle: (value: string) => void;
  /** Which official icon set (if any) matches this group's option values. */
  iconKind?: "classes" | "types" | "elements";
}

export default function FilterCheckboxGroup({ label, options, selected, onToggle, iconKind }: FilterCheckboxGroupProps) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold text-ctp-subtext0 uppercase tracking-wide">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onToggle(opt.value)}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                active
                  ? "border-ctp-blue bg-ctp-blue/20 text-ctp-blue"
                  : "border-ctp-surface1 text-ctp-subtext1 hover:border-ctp-surface2"
              }`}
            >
              {iconKind === "classes" && <ClassIcon cardClass={opt.value} size={14} />}
              {iconKind === "types" && <TypeIcon type={opt.value} size={14} />}
              {iconKind === "elements" && <ElementIcon element={opt.value} size={14} />}
              {opt.text}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
