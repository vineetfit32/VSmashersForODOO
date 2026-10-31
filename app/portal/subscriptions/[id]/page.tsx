import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { StatusPipeline, subscriptionStages } from "@/components/status-pipeline";
import { homeFor } from "@/lib/auth/access";
import { formatDate, formatInr } from "@/lib/format";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PortalSubscriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.customerId) redirect(homeFor(session?.role ?? "CUSTOMER"));
  const { id } = await params;
  const subscription = await prisma.subscription.findFirst({
    where: { id, customerId: session.customerId },
    include: { plan: true, lines: { include: { product: true, variant: true } } },
  });
  if (!subscription) notFound();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="rounded-lg border bg-white p-4">
        <StatusPipeline stages={subscriptionStages(subscription.status)} current={subscription.status} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <p>
            <span className="block text-xs text-muted-foreground">Subscription</span>
            <span className="font-medium">{subscription.subscriptionNumber}</span>
          </p>
          <p>
            <span className="block text-xs text-muted-foreground">Plan</span>
            <span className="font-medium">{subscription.plan.name}</span>
          </p>
          <p>
            <span className="block text-xs text-muted-foreground">Next bill</span>
            <span className="font-medium">{formatDate(subscription.nextBillingDate)}</span>
          </p>
          <p>
            <span className="block text-xs text-muted-foreground">Total</span>
            <span className="font-medium">{formatInr(subscription.grandTotal)}</span>
          </p>
        </div>
      </div>
      <ul className="divide-y rounded-lg border bg-white text-sm">
        {subscription.lines.map((line) => (
          <li key={line.id} className="flex justify-between gap-3 px-4 py-3">
            <span>
              {line.product.name}
              {line.variant ? ` · ${line.variant.attributeValue}` : ""} × {line.quantity}
            </span>
            <span>{formatInr(line.lineTotal)}</span>
          </li>
        ))}
      </ul>
      <Link className="text-sm text-[#714B67]" href="/portal/subscriptions">
        Back to subscriptions
      </Link>
    </div>
  );
}