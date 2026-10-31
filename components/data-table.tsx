"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function DataTable<T>({
  columns,
  data,
  page,
  pageCount,
  total,
}: {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  page: number;
  pageCount: number;
  total: number;
}) {
  const params = useSearchParams();
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  function pageHref(nextPage: number) {
    const next = new URLSearchParams(params.toString());
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    const query = next.toString();
    return query ? `?${query}` : "?";
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#e6e1ea] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead className="bg-[#f7f4f8] text-left text-xs tracking-wide text-[#6b6270] uppercase">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className="px-3 py-2 font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-muted-foreground">
                  No records match this view.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-[#f0eaf2] transition-colors duration-150 hover:bg-[#fbf7fa]">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t px-3 py-2 text-sm">
        <p className="text-muted-foreground">{total} records</p>
        <div className="flex items-center gap-2">
          <Link
            href={pageHref(page - 1)}
            aria-disabled={page <= 1}
            className={page <= 1 ? "pointer-events-none text-muted-foreground" : "font-medium text-[#5c3d56]"}
          >
            Previous
          </Link>
          <span>
            {page} / {pageCount}
          </span>
          <Link
            href={pageHref(page + 1)}
            aria-disabled={page >= pageCount}
            className={page >= pageCount ? "pointer-events-none text-muted-foreground" : "font-medium text-[#5c3d56]"}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
