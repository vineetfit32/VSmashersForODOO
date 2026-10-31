import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { homeFor } from "@/lib/auth/access";
import { formatDate, formatInr } from "@/lib/format";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Your subscriptions · Billpilot" };

export default async function PortalSubscriptionsPage() {
  const session = await getSession();
  if (!session?.customerId) redirect(homeFor(session?.role ?? "CUSTOMER"));
  const subscriptions = await prisma.subscription.findMany({
    where: { customerId: session.customerId },
    orderBy: { subscriptionNumber: "desc" },
    include: { plan: true },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHeader title="Your subscriptions" description="Contracts billed to your company." />
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-[#f8f9fa] text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-3 py-2">Number</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Next bill</th>
              <th className="px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                  No subscriptions yet.
                </td>
              </tr>
            ) : (
              subscriptions.map((subscription) => (
                <tr key={subscription.id} className="border-t">
                  <td className="px-3 py-2">
                    <Link className="font-medium text-[#714B67]" href={`/portal/subscriptions/${subscription.id}`}>
                      {subscription.subscriptionNumber}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{subscription.plan.name}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={subscription.status} />
                  </td>
                  <td className="px-3 py-2">{formatDate(subscription.nextBillingDate)}</td>
                  <td className="px-3 py-2">{formatInr(subscription.grandTotal)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
