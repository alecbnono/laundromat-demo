"use client";

import { useShop } from "@/lib/backend";

export default function ShopHeader({ subtitle }: { subtitle?: string }) {
  const shop = useShop();
  return (
    <header className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shop.logo} alt="" width={48} height={48} className="size-12 flex-none rounded-xl" />
      <div className="min-w-0">
        <h1 className="text-[1.15rem] font-bold">{shop.name}</h1>
        <p className="text-sm text-muted-foreground">{subtitle ?? shop.tagline}</p>
      </div>
    </header>
  );
}
