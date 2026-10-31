import Link from "next/link";

import { AuthCard } from "@/components/auth-card";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = { title: "Reset password · Brightloop" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset password"
      subtitle="We'll prepare a time-limited link for this email. In development the link is shown here instead of being mailed."
      footer={
        <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/login">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
