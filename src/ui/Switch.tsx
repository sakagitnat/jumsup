import { cx } from "./cx";

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  id?: string;
}

export function Switch({ checked, onChange, label, id }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors",
        checked ? "border-primary bg-primary" : "border-line-strong bg-surface-2",
      )}
    >
      <span
        className={cx(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
