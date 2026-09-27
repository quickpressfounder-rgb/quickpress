import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Sparkles, Inbox } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { cn } from "@/shared/lib/utils";
import type { Kpi } from "../api/client";

/* ------------------------------------------------------------------ KPIs */

export type KpiCardProps = {
  kpi?: Kpi;
  title?: string;
  label?: string;
  value?: string | number;
  icon?: ReactNode;
  delta?: string;
  positive?: boolean;
  hint?: string;
};

export function KpiCard(props: KpiCardProps) {
  const labelText = props.title || props.label || props.kpi?.label || "";
  const val = props.value !== undefined ? props.value : (props.kpi?.value ?? "—");
  const deltaVal = props.delta || props.kpi?.delta;
  const isPositive = props.positive !== undefined ? props.positive : (props.kpi?.positive !== false);
  const iconNode = props.icon || <TrendingUp className="size-4" />;
  const hintText = props.hint || props.kpi?.hint;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-white p-4 sm:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-300 hover:border-zinc-300 hover:shadow-md">
      {/* Top Accent Light Line */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500 line-clamp-1">
          {labelText}
        </p>
        <div className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
          {iconNode}
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <p className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900">{val}</p>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5">
        {deltaVal ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black",
              isPositive
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200",
            )}
          >
            {isPositive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {deltaVal}
          </span>
        ) : (
          <span className="text-[10px] text-zinc-400 font-medium">Realtime sync</span>
        )}
        {hintText ? (
          <span className="text-[10px] font-medium text-zinc-400 truncate max-w-[120px]">{hintText}</span>
        ) : null}
      </div>
    </div>
  );
}


export function KpiGrid({
  kpis,
  loading,
  columns = 4,
}: {
  kpis: Kpi[] | undefined;
  loading: boolean;
  columns?: 3 | 4;
}) {
  const grid = columns === 3 ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4";
  if (loading || !kpis) {
    return (
      <div className={cn("grid gap-4", grid)}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-32 rounded-2xl border border-zinc-200 bg-white animate-pulse" />
        ))}
      </div>
    );
  }
  return (
    <div className={cn("grid gap-4", grid)}>
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- status */

const TONES: Record<string, string> = {
  positive: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  danger: "bg-rose-50 text-rose-800 border-rose-200",
  neutral: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

const POSITIVE = new Set([
  "active", "delivered", "live", "verified", "approved", "online", "settled", "resolved", "ready", "paid",
]);
const WARNING = new Set([
  "pending", "pilot", "in processing", "picked up", "out for delivery", "processing", "in progress", "scheduled",
  "beta", "invited", "on delivery", "draft", "sending", "queued", "cod", "paused", "hidden", "medium",
]);
const DANGER = new Set([
  "cancelled", "rejected", "suspended", "blocked", "failed", "expired", "disabled", "high", "refunded", "offline",
]);

export function statusTone(value?: string): keyof typeof TONES {
  if (!value) return "neutral";
  const key = String(value).toLowerCase();
  if (POSITIVE.has(key)) return "positive";
  if (WARNING.has(key)) return "warning";
  if (DANGER.has(key)) return "danger";
  return "neutral";
}

export function StatusPill({ value, status }: { value?: string; status?: string }) {
  const displayValue = value ?? status ?? "—";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider whitespace-nowrap shadow-2xs",
        TONES[statusTone(displayValue)],
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      <span>{displayValue}</span>
    </span>
  );
}

export function CountBadge({ count }: { count: number | string }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-zinc-100 border border-zinc-200 px-2 py-0.5 text-[10px] font-black text-zinc-700">
      {count}
    </span>
  );
}

/* ----------------------------------------------------------------- table */

export type ColumnDef<T> = {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export type DataTableProps<T = any> = {
  columns?: ColumnDef<T>[];
  headers?: string[];
  rows?: any[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: any) => void;
};

import React from "react";

export const DataTable = React.memo(function DataTable<T extends { id?: string } = any>({
  columns,
  headers,
  rows = [],
  loading = false,
  emptyMessage = "No records found",
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 w-full rounded-xl bg-zinc-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const safeRows = Array.isArray(rows) ? rows : [];

  if (safeRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400 border border-zinc-200">
          <Inbox className="size-6" />
        </div>
        <p className="mt-3 text-sm font-bold text-zinc-800">{emptyMessage}</p>
        <p className="mt-1 text-xs text-zinc-400">Records will appear as activity takes place.</p>
      </div>
    );
  }

  // If headers is provided (simple 2D array of ReactNodes)
  if (Array.isArray(headers) && headers.length > 0) {
    return (
      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <Table>
          <TableHeader className="bg-zinc-50/80">
            <TableRow className="border-b border-zinc-200 hover:bg-transparent">
              {headers.map((h, idx) => (
                <TableHead
                  key={idx}
                  className="text-[11px] font-black uppercase tracking-wider text-zinc-500 py-3.5"
                >
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeRows.map((row, rIdx) => (
              <TableRow
                key={row?.id || rIdx}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "contain-render border-b border-zinc-100 transition-colors hover:bg-zinc-50/80",
                  onRowClick ? "cursor-pointer" : "",
                )}
              >
                {Array.isArray(row) ? (
                  row.map((cell, cIdx) => (
                    <TableCell key={cIdx} className="py-3.5 text-xs text-zinc-800 font-medium">
                      {cell ?? "—"}
                    </TableCell>
                  ))
                ) : (
                  <TableCell colSpan={headers.length} className="py-3.5 text-xs text-zinc-800 font-medium">
                    {String(row)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // If columns is provided (object-based rows)
  const safeColumns = Array.isArray(columns) ? columns : [];

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <Table>
        <TableHeader className="bg-zinc-50/80">
          <TableRow className="border-b border-zinc-200 hover:bg-transparent">
            {safeColumns.map((col) => (
              <TableHead
                key={col.key}
                className={cn("text-[11px] font-black uppercase tracking-wider text-zinc-500 py-3.5", col.className)}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {safeRows.map((row, rIdx) => (
            <TableRow
              key={row?.id || rIdx}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "contain-render border-b border-zinc-100 transition-colors hover:bg-zinc-50/80",
                onRowClick ? "cursor-pointer" : "",
              )}
            >
              {safeColumns.map((col) => (
                <TableCell key={col.key} className={cn("py-3.5 text-xs text-zinc-800 font-medium", col.className)}>
                  {col.render ? col.render(row) : (row as any)[col.key] ?? "—"}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}) as <T extends { id?: string } = any>(props: DataTableProps<T>) => React.ReactElement;

/* ----------------------------------------------------------------- cards */

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-zinc-200/90 bg-white p-5 sm:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]",
        className,
      )}
    >
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3.5">
          <div>
            {title ? <h2 className="text-sm sm:text-base font-black tracking-tight text-zinc-900">{title}</h2> : null}
            {description ? <p className="text-xs text-zinc-500 font-medium mt-0.5">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- detail */

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-100 py-2.5 text-xs">
      <span className="font-bold text-zinc-500">{label}</span>
      <span className="font-semibold text-zinc-900 text-right">{value}</span>
    </div>
  );
}