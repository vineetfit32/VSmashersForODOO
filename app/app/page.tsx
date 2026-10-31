import { redirect } from "next/navigation";

import { WorkspaceFrame } from "@/components/workspace-frame";
import { homeFor } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Workspace · Brightloop" };

export default async function StaffWorkspacePage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/app");
  if (session.role !== "ADMIN" && session.role !== "STAFF") redirect(homeFor(session.role));

  const [activeSubscriptions, overdueInvoices] = await Promise.all([
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.invoice.count({ where: { status: "OVERDUE" } }),
  ]);

  return (
    <WorkspaceFrame
      eyebrow={session.role === "ADMIN" ? "Admin in the staff workspace" : "Internal staff"}
      title={`${session.firstName} ${session.lastName}`}
      description="Quotations, subscriptions, invoices, and payments. Customers cannot open this workspace."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Active subscriptions</dt>
          <dd className="mt-1 text-2xl font-semibold">{activeSubscriptions}</dd>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Overdue invoices</dt>
          <dd className="mt-1 text-2xl font-semibold">{overdueInvoices}</dd>
        </div>
      </dl>
    </WorkspaceFrame>
  );
}
