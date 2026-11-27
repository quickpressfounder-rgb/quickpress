import { Image as ImageIcon, MessageSquare, Package } from "lucide-react";

import type { SupportTicket } from "@/api/customer/help-api";
import {
  formatRelativeTicketTime,
  getStatusBadgeStyle,
  getTicketBucket,
  type TicketBucket,
} from "./support-utils";

interface TicketsListViewProps {
  tickets: SupportTicket[];
  filter: TicketBucket;
  onChangeFilter: (bucket: TicketBucket) => void;
  onOpenTicket: (ticket: SupportTicket) => void;
  onRaiseNew: () => void;
}

export function TicketsListView({
  tickets,
  filter,
  onChangeFilter,
  onOpenTicket,
  onRaiseNew,
}: TicketsListViewProps) {
  const counts = {
    all: tickets.length,
    active: tickets.filter((t) => getTicketBucket(t.status) === "active").length,
    solved: tickets.filter((t) => getTicketBucket(t.status) === "solved").length,
    closed: tickets.filter((t) => getTicketBucket(t.status) === "closed").length,
  };

  const visibleTickets =
    filter === "all"
      ? tickets
      : tickets.filter((t) => getTicketBucket(t.status) === filter);

  const filterTabs: { id: TicketBucket; label: string; count: number }[] = [
    { id: "all", label: "All", count: counts.all },
    { id: "active", label: "Active", count: counts.active },
    { id: "solved", label: "Solved", count: counts.solved },
    { id: "closed", label: "Closed", count: counts.closed },
  ];

  return (
    <div className="space-y-3.5">
      {/* Status Filter Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
        {filterTabs.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeFilter(tab.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] transition-all cursor-pointer ${
                active
                  ? "bg-[#0c831f] font-black text-white shadow-2xs"
                  : "border border-zinc-200/80 bg-white font-bold text-zinc-600 hover:border-zinc-300"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {/* Tickets List or Empty State */}
      {visibleTickets.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 text-center shadow-2xs space-y-3">
          <span className="mx-auto flex size-11 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500">
            <MessageSquare className="size-5 stroke-[2]" />
          </span>
          <div>
            <p className="text-sm font-black text-zinc-950">
              {filter === "all"
                ? "No support tickets yet"
                : `No ${filter} tickets`}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Select an order or topic in Help &amp; Orders to raise a ticket.
            </p>
          </div>
          <button
            type="button"
            onClick={onRaiseNew}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0c831f] hover:bg-[#0a701a] px-5 text-xs font-black text-white shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            Get Support
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleTickets.map((tkt) => {
            const badge = getStatusBadgeStyle(tkt.status);
            const photosList = tkt.photos || (tkt.attachmentUrl ? [tkt.attachmentUrl] : []);
            const timeLabel = formatRelativeTicketTime(tkt.lastMessageAt || tkt.updatedAt || tkt.createdAt);

            return (
              <article
                key={tkt.id}
                onClick={() => onOpenTicket(tkt)}
                className="group cursor-pointer rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-2xs transition-all hover:border-[#0c831f] active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-black text-zinc-950 font-mono">
                        #{tkt.ticketNumber}
                      </span>
                      {tkt.orderNumber ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700 font-mono">
                          <Package className="size-2.5" />#{tkt.orderNumber}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-zinc-950 line-clamp-1">
                      {tkt.subject}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {tkt.description ? (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-500 line-clamp-2">
                    {tkt.description}
                  </p>
                ) : null}

                {photosList.length > 0 ? (
                  <div className="mt-2.5 inline-flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-[#0c831f]">
                    <ImageIcon className="size-3" />
                    <span>
                      {photosList.length} photo{photosList.length > 1 ? "s" : ""} attached
                    </span>
                  </div>
                ) : null}

                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-[11px]">
                  <span className="font-medium text-zinc-400">
                    {tkt.categoryLabel} · {timeLabel}
                  </span>
                  <span className="font-black text-[#0c831f] group-hover:underline">
                    Open Chat ({tkt.messageCount}) →
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
