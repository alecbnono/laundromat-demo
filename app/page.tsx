import RequestPage from "@/components/RequestPage";

// The allowed pickup dates depend on today's date, so render per request.
export const dynamic = "force-dynamic";

export default function Home() {
  return <RequestPage />;
}
