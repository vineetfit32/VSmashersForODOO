import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { homeFor } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/portal", label: "Home" },
  { href: "/portal/subscriptions", label: "Subscriptions" },
  { href: "/portal/invoices", label: "Invoices" },
];

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/portal");
  if (session.role !== "CUSTOMER") redirect(homeFor(session.role));
  if (!session.customerId) redirect("/login");

  return (
    <AppShell links={LINKS} user={{ name: `${session.firstName} ${session.lastName}`, role: "Customer" }}>
      {children}
    </AppShell>
  );
}
