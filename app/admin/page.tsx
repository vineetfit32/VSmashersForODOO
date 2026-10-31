import { redirect } from "next/navigation";

import { WorkspaceFrame } from "@/components/workspace-frame";
import { homeFor } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin · Brightloop" };

export default async function AdminPage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "ADMIN") redirect(homeFor(session.role));

  const grouped = await prisma.user.groupBy({
    by: ["role"],
    _count: { _all: true },
  });
  const counts = Object.fromEntries(grouped.map((row) => [row.role, row._count._all]));

  return (
    <WorkspaceFrame
      eyebrow="Admin"
      title={`${session.firstName} ${session.lastName}`}
      description="User management, catalog, tax, and discount setup. This area is limited to administrators."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Admins" value={counts.ADMIN ?? 0} />
        <Stat label="Staff" value={counts.STAFF ?? 0} />
        <Stat label="Customers" value={counts.CUSTOMER ?? 0} />
      </div>
    </WorkspaceFrame>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold">{value}</dd>
    </div>
  );
}
