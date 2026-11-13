import type { ReactNode } from "react";

/** Rows of "label: value" used on order summaries. */
export default function Summary({ rows }: { rows: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid gap-2">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[76px_1fr] gap-2.5">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className="[overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
