import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

import { cn } from "@/lib/cn";

export function InputField(
  props: InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    hint?: string;
    error?: string | null;
  },
) {
  const { label, hint, error, className, id, ...inputProps } = props;

  return (
    <label className="flex flex-col gap-2" htmlFor={id}>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <input
        {...inputProps}
        id={id}
        className={cn(
          "h-12 rounded-2xl border border-border bg-surface px-4 text-[15px] text-foreground outline-none",
          "placeholder:text-foreground-muted/80 focus:border-accent focus:accent-ring",
          error && "border-danger/60",
          className,
        )}
      />
      {error ? (
        <span className="text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="text-sm text-foreground-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function SelectField(
  props: SelectHTMLAttributes<HTMLSelectElement> & {
    label: string;
    hint?: string;
    error?: string | null;
    children: ReactNode;
  },
) {
  const { label, hint, error, className, id, children, ...selectProps } = props;

  return (
    <label className="flex flex-col gap-2" htmlFor={id}>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <select
        {...selectProps}
        id={id}
        className={cn(
          "h-12 rounded-2xl border border-border bg-surface px-4 text-[15px] text-foreground outline-none",
          "focus:border-accent focus:accent-ring",
          error && "border-danger/60",
          className,
        )}
      >
        {children}
      </select>
      {error ? (
        <span className="text-sm text-danger">{error}</span>
      ) : hint ? (
        <span className="text-sm text-foreground-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function PrimaryButton(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { className, ...buttonProps } = props;

  return (
    <button
      {...buttonProps}
      className={cn(
        "flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white",
        "hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}

export function SecondaryButton(
  props: ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const { className, ...buttonProps } = props;

  return (
    <button
      {...buttonProps}
      className={cn(
        "flex min-h-11 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground",
        "hover:border-accent/40 hover:bg-surface-muted/45 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    />
  );
}

export function Banner(props: {
  tone?: "default" | "success" | "danger";
  children: ReactNode;
}) {
  const tone = props.tone ?? "default";

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm leading-6",
        tone === "default" &&
          "border-border bg-surface-muted/45 text-foreground",
        tone === "success" &&
          "border-success/25 bg-success/10 text-success",
        tone === "danger" &&
          "border-danger/20 bg-danger/10 text-danger",
      )}
    >
      {props.children}
    </div>
  );
}
