// Small shared building blocks, styled with Tailwind.
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const BUTTON_VARIANTS = {
  default: "border-field bg-white text-ink",
  primary: "border-brand bg-brand text-white active:bg-brand-dark",
  danger: "border-[#e3b4b0] bg-white text-danger",
};

export function buttonClass({
  variant = "default",
  small = false,
  className,
}: {
  variant?: keyof typeof BUTTON_VARIANTS;
  small?: boolean;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[10px] border font-semibold no-underline disabled:opacity-60",
    small ? "min-h-10 px-3 py-1.5" : "min-h-12 px-4 py-2.5",
    BUTTON_VARIANTS[variant],
    className,
  );
}

export function Button({
  variant,
  small,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: keyof typeof BUTTON_VARIANTS; small?: boolean }) {
  return <button type={type} className={buttonClass({ variant, small, className })} {...props} />;
}

export function LinkButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn("px-1 py-2 text-brand underline disabled:opacity-60", className)}
      {...props}
    />
  );
}

export const cardClass = "rounded-xl border border-line bg-white p-4 mb-3.5";

export const inputClass =
  "w-full min-h-12 rounded-[10px] border border-field bg-white px-3 py-2.5 text-ink aria-invalid:border-danger";

const PILL_TONES = {
  neutral: "bg-[#e8edf3] text-[#34414f]",
  warn: "bg-warn-bg text-warn",
  info: "bg-[#e0eefc] text-brand-dark",
  ok: "bg-ok-bg text-ok",
  danger: "bg-danger-bg text-danger",
};
export type PillTone = keyof typeof PILL_TONES;

export function Pill({ tone = "neutral", children }: { tone?: PillTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-block flex-none rounded-full px-2.5 py-0.5 text-[0.8rem] font-bold",
        PILL_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Notice({
  tone = "warn",
  children,
}: {
  tone?: "warn" | "success";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "my-3.5 rounded-xl px-3.5 py-3",
        tone === "success" ? "bg-ok-bg text-[#0d4a2c]" : "bg-warn-bg text-[#4a3500]",
      )}
    >
      {children}
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[0.9rem] text-danger">
      {children}
    </p>
  );
}

/** Label text above a form field. */
export function FieldLabel({ children, optional }: { children: ReactNode; optional?: boolean }) {
  return (
    <span className="mb-1.5 block font-semibold">
      {children}
      {optional && <span className="text-[0.85rem] font-normal text-muted"> (optional)</span>}
    </span>
  );
}

/** Rows of "label: value" used on order summaries. */
export function Summary({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid gap-2">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[76px_1fr] gap-2.5">
          <dt className="text-[0.9rem] text-muted">{label}</dt>
          <dd className="[overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PageFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="mt-6 grid justify-items-center gap-1 text-center text-[0.9rem] text-muted">
      {children}
    </footer>
  );
}
