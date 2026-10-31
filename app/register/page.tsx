import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/register-form";
import { homeFor } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Create account · Billpilot" };

export default async function RegisterPage() {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));

  return (
    <AuthCard
      title="Open a workspace"
      subtitle="This creates your company and an admin login. Customers and staff are added inside the workspace."
      footer={
        <p>
          Already registered?{" "}
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/login">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
