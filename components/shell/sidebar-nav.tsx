"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ShellLink } from "@/components/shell/app-shell";
import { cn } from "cn";

export function SidebarNav({ links, variant }: { links: ShellLink[]; variant: "sidebar" | "mobile" }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Workspace"
      className={
        variant === "sidebar"
          ? "flex flex-1 flex-col gap-1 px-2 pb-4"
          : "flex gap-1 overflow-x-auto border-t px-2 py-2 md:hidden"
      }
    >
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm whitespace-nowrap",
              variant === "sidebar"
                ? active
                  ? "bg-white/15 font-medium text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
                : active
                  ? "bg-[#714B67] font-medium text-white"
                  : "bg-white text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
