import type { Metadata, Viewport } from "next";
import Providers from "@/components/Providers";
import { shop } from "@/lib/shop";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: shop.name, template: `%s · ${shop.name}` },
  description: `Request a laundry pickup from ${shop.name}.`,
  icons: { icon: shop.logo },
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
