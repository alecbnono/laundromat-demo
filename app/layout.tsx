import type { Metadata, Viewport } from "next";
import Providers from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Laundry Dashboard", template: "%s" },
  description: "Pickup requests, orders and cash for laundry shops.",
  icons: { icon: "/logo.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b6bcb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main className="mx-auto max-w-[520px] px-4 pt-4 pb-12">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
