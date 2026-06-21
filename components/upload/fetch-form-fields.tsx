import type { ReactNode } from "react";
import Icon from "@/components/ui/Icon";

const fieldShell =
  "rounded-lg border border-outline-variant/80 bg-surface-container-lowest shadow-sm transition-[border-color,box-shadow] focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15";

const controlBase =
  "w-full bg-transparent text-sm text-on-surface outline-none disabled:cursor-not-allowed disabled:opacity-60";

export function FetchFieldLabel({
  htmlFor,
  icon,
  children,
  hint,
}: {
  htmlFor?: string;
  icon?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-1.5">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-xs font-medium text-on-surface"
      >
        {icon ? (
          <Icon name={icon} className="text-base text-primary/80" />
        ) : null}
        {children}
      </label>
      {hint ? (
        <p className="mt-0.5 text-[11px] leading-snug text-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FetchSelect({
  id,
  label,
  icon,
  value,
  onChange,
  options,
  disabled,
  hint,
}: {
  id: string;
  label: string;
  icon?: string;
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex flex-col">
      <FetchFieldLabel htmlFor={id} icon={icon}>
        {label}
      </FetchFieldLabel>
      <div className={`relative ${fieldShell}`}>
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`${controlBase} cursor-pointer appearance-none py-2.5 pl-3 pr-9`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="expand_more"
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant"
        />
      </div>
      {hint ? (
        <p className="mt-1.5 text-[11px] leading-snug text-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FetchTextInput({
  id,
  label,
  icon = "search",
  value,
  onChange,
  placeholder,
  disabled,
  hint,
}: {
  id: string;
  label: string;
  icon?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <FetchFieldLabel htmlFor={id} icon={icon} hint={hint}>
        {label}
      </FetchFieldLabel>
      <div className={`flex items-center gap-2 px-3 py-2.5 ${fieldShell}`}>
        <Icon name={icon} className="shrink-0 text-lg text-on-surface-variant" />
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`${controlBase} min-w-0 placeholder:text-on-surface-variant/70`}
        />
        {value ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange("")}
            className="shrink-0 rounded-md p-0.5 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
            aria-label="Clear search"
          >
            <Icon name="close" className="text-base" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FetchRangeControl({
  id,
  label,
  icon = "tune",
  value,
  min,
  max,
  step,
  disabled,
  onChange,
  hint,
  unit = "reviews",
}: {
  id: string;
  label: string;
  icon?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  hint?: string;
  unit?: string;
}) {
  const percent = ((value - min) / (max - min)) * 100;

  const clamp = (next: number) =>
    Math.min(max, Math.max(min, Math.floor(next)));

  return (
    <div>
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <FetchFieldLabel htmlFor={id} icon={icon} hint={hint}>
          {label}
        </FetchFieldLabel>
        <span className="shrink-0 font-mono text-sm font-bold text-primary">
          {value} {unit}
        </span>
      </div>

      <div className="py-0.5">
        <div className="flex items-center gap-2">
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <button
              type="button"
              disabled={disabled || value <= min}
              onClick={() => onChange(clamp(value - step))}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-outline-variant/70 bg-surface-container-low text-on-surface transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Decrease count"
            >
              <Icon name="remove" className="text-sm" />
            </button>
            <span className="text-[9px] font-medium tabular-nums text-on-surface-variant">
              {min}
            </span>
          </div>

          <div className="fetch-range-track relative min-w-0 flex-1 px-0.5">
            <div
              className="pointer-events-none absolute inset-x-0.5 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-surface-container-high"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-container to-primary transition-[width] duration-150 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <input
              id={id}
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              disabled={disabled}
              onChange={(event) => onChange(Number(event.target.value))}
              className="fetch-range-input relative z-10 w-full"
              aria-valuemin={min}
              aria-valuemax={max}
              aria-valuenow={value}
              aria-valuetext={`${value} ${unit}`}
            />
          </div>

          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <button
              type="button"
              disabled={disabled || value >= max}
              onClick={() => onChange(clamp(value + step))}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-outline-variant/70 bg-surface-container-low text-on-surface transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Increase count"
            >
              <Icon name="add" className="text-sm" />
            </button>
            <span className="text-[9px] font-medium tabular-nums text-on-surface-variant">
              {max}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FetchRatingChips({
  label,
  icon = "star",
  value,
  disabled,
  onChange,
  hint,
}: {
  label: string;
  icon?: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  hint?: string;
}) {
  const options = [
    { value: 0, label: "Any" },
    { value: 1, label: "1+" },
    { value: 2, label: "2+" },
    { value: 3, label: "3+" },
    { value: 4, label: "4+" },
    { value: 5, label: "5★" },
  ];

  return (
    <div>
      <FetchFieldLabel icon={icon} hint={hint}>
        {label}
      </FetchFieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`inline-flex min-w-[2.75rem] items-center justify-center rounded-lg border px-2.5 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                active
                  ? "border-primary bg-primary text-on-primary shadow-sm"
                  : "border-outline-variant/80 bg-surface-container-lowest text-on-surface hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FetchFiltersSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">{title}</p>
        <Icon name="expand_less" className="text-xl text-primary" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 sm:items-start">{children}</div>
    </div>
  );
}
