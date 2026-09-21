import type { KeyboardEvent } from "react";

interface AccessibleTabsProps<T extends string> {
  active: T;
  keys: readonly T[];
  labels: Record<T, string>;
  label: string;
  idPrefix: string;
  onChange: (key: T) => void;
  className?: string;
  buttonClassName: (active: boolean) => string;
}

export default function AccessibleTabs<T extends string>({
  active,
  keys,
  labels,
  label,
  idPrefix,
  onChange,
  className,
  buttonClassName,
}: AccessibleTabsProps<T>) {
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = keys.indexOf(active);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? keys.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + keys.length) % keys.length;
    const next = keys[nextIndex];
    const tablist = event.currentTarget;
    onChange(next);
    window.requestAnimationFrame(() => tablist.querySelector<HTMLElement>(`[data-tab-key="${next}"]`)?.focus());
  }

  return (
    <div role="tablist" aria-label={label} onKeyDown={handleKeyDown} className={className}>
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${key}`}
          aria-selected={active === key}
          aria-controls={`${idPrefix}-panel`}
          data-tab-key={key}
          tabIndex={active === key ? 0 : -1}
          onClick={() => onChange(key)}
          className={buttonClassName(active === key)}
        >
          {labels[key]}
        </button>
      ))}
    </div>
  );
}
