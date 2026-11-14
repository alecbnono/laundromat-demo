import Link from "next/link";
import { redirect } from "next/navigation";
import { listShops } from "@/lib/db/shops";

export const dynamic = "force-dynamic";

/**
 * Each shop has its own form link (/s/<shop>). With a single shop, the bare address goes
 * straight to it. With several, it must not reveal or favour any of them.
 */
export default async function Home() {
  const shops = await listShops();
  if (shops.length === 1) redirect(`/s/${shops[0].slug}`);
  return (
    <div className="grid gap-3 pt-8 text-center">
      <h1 className="text-[1.35rem] font-bold">Laundry Dashboard</h1>
      <p className="text-muted-foreground">
        To request a pickup, open the link your laundry shop gave you.
      </p>
      <p>
        <Link href="/owner/login">Shop owner or staff? Log in</Link>
      </p>
      <p>
        <Link href="/demo">See the demo</Link>
      </p>
    </div>
  );
}
