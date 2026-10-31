import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/login-form";
import { homeFor } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Sign in · Billpilot" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) redirect(homeFor(session.role));

  const { next } = await searchParams;

  return (
    <AuthCard
      title="Sign in"
      subtitle="Use your Billpilot account to open the workspace for your role."
      footer={
        <div className="flex flex-col gap-2">
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/forgot-password">
            Forgot password?
          </Link>
          <p>
            New customer?{" "}
            <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/register">
              Create an account
            </Link>
          </p>
        </div>
      }
    >
      <LoginForm next={next ?? ""} />
    </AuthCard>
  );
}
