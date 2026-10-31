import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { homeFor } from "@/lib/auth/access";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/app", label: "Overview" },
  { href: "/app/subscriptions", label: "Subscriptions" },
  { href: "/app/invoices", label: "Invoices" },
  { href: "/app/payments", label: "Payments" },
  { href: "/app/products", label: "Products" },
  { href: "/app/discounts", label: "Discounts" },
  { href: "/app/finance", label: "Finance" },
];

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login?next=/app");
  if (session.role !== "ADMIN" && session.role !== "STAFF") redirect(homeFor(session.role));

  const links = session.role === "ADMIN" ? [...LINKS, { href: "/admin", label: "Control panel" }] : LINKS;

  return (
    <AppShell links={links} user={{ name: `${session.firstName} ${session.lastName}`, role: session.role }}>
      {children}
    </AppShell>
  );
}
