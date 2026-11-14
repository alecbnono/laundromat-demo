import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SAMPLE_TEAM } from "@/lib/sample-data";
import { getSession } from "@/lib/session";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/owner");
  return (
    <>
      <h1 className="text-[1.35rem] font-bold">Laundry Dashboard</h1>
      <p className="text-muted-foreground">Log in to your shop (owner or staff).</p>
      <div className="mt-4">
        <LoginForm />
      </div>
      {process.env.NODE_ENV !== "production" && (
        <Alert variant="warning" className="mt-3.5">
          <AlertDescription>
            Development mode: after <code>npm run seed</code> the sample logins are{" "}
            {SAMPLE_TEAM.map((m) => (
              <span key={m.email} className="block">
                {m.role}: <strong>{m.email}</strong> / <strong>{m.password}</strong>
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
