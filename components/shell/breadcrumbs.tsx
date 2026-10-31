"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LABELS: Record<string, string> = {
  app: "Workspace",
  portal: "Portal",
  subscriptions: "Subscriptions",
  invoices: "Invoices",
  payments: "Payments",
  products: "Products",
  discounts: "Discounts",
  finance: "Finance",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = parts.map((part, index) => {
    const href = `/${parts.slice(0, index + 1).join("/")}`;
    const label = LABELS[part] ?? (part.includes("-") && part.length > 20 ? "Detail" : part);
    return { href, label };
  });

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 text-sm md:block">
      <ol className="flex items-center gap-1 text-muted-foreground">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {index === crumbs.length - 1 ? (
              <span className="truncate font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="truncate hover:text-foreground">
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
