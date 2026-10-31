import Link from "next/link";

import { AuthCard } from "@/components/auth-card";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = { title: "Choose a new password · Brightloop" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthCard
      title="Choose a new password"
      subtitle="This link works once and expires after one hour."
      footer={
        <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/forgot-password">
          Request a new link
        </Link>
      }
    >
      <ResetPasswordForm token={token ?? ""} />
    </AuthCard>
  );
}
