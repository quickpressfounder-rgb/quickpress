import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ExternalLink,
  Headphones,
  Loader2,
  Package,
  Search,
  Send,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ChangeEvent, RefObject } from "react";

import type { SupportTicket } from "@/api/customer/help-api";
import { getStatusBadgeStyle, getTicketBucket } from "./support-utils";

interface TicketChatViewProps {
  ticket: SupportTicket;
  supportPhone: string;
  replyText: string;
  replyPhoto: string | null;
  sendingReply: boolean;
  previewZoomPhoto: string | null;
  chatBottomRef: RefObject<HTMLDivElement | null>;
  replyFileInputRef: RefObject<HTMLInputElement | null>;
  onBack: () => void;
  onChangeReplyText: (text: string) => void;
  onReplyPhotoSelect: (e: ChangeEvent<HTMLInputElement>) => void;
  onClearReplyPhoto: () => void;
  onSendReply: () => void;
  onZoomPhoto: (url: string | null) => void;
}

export function TicketChatView({
  ticket,
  supportPhone,
  replyText,
  replyPhoto,
  sendingReply,
  previewZoomPhoto,
  chatBottomRef,
  replyFileInputRef,
  onBack,
  onChangeReplyText,
  onReplyPhotoSelect,
  onClearReplyPhoto,
  onSendReply,
  onZoomPhoto,
}: TicketChatViewProps) {
  const badge = getStatusBadgeStyle(ticket.status);
  const bucket = getTicketBucket(ticket.status);
  const isSolvedOrClosed = bucket === "solved" || bucket === "closed";
  const inProgressOrDone =
    ticket.status === "in-progress" ||
    ticket.status === "awaiting-customer" ||
    isSolvedOrClosed;

  return (
    <main className="relative flex h-dvh flex-col overflow-hidden bg-[#fafafa] text-zinc-950 font-sans">
      {/* Top Chat Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-200/80 bg-white/95 px-4 pb-3 pt-[max(0.75rem,calc(env(safe-area-inset-top,0px)+0.5rem))] app-header-safe backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-800 transition-colors hover:bg-zinc-200 active:scale-95 cursor-pointer"
            aria-label="Back to tickets"
          >
            <ArrowLeft className="size-4.5 stroke-[2.2]" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-xs font-black tracking-tight text-zinc-950 font-mono">
                #{ticket.ticketNumber}
              </p>
              <span
                className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${badge.className}`}
              >
                {badge.label}
              </span>
            </div>
            <p className="truncate text-[11px] font-medium text-zinc-500">
              {ticket.subject}
            </p>
          </div>
        </div>

        <a
          href={`tel:${supportPhone}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700 transition-colors hover:bg-zinc-100"
          aria-label="Call Support"
        >
          <Headphones className="size-4 stroke-[2.2]" />
        </a>
      </header>

      {/* Ticket Lifecycle Progress Bar */}
      <div className="border-b border-zinc-200/70 bg-white px-4 py-2 shrink-0">
        <div className="mx-auto flex max-w-md items-center justify-between text-[10px] font-bold">
          <span className="text-[#0c831f]">Raised</span>
          <span
            className={`mx-2 h-0.5 flex-1 rounded-full ${
              inProgressOrDone ? "bg-[#0c831f]" : "bg-zinc-200"
            }`}
          />
          <span className={inProgressOrDone ? "text-[#0c831f]" : "text-zinc-400"}>
            {ticket.status === "awaiting-customer" ? "Awaiting Reply" : "In Progress"}
          </span>
          <span
            className={`mx-2 h-0.5 flex-1 rounded-full ${
              isSolvedOrClosed ? "bg-[#0c831f]" : "bg-zinc-200"
            }`}
          />
          <span className={isSolvedOrClosed ? "text-[#0c831f]" : "text-zinc-400"}>
            {ticket.status === "closed" ? "Closed" : "Solved"}
          </span>
        </div>
      </div>

      {/* Linked Order Strip */}
      {ticket.orderNumber ? (
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100/80 px-4 py-2 text-xs font-semibold text-zinc-900 shrink-0">
          <div className="flex items-center gap-1.5">
            <Package className="size-3.5 text-zinc-700" />
            <span>
              Linked to Order <span className="font-mono font-black">#{ticket.orderNumber}</span>
            </span>
          </div>
          {ticket.orderId ? (
            <Link
              to="/track/$orderId"
              params={{ orderId: ticket.orderId }}
              className="flex items-center gap-0.5 text-[11px] font-bold text-zinc-800 hover:underline"
            >
              <span>View Order</span>
              <ExternalLink className="size-3" />
            </Link>
          ) : (
            <Link
              to="/history"
              className="flex items-center gap-0.5 text-[11px] font-bold text-zinc-800 hover:underline"
            >
              <span>View Order</span>
              <ExternalLink className="size-3" />
            </Link>
          )}
        </div>
      ) : null}

      {/* Messages Stream */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div className="mx-auto max-w-md rounded-2xl border border-zinc-200/80 bg-white p-3 text-center shadow-2xs">
          <p className="text-xs font-bold text-zinc-950">{ticket.subject}</p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            {ticket.categoryLabel} · Priority: {ticket.priority}
          </p>
        </div>

        {ticket.messages?.map((msg) => {
          const isCustomer = msg.author === "customer";
          const isSystem = msg.author === "system";

          if (isSystem) {
            return (
              <div key={msg.id} className="my-1.5 flex justify-center">
                <div className="max-w-[85%] rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-center text-[11px] font-medium text-zinc-500">
                  {msg.body}
                </div>
              </div>
            );
          }

          const photosList = msg.photos || (msg.attachmentUrl ? [msg.attachmentUrl] : []);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isCustomer ? "items-end" : "items-start"}`}
            >
              <div className="flex max-w-[84%] items-end gap-2">
                {!isCustomer ? (
                  <div className="mb-1 flex size-6 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-700">
                    <Headphones className="size-3" />
                  </div>
                ) : null}

                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs ${
                    isCustomer
                      ? "rounded-br-xs bg-[#0c831f] text-white"
                      : "rounded-bl-xs border border-zinc-200/80 bg-white text-zinc-900"
                  }`}
                >
                  {photosList.length > 0 ? (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {photosList.map((photoUrl, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => onZoomPhoto(photoUrl)}
                          className="group relative size-20 overflow-hidden rounded-xl border border-black/10 bg-zinc-100 cursor-pointer"
                        >
                          <img
                            src={photoUrl}
                            alt="Garment attachment"
                            className="size-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
                            <Search className="size-4 text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>

                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                      isCustomer ? "text-emerald-100" : "text-zinc-400"
                    }`}
                  >
                    <span>
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                    {isCustomer ? <CheckCircle2 className="size-2.5" /> : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div ref={chatBottomRef} />
      </div>

      {/* Solved / Closed Status Notice */}
      {isSolvedOrClosed ? (
        <div className="border-t border-zinc-200 bg-zinc-100/80 px-4 py-2 text-center text-[11px] font-semibold text-zinc-800 shrink-0">
          This ticket is marked <strong>{badge.label}</strong>. Send a message below if you still need help.
        </div>
      ) : null}

      {/* Reply Photo Preview */}
      {replyPhoto ? (
        <div className="flex items-center gap-2 border-t border-zinc-200 bg-white px-4 py-2 shrink-0">
          <div className="relative size-14 overflow-hidden rounded-xl border border-zinc-200">
            <img src={replyPhoto} alt="Pending upload" className="size-full object-cover" />
            <button
              type="button"
              onClick={onClearReplyPhoto}
              className="absolute right-0.5 top-0.5 rounded-full bg-zinc-900/75 p-0.5 text-white cursor-pointer"
            >
              <X className="size-3" />
            </button>
          </div>
          <p className="text-[11px] text-zinc-500">Photo attached to reply</p>
        </div>
      ) : null}

      {/* Chat Input Bar */}
      <footer className="border-t border-zinc-200/80 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSendReply();
          }}
          className="mx-auto flex max-w-md items-center gap-2"
        >
          <input
            type="file"
            ref={replyFileInputRef}
            onChange={onReplyPhotoSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => replyFileInputRef.current?.click()}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
            aria-label="Attach photo"
          >
            <Camera className="size-4" />
          </button>

          <input
            value={replyText}
            onChange={(e) => onChangeReplyText(e.target.value)}
            placeholder="Type your reply..."
            disabled={sendingReply}
            className="h-10 flex-1 rounded-xl border border-zinc-200 bg-zinc-50/70 px-3.5 text-xs font-medium text-zinc-950 outline-none transition-colors placeholder:text-zinc-400 focus:border-[#0c831f] focus:bg-white"
          />

          <button
            type="submit"
            disabled={sendingReply || (!replyText.trim() && !replyPhoto)}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#0c831f] text-white shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            aria-label="Send message"
          >
            {sendingReply ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </form>
      </footer>

      {/* Photo Zoom Modal */}
      {previewZoomPhoto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => onZoomPhoto(null)}
        >
          <button
            type="button"
            onClick={() => onZoomPhoto(null)}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 cursor-pointer"
            aria-label="Close photo preview"
          >
            <X className="size-5" />
          </button>
          <img
            src={previewZoomPhoto}
            alt="Zoomed attachment"
            className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
          />
        </div>
      ) : null}
    </main>
  );
}
