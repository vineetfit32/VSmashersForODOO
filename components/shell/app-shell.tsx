import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";
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
  const home = links[0]?.href ?? "/app";

  return (
    <div className="workspace flex min-h-full flex-1 bg-[#f3f4f6] text-foreground">
      <aside className="app-chrome print:hidden hidden w-60 shrink-0 flex-col bg-[#5c3d56] text-white md:flex">
        <Link href={home} className="border-b border-white/10 px-4 py-4">
          <span className="block text-[11px] font-medium tracking-[0.16em] text-white/70 uppercase">Billpilot</span>
          <span className="mt-1 block text-base font-semibold tracking-tight">Subscriptions</span>
        </Link>
        <SidebarNav links={links} variant="sidebar" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-chrome print:hidden sticky top-0 z-30 border-b border-[#e6e1ea] bg-white/95 backdrop-blur">
          <div className="flex h-12 items-center gap-3 px-4">
            <p className="text-sm font-semibold text-[#5c3d56] md:hidden">Billpilot</p>
            <Breadcrumbs />
            <div className="ml-auto flex min-w-0 items-center gap-2 text-sm">
              <span className="truncate text-[#1f1a24]">{user.name}</span>
              <span className="shrink-0 rounded-full bg-[#f3e8f0] px-2 py-0.5 text-xs font-medium text-[#5c3d56]">
                {user.role}
              </span>
              <LogoutButton />
            </div>
          </div>
          <SidebarNav links={links} variant="mobile" />
        </header>
        <div className="flex-1 px-4 py-6 md:px-6">{children}</div>
      </div>
    </div>
  );
}
