import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import ShopHeader from "@/components/ShopHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getOwnerSession } from "@/lib/session";
import { DEMO_OWNER } from "@/lib/shop";

export const metadata = { title: "Owner login" };

export default async function LoginPage() {
  if (await getOwnerSession()) redirect("/owner");
  return (
    <>
      <ShopHeader subtitle="Owner login" />
      <div className="mt-4">
        <LoginForm />
      </div>
      {process.env.NODE_ENV !== "production" && (
        <Alert variant="warning" className="mt-3.5">
          <AlertDescription>
            Development mode: after <code>npm run seed</code> the demo login is{" "}
            <strong>{DEMO_OWNER.email}</strong> / <strong>{DEMO_OWNER.password}</strong>.
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
