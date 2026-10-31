"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { cn } from "cn";

export function ListControls({
  search,
  filters,
  active,
}: {
  search: string;
  filters: Array<{ id: string; label: string }>;
  active: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(search);

  useEffect(() => {
    setValue(search);
  }, [search]);

  useEffect(() => {
    if (value === search) return;
    const handle = window.setTimeout(() => {
      const next = new URLSearchParams(window.location.search);
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      next.delete("page");
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname);
      });
    }, 250);
    return () => window.clearTimeout(handle);
  }, [value, search, pathname, router]);

  function filterHref(id: string) {
    const next = new URLSearchParams(params.toString());
    if (id === "ALL") next.delete("status");
    else next.set("status", id);
    next.delete("page");
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="block">
        <span className="sr-only">Search</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search"
          className="h-9 w-full rounded-md border border-[#e6e1ea] bg-white px-3 text-sm shadow-sm outline-none transition-colors focus-visible:border-[#5c3d56] md:max-w-sm"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.id}
            href={filterHref(filter.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              "transition-colors duration-150",
              active === filter.id ? "border-[#5c3d56] bg-[#5c3d56] text-white" : "border-[#e6e1ea] bg-white text-foreground hover:bg-[#fbf7fa]",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
