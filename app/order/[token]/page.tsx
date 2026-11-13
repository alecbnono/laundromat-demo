import { notFound } from "next/navigation";
import OrderStatus from "@/components/OrderStatus";
import { getOrderByToken } from "@/lib/db/orders";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { token } = await params;
  const order = await getOrderByToken(token);
  if (!order) notFound();
  const isNew = (await searchParams).new === "1";
  return <OrderStatus order={order} isNew={isNew} formHref="/" />;
}
