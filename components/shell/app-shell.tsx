import Link from "next/link";

import { Breadcrumbs } from "@/components/shell/breadcrumbs";
import { SidebarNav } from "@/components/shell/sidebar-nav";

export type ShellLink = { href: string; label: string };

export function AppShell({
  links,
  user,
  children,
}: {
  links: ShellLink[];
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 bg-[#f6f7f9] text-foreground">
      <aside className="app-chrome hidden w-60 shrink-0 flex-col bg-[#714B67] text-white md:flex">
        <Link href={links[0]?.href ?? "/app"} className="px-4 py-4 text-sm font-semibold tracking-wide">
          Brightloop
        </Link>
        <SidebarNav links={links} variant="sidebar" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-chrome sticky top-0 z-30 border-b bg-white">
          <div className="flex h-12 items-center gap-3 px-4">
            <p className="text-sm font-semibold text-[#714B67] md:hidden">Brightloop</p>
            <Breadcrumbs />
            <p className="ml-auto truncate text-sm text-muted-foreground">
              {user.name}
              <span className="ml-2 rounded bg-[#714B67]/10 px-1.5 py-0.5 text-xs font-medium text-[#714B67]">
                {user.role}
              </span>
            </p>
          </div>
          <SidebarNav links={links} variant="mobile" />
        </header>
        <div className="flex-1 px-4 py-5 md:px-6">{children}</div>
      </div>
    </div>
  );
}
