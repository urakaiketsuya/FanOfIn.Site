import type { Dispatch, SetStateAction } from "react";
import type { RecipeGroup, RecipePickerOption } from "./useComboRecipe";

const numberInputClass = "mt-1 block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text focus:border-ctp-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-blue/30";

export function RecipeGroupEditor({
  group,
  groupIndex,
  groupCount,
  matchingCopies,
  matchingCardCount,
  options,
  pickerOpen,
  search,
  onSearchChange,
  onTogglePicker,
  onAddSelection,
  onClearSelection,
  onRemoveCard,
  onRemoveAvoidCard,
  onToggleAvoided,
  setGroups,
}: {
  group: RecipeGroup;
  groupIndex: number;
  groupCount: number;
  matchingCopies: number;
  matchingCardCount: number;
  options: RecipePickerOption[];
  pickerOpen: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onTogglePicker: () => void;
  onAddSelection: (option: RecipePickerOption) => void;
  onClearSelection: () => void;
  onRemoveCard: (name: string) => void;
  onRemoveAvoidCard: (name: string) => void;
  onToggleAvoided: (value: string, avoided: boolean) => void;
  setGroups: Dispatch<SetStateAction<RecipeGroup[]>>;
}) {
  const selectedLabels = group.kind === "cards" ? group.cards.map((name) => ({ value: name, label: name })) : group.value ? [{ value: group.value, label: options.find((option) => option.kind === group.kind && option.value === group.value)?.label ?? group.value }] : [];
  const avoidSelectedLabels = group.avoid?.kind === "cards" ? group.avoid.cards.map((name) => ({ value: name, label: name })) : group.avoid?.value ? [{ value: group.avoid.value, label: options.find((option) => option.kind === group.avoid?.kind && option.value === group.avoid?.value)?.label ?? group.avoid.value }] : [];
  const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(search.trim().toLowerCase()) && !(group.kind === "cards" && option.kind === "cards" && group.cards.includes(option.value)));
  const pieceName = selectedLabels.length
    ? `${group.required}× ${selectedLabels.length > 1 ? "Any of " : ""}${selectedLabels.map((selection) => selection.label).join(" or ")}`
    : "Choose a card or group";

  return <div>
    {groupIndex > 0 && <p className="py-1 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-ctp-subtext0">Then</p>}
    <div className="relative rounded-xl border border-ctp-surface1 bg-ctp-mantle/65 p-3">
      <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-ctp-subtext0">Conditional block {groupIndex + 1}</p>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {selectedLabels.length ? <div className="flex flex-wrap items-center gap-1.5">
            {group.kind === "cards" && selectedLabels.length > 1 && <span className="text-xs font-semibold text-ctp-subtext1">{group.required}× any of:</span>}
            {selectedLabels.map((selection) => <span key={selection.value} className="inline-flex max-w-full items-center rounded-full border border-ctp-mauve/40 bg-ctp-mauve/10 pl-3 text-sm font-semibold text-ctp-text shadow-sm">
              <span className="truncate py-1.5">{group.kind === "cards" && selectedLabels.length > 1 ? selection.label : pieceName}</span>
              <button type="button" aria-label={`Avoid ${selection.label}`} onClick={() => onToggleAvoided(selection.value, true)} className="ml-1 min-h-8 rounded-full px-2 text-[10px] font-bold uppercase tracking-wide text-ctp-subtext0 transition-colors hover:bg-ctp-red/10 hover:text-ctp-red">Avoid</button>
              <button type="button" aria-label={`Remove ${selection.label}`} onClick={() => group.kind === "cards" ? onRemoveCard(selection.value) : onClearSelection()} className="ml-1 inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full text-lg leading-none text-ctp-subtext0 transition-colors hover:bg-ctp-mauve/15 hover:text-ctp-red focus:outline-none focus-visible:ring-2 focus-visible:ring-ctp-mauve/50">×</button>
            </span>)}
          </div> : <p className="text-sm font-semibold text-ctp-subtext0">{pieceName}</p>}
          <p className={`mt-1 text-[10px] ${matchingCardCount ? "text-ctp-subtext0" : "text-ctp-yellow"}`}>{matchingCardCount ? `${matchingCopies} matching copies across ${matchingCardCount} card${matchingCardCount === 1 ? "" : "s"}` : "No piece selected yet."}</p>
        </div>
        <button type="button" onClick={onTogglePicker} aria-expanded={pickerOpen} className="min-h-10 shrink-0 px-2 text-xs font-semibold text-ctp-blue">Add</button>
      </div>

      {avoidSelectedLabels.length > 0 && <div className="mt-3 rounded-lg border border-ctp-red/30 bg-ctp-red/5 p-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-ctp-red">Avoid</span>
          {avoidSelectedLabels.map((selection) => <span key={selection.value} className="inline-flex max-w-full items-center rounded-full border border-ctp-red/40 bg-ctp-red/10 pl-2.5 text-xs font-medium text-ctp-text">
            <span className="truncate py-1.5">{selection.label}</span>
            <button type="button" aria-label={`Want ${selection.label}`} onClick={() => onToggleAvoided(selection.value, false)} className="ml-1 min-h-8 rounded-full px-2 text-[10px] font-bold uppercase tracking-wide text-ctp-subtext0 hover:bg-ctp-mauve/10 hover:text-ctp-mauve">Want</button>
            <button type="button" aria-label={`Remove avoided ${selection.label}`} onClick={() => group.avoid?.kind === "cards" ? onRemoveAvoidCard(selection.value) : setGroups((groups) => groups.map((candidate) => candidate.id === group.id ? { ...candidate, avoid: null } : candidate))} className="ml-1 inline-flex min-h-8 min-w-8 items-center justify-center rounded-full text-base text-ctp-subtext0 hover:bg-ctp-red/15 hover:text-ctp-red">×</button>
          </span>)}
        </div>
        <label className="mt-2 flex items-center justify-between gap-3 text-[10px] text-ctp-subtext0">Maximum allowed
          <select value={group.avoid?.maximum ?? 0} onChange={(event) => setGroups((groups) => groups.map((candidate) => candidate.id === group.id && candidate.avoid ? { ...candidate, avoid: { ...candidate.avoid, maximum: Number(event.target.value) } } : candidate))} className="min-h-9 rounded-md border border-ctp-surface1 bg-ctp-mantle px-2 text-xs text-ctp-text">
            {[0, 1, 2, 3].map((maximum) => <option key={maximum} value={maximum}>{maximum}</option>)}
          </select>
        </label>
      </div>}

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-ctp-surface1 pt-3">
        <label className="text-[10px] text-ctp-subtext0">Copies needed
          <span className="mt-1 flex min-h-10 items-center justify-between rounded-lg border border-ctp-surface1 bg-ctp-base px-1">
            <button type="button" aria-label={`Decrease copies needed for piece ${groupIndex + 1}`} disabled={group.required <= 1} onClick={() => setGroups((groups) => groups.map((candidate) => candidate.id === group.id ? { ...candidate, required: Math.max(1, candidate.required - 1) } : candidate))} className="min-h-9 min-w-9 rounded text-base text-ctp-subtext1 disabled:opacity-35">−</button>
            <span className="font-semibold tabular-nums text-ctp-text">{group.required}</span>
            <button type="button" aria-label={`Increase copies needed for piece ${groupIndex + 1}`} disabled={group.required >= Math.max(1, matchingCopies)} onClick={() => setGroups((groups) => groups.map((candidate) => candidate.id === group.id ? { ...candidate, required: Math.min(Math.max(1, matchingCopies), candidate.required + 1) } : candidate))} className="min-h-9 min-w-9 rounded text-base text-ctp-subtext1 disabled:opacity-35">+</button>
          </span>
        </label>
        <label className="text-[10px] text-ctp-subtext0">Block timing
          <select aria-label={`Timing for piece ${groupIndex + 1}`} value={group.byTurn ?? ""} onChange={(event) => setGroups((groups) => groups.map((candidate) => candidate.id === group.id ? { ...candidate, byTurn: event.target.value ? Number(event.target.value) : null } : candidate))} className={`${numberInputClass} ${group.byTurn == null ? "" : "border-ctp-mauve text-ctp-mauve"}`}>
            <option value="">Any time</option>{[1, 2, 3, 4, 5, 6].map((turn) => <option key={turn} value={turn}>By turn {turn}</option>)}
          </select>
        </label>
      </div>

      {pickerOpen && <RecipeSearchPicker options={filteredOptions} search={search} onSearchChange={onSearchChange} onSelect={onAddSelection} onDone={onTogglePicker} />}
      {groupCount > 2 && <button type="button" onClick={() => setGroups((groups) => groups.filter((candidate) => candidate.id !== group.id))} className="mt-3 text-[10px] text-ctp-subtext0 hover:text-ctp-red">Remove piece</button>}
    </div>
  </div>;
}

function RecipeSearchPicker({ options, search, onSearchChange, onSelect, onDone }: {
  options: RecipePickerOption[];
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (option: RecipePickerOption) => void;
  onDone: () => void;
}) {
  return <div className="absolute z-20 mt-2 w-[min(34rem,calc(100%-1.5rem))] rounded-xl border border-ctp-surface1 bg-ctp-base p-2 shadow-xl">
    <input autoFocus type="search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search cards, Fractal, Ally, Reservable…" className="block min-h-10 w-full rounded-lg border border-ctp-surface1 bg-ctp-mantle px-3 py-2 text-sm text-ctp-text focus:border-ctp-blue focus:outline-none" />
    <div className="mt-2 max-h-64 overflow-y-auto">{options.length ? (["Types and subtypes", "Keywords", "Cards"] as const).map((optionGroup) => {
      const grouped = options.filter((option) => option.group === optionGroup).slice(0, optionGroup === "Cards" ? 30 : 15);
      return grouped.length ? <div key={optionGroup}><p className="px-2 pb-1 pt-2 text-[9px] font-bold uppercase tracking-wide text-ctp-subtext0">{optionGroup}</p>{grouped.map((option) => <button key={`${option.kind}:${option.value}`} type="button" onClick={() => onSelect(option)} className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs text-ctp-text hover:bg-ctp-surface0"><span>{option.label}</span><span className="text-[10px] text-ctp-subtext0">{option.copies} {option.copies === 1 ? "copy" : "copies"}</span></button>)}</div> : null;
    }) : <p className="px-2 py-4 text-center text-xs text-ctp-subtext0">No matches in this Main Deck.</p>}</div>
    <button type="button" onClick={onDone} className="mt-2 w-full rounded-md border border-ctp-surface1 py-1.5 text-xs text-ctp-subtext1">Done</button>
  </div>;
}
