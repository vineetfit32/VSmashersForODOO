import { CreatePlanForm } from "@/components/setup-forms";
import { PageHeader } from "@/components/page-header";
import { formatInr } from "@/lib/format";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = { title: "Plans · Billpilot" };

export default async function PlansPage() {
  const session = await getSession();
  if (!session) return null;
  const plans = await prisma.subscriptionPlan.findMany({
    where: { organizationId: session.organizationId },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <PageHeader title="Plans" description="Billing frequency for this workspace. Codes only need to be unique inside your company." />
      <CreatePlanForm />
      <ul className="divide-y rounded-xl border-2 border-[#1c1422] bg-white/80">
        {plans.length === 0 ? <li className="px-4 py-8 text-sm text-muted-foreground">No plans yet.</li> : null}
        {plans.map((plan) => (
          <li key={plan.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              <span className="font-medium">{plan.name}</span>
              <span className="text-muted-foreground"> · {plan.code} · {plan.interval.toLowerCase()}</span>
            </span>
            <span>{formatInr(plan.basePrice)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
