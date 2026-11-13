import type { Metadata } from "next";
import DemoShell from "@/components/DemoShell";

export const metadata: Metadata = { title: "Demo", robots: { index: false } };

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <DemoShell>{children}</DemoShell>;
}
