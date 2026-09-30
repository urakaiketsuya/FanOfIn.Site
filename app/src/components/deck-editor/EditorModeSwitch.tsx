import Button from "../ui/Button";

/** Alternative views of the same parent-owned draft; changing mode never saves or resets it. */
export default function EditorModeSwitch({ value, onChange, label }: {
  value: "cards" | "text"; onChange: (value: "cards" | "text") => void; label: string;
}) {
  return <div role="group" aria-label={label} className="inline-flex rounded-lg border border-ctp-surface1 bg-ctp-base p-1">
    {(["cards", "text"] as const).map(mode => <Button key={mode} type="button" aria-pressed={value === mode} onClick={() => onChange(mode)} className={value === mode ? "bg-ctp-blue/15 text-ctp-blue" : "text-ctp-subtext1"}>{mode === "cards" ? "Cards" : "Text"}</Button>)}
  </div>;
}
