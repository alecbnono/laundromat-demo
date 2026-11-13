import { shop } from "@/lib/shop";

export default function ShopHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="flex items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shop.logo} alt="" width={48} height={48} className="flex-none rounded-xl" />
      <div>
        <h1 className="text-[1.15rem] font-bold">{shop.name}</h1>
        <p className="text-[0.9rem] text-muted">{subtitle ?? shop.tagline}</p>
      </div>
    </header>
  );
}
