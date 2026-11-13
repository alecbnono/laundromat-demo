import type { ReactNode } from "react";

export default function PageFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="mt-6 grid justify-items-center gap-1 text-center text-sm text-muted-foreground">
      {children}
    </footer>
  );
}
