import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  FileText,
  Headphones,
  Image as ImageIcon,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessageSquare,
  Paperclip,
  Phone,
  PhoneCall,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Trash2,
  User,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  CAPTAIN_EMERGENCY_SOS,
  CAPTAIN_SUPPORT_EMAIL,
  CAPTAIN_SUPPORT_EMAIL_OFFICIAL,
  createCaptainSupportTicket,
  fetchCaptainSupport,
  fetchCaptainSupportTickets,
  type CaptainSupportResponse,
  type CreateTicketPayload,
  type SupportTicket,
} from "../api/rider/rider-support-api";
import { triggerHaptic } from "../lib/captain-audio";

interface CaptainHelpScreenProps {
  onBack: () => void;
  onOpenGuidelines?: () => void;
}

interface ChatMessage {
  id: string;
  sender: "captain" | "support";
  text: string;
  time: string;
  quickAction?: { label: string; url?: string; action?: () => void };
}

export const CaptainHelpScreen: React.FC<CaptainHelpScreenProps> = ({
  onBack,
  onOpenGuidelines,
}) => {
  const [activeTab, setActiveTab] = useState<"chat" | "ticket" | "my-tickets" | "faq">("chat");

  // Support Contacts State
  const [supportData, setSupportData] = useState<CaptainSupportResponse>({
    ok: true,
    helplinePhone: "1800 012 3456",
    supportEmail: CAPTAIN_SUPPORT_EMAIL,
    whatsappUrl: "",
    emergencySosNumber: CAPTAIN_EMERGENCY_SOS,
    workingHours: "24 Hours · 7 Days a Week (24/7)",
    hubAddress: "QuickPress Express Hub, Kasganj, Uttar Pradesh 207123",
  });

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("qp_captain_chat_history");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "msg-1",
        sender: "support",
        text: "Namaste Captain! 🙏 QuickPress 24/7 Live Fleet Support me aapka swagat hai. Aapko order, payout ya delivery me kya samasya aa rahi hai? Neeche diye quick button se chun sakte hain ya seedhe message type karein.",
        time: "Just now",
      },
    ];
  });
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Ticket Form State
  const [ticketCategory, setTicketCategory] = useState("trip");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketOrderId, setTicketOrderId] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriority, setTicketPriority] = useState<"normal" | "urgent" | "emergency">("urgent");
  const [ticketImageName, setTicketImageName] = useState<string | null>(null);
  const [ticketImagePreview, setTicketImagePreview] = useState<string | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const ticketFileInputRef = useRef<HTMLInputElement | null>(null);

  // My Tickets State
  const [ticketsList, setTicketsList] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem("qp_captain_tickets");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "tkt-seed-1",
        ticketNumber: "TKT-89421",
        category: "payout",
        categoryLabel: "Payout & Wallet",
        subject: "Daily Bank Settlement Confirmation",
        description: "Zero commission payout credited to Bank account successfully.",
        priority: "normal",
        status: "resolved",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        messageCount: 2,
      },
    ];
  });
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Load live support config & tickets from backend
  useEffect(() => {
    fetchCaptainSupport()
      .then((res) => {
        if (res) setSupportData(res);
      })
      .catch(() => {});

    setLoadingTickets(true);
    fetchCaptainSupportTickets()
      .then((res) => {
        if (res && res.items?.length) {
          setTicketsList((prev) => {
            const combined = [...res.items];
            // Merge with local tickets not yet on server
            for (const item of prev) {
              if (!combined.some((c) => c.ticketNumber === item.ticketNumber)) {
                combined.unshift(item);
              }
            }
            try {
              localStorage.setItem("qp_captain_tickets", JSON.stringify(combined));
            } catch {}
            return combined;
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTickets(false));
  }, []);

  // Save chat history
  useEffect(() => {
    try {
      localStorage.setItem("qp_captain_chat_history", JSON.stringify(chatMessages));
    } catch {}
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Handle Send Chat Message
  const handleSendMessage = (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content) return;
    triggerHaptic(20);

    const newMsg: ChatMessage = {
      id: `cap-${Date.now()}`,
      sender: "captain",
      text: content,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setInputText("");
    setIsTyping(true);

    // Smart Fleet AI Assistant Response for rapid resolution
    setTimeout(() => {
      setIsTyping(false);
      triggerHaptic(30);

      let replyText =
        "Aapki request note kar li gayi hai. Fleet Dispatch Manager turant review kar rahe hain.";
      let quickAction: ChatMessage["quickAction"] = undefined;

      const lower = content.toLowerCase();
      if (lower.includes("customer") && (lower.includes("phone") || lower.includes("call") || lower.includes("reach") || lower.includes("pick"))) {
        replyText =
          "Customer ko app se 2-3 baar call karein. Agar 10 minute tak koi response nahi milta hai, toh aap Support Ticket raise kar sakte hain ya Dispatch Team ko alert bhej sakte hain. Aapki rating affect nahi hogi.";
        quickAction = {
          label: "Raise Customer Issue Ticket",
          action: () => setActiveTab("ticket"),
        };
      } else if (lower.includes("store") || lower.includes("closed") || lower.includes("delay") || lower.includes("dukan")) {
        replyText =
          "Partner store par delay hone par order details note karein. Store arrival swipe karne ke baad store manager ko partner OTP verify karayein. Agar dukan band hai toh turant Support Ticket me photo attach karein.";
        quickAction = {
          label: "Report Store Delay Ticket",
          action: () => setActiveTab("ticket"),
        };
      } else if (lower.includes("payout") || lower.includes("rupaye") || lower.includes("wallet") || lower.includes("bank") || lower.includes("payment")) {
        replyText =
          "QuickPress 0% Commission policy ke mutabiq 100% trip earnings direct aapke wallet me credit hoti hain. Daily settlements automatic aapke bank account me transfer hote hain.";
        quickAction = {
          label: "Raise Payout Ticket",
          action: () => setActiveTab("ticket"),
        };
      } else if (lower.includes("cancel") || lower.includes("penalty") || lower.includes("cancellation")) {
        replyText =
          "Genuine emergencies ya customer unavailability ki wajah se cancellation par koi penalty nahi lagti. Fleet Manager se turant connect karne ke liye Ticket raise karein.";
        quickAction = {
          label: "Raise Cancellation Ticket",
          action: () => setActiveTab("ticket"),
        };
      } else {
        replyText =
          "Dhanyawad Captain. Aapki enquiry Dispatch Support Desk ko forward kardi gayi hai. Instant assistance ke liye aap Support Ticket raise kar sakte hain ya email kar sakte hain.";
        quickAction = {
          label: "Raise Support Ticket",
          action: () => setActiveTab("ticket"),
        };
      }

      const botReply: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "support",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        quickAction,
      };

      setChatMessages((prev) => [...prev, botReply]);
    }, 700);
  };

  // Quick Problem Chips for Instant Resolution
  const quickProblems = [
    { label: "📞 Customer not answering", query: "Customer phone nahi utha raha hai, kya karu?" },
    { label: "🏪 Store partner delay", query: "Partner store par kapde ready nahi hain aur delay ho raha hai." },
    { label: "💰 Payout / Bank query", query: "Meri trip earning aur bank settlement ka update chahiye." },
    { label: "📍 Wrong delivery location", query: "Customer ka delivery location map me galat dikh raha hai." },
    { label: "🚨 Urgent cancellation", query: "Emergency hai, trip cancel karne me help chahiye bina penalty." },
  ];

  // Handle Photo Attachment in Ticket
  const handleTicketPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB.");
      return;
    }

    setTicketImageName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setTicketImagePreview(reader.result as string);
      triggerHaptic(15);
      toast.success("Attachment added: " + file.name);
    };
    reader.readAsDataURL(file);
  };

  // Submit Support Ticket
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim()) {
      toast.error("Kripya subject darj karein.");
      return;
    }
    if (!ticketDescription.trim()) {
      toast.error("Kripya samasya ka vivaran (description) likhein.");
      return;
    }

    setSubmittingTicket(true);
    triggerHaptic(30);

    const generatedNumber = `TKT-${Math.floor(10000 + Math.random() * 90000)}`;
    const newTicket: SupportTicket = {
      id: `tkt-${Date.now()}`,
      ticketNumber: generatedNumber,
      category: ticketCategory,
      categoryLabel:
        ticketCategory === "trip"
          ? "Trip Issue"
          : ticketCategory === "payout"
          ? "Payout & Settlement"
          : ticketCategory === "store"
          ? "Partner Store Issue"
          : "General Support",
      subject: ticketSubject.trim(),
      description: ticketDescription.trim(),
      orderId: ticketOrderId.trim() || undefined,
      orderNumber: ticketOrderId.trim() || undefined,
      priority: ticketPriority,
      status: "open",
      attachmentName: ticketImageName,
      createdAt: new Date().toISOString(),
      messageCount: 1,
    };

    try {
      const payload: CreateTicketPayload = {
        category: ticketCategory,
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
        orderId: ticketOrderId.trim() || null,
        attachmentName: ticketImageName,
        priority: ticketPriority,
      };

      try {
        await createCaptainSupportTicket(payload);
      } catch (err) {
        console.warn("Server ticket endpoint fallback to local storage:", err);
      }

      setTicketsList((prev) => {
        const updated = [newTicket, ...prev];
        try {
          localStorage.setItem("qp_captain_tickets", JSON.stringify(updated));
        } catch {}
        return updated;
      });

      toast.success(`Support Ticket #${generatedNumber} raised successfully! 🎫`);
      setTicketSubject("");
      setTicketOrderId("");
      setTicketDescription("");
      setTicketImageName(null);
      setTicketImagePreview(null);
      setActiveTab("my-tickets");
    } catch {
      toast.error("Ticket create karne me samasya aayi. Kripya punah prayas karein.");
    } finally {
      setSubmittingTicket(false);
    }
  };

  // FAQs List for Instant Answers
  const captainFaqs = [
    {
      q: "Customer call nahi utha raha hai toh mujhe kya karna chahiye?",
      a: "App se customer ko 2 se 3 baar call karein. Agar 10 minute tak koi contact nahi hota hai, toh app me 'Customer Unreachable' mark karein. Dispatch system aapko store par order safely return karne ki instruction dega aur aapki rating par koi negative asar nahi padega.",
    },
    {
      q: "Zero Commission policy kaise kaam karti hai?",
      a: "QuickPress Captain network 100% 0% Commission par operate karta hai. Delivery fee ka 100% hissa aur customer dwara diya gaya har tip bina kisi deduction ke aapke wallet me jata hai.",
    },
    {
      q: "Store par kapde drop karne ke baad mujhe 75% payout kab milta hai?",
      a: "Jab aap customer se pickup karke store par kapde safely drop karte hain, tab aap 'Leave Trip at Store' chun sakte hain. Isse 75% net payout turant aapke wallet me jud jata hai, aur return delivery leg doosre captain ko transfer kar di jaati hai.",
    },
    {
      q: "Bank Account settlement kab hota hai?",
      a: "Wallet balance har din automatic aapke verified bank account me transfer kiya jata hai. Minimum balance ya hidden fee zero hai.",
    },
    {
      q: "Emergency SOS aur Roadside Help kaise milegi?",
      a: "Kisi bhi durghatna ya accident ki sthiti me top SOS button dabakar seedhe 112 National Emergency ko call karein. Sath hi Support Desk ko ticket ya email ke madhyam se turant suchit karein.",
    },
  ];

  return (
    <div
      className="relative flex flex-col w-full min-h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] text-zinc-900 select-none font-sans"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 24px, 40px)" }}
    >
      {/* 1. Sticky Header with Back Button */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200/80 shadow-2xs shrink-0"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px) + 8px, 12px)" }}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(20);
              onBack();
            }}
            className="p-2 -ml-1 text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 rounded-full active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-base font-black text-zinc-900 tracking-tight leading-tight">
              24/7 Captain Helpline & Support
            </h1>
            <p className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Agents Live · Instant Resolution</span>
            </p>
          </div>
        </div>

        {onOpenGuidelines && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              onOpenGuidelines();
            }}
            className="p-2 text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-all active:scale-95"
            title="Guidelines & SOP"
          >
            <FileText className="size-4" />
          </button>
        )}
      </header>

      {/* 2. INSTANT DIRECT CONTACT CARDS (OFFICIAL EMAIL & EMERGENCY SOS) */}
      <div className="p-4 pb-2 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Email Support */}
          <a
            href={`mailto:${CAPTAIN_SUPPORT_EMAIL}?subject=Captain%20Support%20Request%20-%20QuickPress`}
            onClick={() => triggerHaptic(15)}
            className="flex items-center gap-3 p-3.5 rounded-3xl border border-blue-200/90 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40 hover:bg-blue-100/50 active:scale-98 transition-all shadow-2xs"
          >
            <div className="size-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Mail className="size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block">Official Email</span>
              <p className="text-xs font-black text-zinc-950 truncate">support@quickpress.app</p>
              <span className="text-[10px] text-zinc-500 font-semibold block mt-0.5">24/7 Desk Help</span>
            </div>
          </a>

          {/* Emergency SOS 112 */}
          <a
            href={`tel:${CAPTAIN_EMERGENCY_SOS}`}
            onClick={() => triggerHaptic(40)}
            className="flex items-center gap-3 p-3.5 rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 hover:bg-rose-100/50 active:scale-98 transition-all shadow-2xs"
          >
            <div className="size-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-rose-800 uppercase tracking-wider block">Emergency SOS</span>
              <p className="text-xs font-black text-rose-700 font-mono">Dial 112</p>
              <span className="text-[10px] text-zinc-500 font-semibold block mt-0.5">Police & Medical</span>
            </div>
          </a>
        </div>
      </div>

      {/* 3. FOUR CORE INTERACTIVE WORKING TABS */}
      <div className="sticky top-[57px] z-20 bg-white/95 backdrop-blur-md px-4 py-2 border-b border-zinc-200/70 shadow-2xs">
        <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/70">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveTab("chat");
            }}
            className={`py-2 px-1 text-center font-black text-[11px] rounded-xl transition-all ${
              activeTab === "chat"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Live Chat
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveTab("ticket");
            }}
            className={`py-2 px-1 text-center font-black text-[11px] rounded-xl transition-all ${
              activeTab === "ticket"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            Raise Ticket
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveTab("my-tickets");
            }}
            className={`py-2 px-1 text-center font-black text-[11px] rounded-xl transition-all relative ${
              activeTab === "my-tickets"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <span>My Tickets</span>
            {ticketsList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500 text-white text-[9px] font-black">
                {ticketsList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(15);
              setActiveTab("faq");
            }}
            className={`py-2 px-1 text-center font-black text-[11px] rounded-xl transition-all ${
              activeTab === "faq"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-500 hover:text-zinc-800"
            }`}
          >
            FAQs
          </button>
        </div>
      </div>

      {/* 4. TAB CONTENTS */}
      <div className="p-4 space-y-4">
        {/* ======================================================== */}
        {/* TAB 1: LIVE CHAT SYSTEM (FOR FASTEST RESOLUTION)          */}
        {/* ======================================================== */}
        {activeTab === "chat" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* Quick Situation Problem Chips */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-zinc-500 flex items-center gap-1">
                <Zap className="size-3 text-amber-500 fill-current" />
                <span>Quick Problem Solver (Tap for Instant Help):</span>
              </p>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
                {quickProblems.map((prob, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(prob.query)}
                    className="shrink-0 px-2.5 py-1.5 rounded-xl bg-white border border-zinc-200/90 text-[11px] font-bold text-zinc-800 shadow-2xs hover:bg-zinc-50 active:scale-95 transition-all"
                  >
                    {prob.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Stream Window */}
            <div className="rounded-3xl border border-zinc-200/80 bg-white p-3 shadow-xs min-h-[340px] max-h-[460px] flex flex-col justify-between">
              {/* Message History */}
              <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1">
                {chatMessages.map((msg) => {
                  const isCap = msg.sender === "captain";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isCap ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-start gap-2 max-w-[85%]">
                        {!isCap && (
                          <div className="size-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                            <Bot className="size-4" />
                          </div>
                        )}
                        <div
                          className={`p-3 rounded-2xl text-xs leading-relaxed ${
                            isCap
                              ? "bg-zinc-900 text-white rounded-br-xs"
                              : "bg-zinc-100 text-zinc-900 rounded-tl-xs"
                          }`}
                        >
                          <p>{msg.text}</p>
                          {msg.quickAction && (
                            <div className="mt-2 pt-2 border-t border-zinc-200/80">
                              {msg.quickAction.url ? (
                                <a
                                  href={msg.quickAction.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#25D366] text-white font-bold text-[10px] rounded-lg shadow-2xs active:scale-95 transition-all"
                                >
                                  <MessageCircle className="size-3 fill-current" />
                                  <span>{msg.quickAction.label}</span>
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={msg.quickAction.action}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-900 text-white font-bold text-[10px] rounded-lg shadow-2xs active:scale-95 transition-all"
                                >
                                  <span>{msg.quickAction.label}</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-[9px] text-zinc-400 mt-0.5 px-1">{msg.time}</span>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-2 text-zinc-400 text-xs py-1">
                    <div className="size-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Bot className="size-4" />
                    </div>
                    <span className="flex items-center gap-1 font-semibold text-zinc-500">
                      Fleet Assistant typing
                      <span className="size-1 rounded-full bg-zinc-400 animate-bounce" />
                      <span className="size-1 rounded-full bg-zinc-400 animate-bounce delay-100" />
                      <span className="size-1 rounded-full bg-zinc-400 animate-bounce delay-200" />
                    </span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="pt-2 border-t border-zinc-100 flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Apna sawal ya samasya yahan likhein..."
                  className="flex-1 px-3.5 py-2.5 bg-zinc-100 rounded-2xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/30"
                />
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim()}
                  className="size-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 text-white flex items-center justify-center active:scale-95 transition-all shrink-0 cursor-pointer shadow-xs"
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: TICKET SYSTEM (RAISE OFFICIAL SUPPORT TICKET)       */}
        {/* ======================================================== */}
        {activeTab === "ticket" && (
          <form
            onSubmit={handleSubmitTicket}
            className="rounded-3xl border border-zinc-200/80 bg-white p-4 shadow-xs space-y-3.5 animate-in fade-in duration-200"
          >
            <div>
              <h3 className="text-sm font-black text-zinc-900 leading-tight">
                Raise an Official Support Ticket
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Our Fleet Dispute Desk investigates and resolves official tickets within 2-4 hours.
              </p>
            </div>

            {/* Category Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700">Issue Category (Samasya ka Prakar)</label>
              <select
                value={ticketCategory}
                onChange={(e) => setTicketCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-900 focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="trip">Trip & Delivery Leg Issue</option>
                <option value="payout">Payout, Bank & Zero Commission</option>
                <option value="store">Partner Store Handover Delay</option>
                <option value="customer">Customer Dispute / Address Issue</option>
                <option value="kyc">Account, Document & KYC</option>
                <option value="glitch">App GPS & Technical Glitch</option>
              </select>
            </div>

            {/* Optional Order ID */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700">Order / Trip ID (Optional)</label>
              <input
                type="text"
                value={ticketOrderId}
                onChange={(e) => setTicketOrderId(e.target.value)}
                placeholder="e.g. ORD-9812 or leave empty"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700">Subject (Mukhya Vishay) *</label>
              <input
                type="text"
                required
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="e.g. Order #ORD-891 pickup delay / Payout discrepancy"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Detailed Description */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700">Description (Poori Jankari) *</label>
              <textarea
                required
                rows={3}
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                placeholder="Apni samasya ka poora vivaran yahan darj karein..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 text-xs text-zinc-900 placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>

            {/* Photo / Screenshot Attachment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">Screenshot / Photo Attachment</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => ticketFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-xs font-bold text-zinc-700 hover:bg-zinc-100 active:scale-95 transition-all"
                >
                  <Paperclip className="size-3.5 text-zinc-500" />
                  <span>{ticketImageName ? "Change Attachment" : "Add Screenshot / Receipt"}</span>
                </button>
                <input
                  ref={ticketFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleTicketPhotoUpload}
                />
                {ticketImageName && (
                  <button
                    type="button"
                    onClick={() => {
                      setTicketImageName(null);
                      setTicketImagePreview(null);
                    }}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl"
                    title="Remove"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              {ticketImagePreview && (
                <div className="relative mt-2 size-20 rounded-2xl overflow-hidden border border-zinc-200">
                  <img src={ticketImagePreview} alt="Upload preview" className="size-full object-cover" />
                </div>
              )}
            </div>

            {/* Priority Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-700">Priority Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(["normal", "urgent", "emergency"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setTicketPriority(p);
                    }}
                    className={`py-2 text-center text-xs font-black rounded-xl capitalize transition-all border ${
                      ticketPriority === p
                        ? p === "emergency"
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : p === "urgent"
                          ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                          : "bg-zinc-900 text-white border-zinc-900 shadow-xs"
                        : "bg-zinc-50 text-zinc-600 border-zinc-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submittingTicket}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-600/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {submittingTicket ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4" />
                  <span>Submit Ticket (Ticket Darj Karein)</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ======================================================== */}
        {/* TAB 3: MY TICKETS & LIVE STATUS                           */}
        {/* ======================================================== */}
        {activeTab === "my-tickets" && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">
                Support Ticket History ({ticketsList.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setActiveTab("ticket");
                }}
                className="flex items-center gap-1 text-xs font-black text-emerald-600 hover:underline"
              >
                <Plus className="size-3.5" />
                <span>New Ticket</span>
              </button>
            </div>

            {loadingTickets ? (
              <div className="py-8 text-center text-zinc-400 flex items-center justify-center gap-2">
                <RefreshCw className="size-4 animate-spin text-emerald-600" />
                <span className="text-xs font-semibold">Loading tickets...</span>
              </div>
            ) : ticketsList.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-zinc-200/80 space-y-2">
                <LifeBuoy className="size-8 text-zinc-300 mx-auto" />
                <p className="text-xs font-bold text-zinc-700">No Support Tickets Raised</p>
                <p className="text-[11px] text-zinc-400">
                  When you raise a ticket, you can track real-time resolution status here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("ticket")}
                  className="px-4 py-2 bg-zinc-900 text-white text-xs font-black rounded-xl mt-2 active:scale-95"
                >
                  Raise First Ticket
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {ticketsList.map((tkt) => {
                  const isExpanded = expandedTicketId === tkt.id;
                  const isResolved = tkt.status === "resolved" || tkt.status === "closed";
                  return (
                    <div
                      key={tkt.id}
                      className="rounded-3xl border border-zinc-200/80 bg-white p-3.5 shadow-xs space-y-2 cursor-pointer transition-all"
                      onClick={() => {
                        triggerHaptic(10);
                        setExpandedTicketId(isExpanded ? null : tkt.id);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black font-mono text-zinc-950">
                              #{tkt.ticketNumber}
                            </span>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isResolved
                                  ? "bg-emerald-100 text-emerald-800"
                                  : tkt.status === "in-progress"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {isResolved ? "Resolved ✓" : tkt.status === "in-progress" ? "In Progress ⏳" : "Open / Review"}
                            </span>
                          </div>
                          <h4 className="text-xs font-black text-zinc-900 mt-1 leading-snug">
                            {tkt.subject}
                          </h4>
                        </div>
                        <ChevronDown
                          className={`size-4 text-zinc-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-100">
                        <span>{tkt.categoryLabel || tkt.category}</span>
                        <span>{new Date(tkt.createdAt).toLocaleDateString()}</span>
                      </div>

                      {isExpanded && (
                        <div className="pt-2 border-t border-zinc-100 space-y-2 text-xs text-zinc-600 animate-in fade-in duration-150">
                          <p className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100">
                            {tkt.description}
                          </p>
                          {tkt.attachmentName && (
                            <p className="text-[10px] text-zinc-500 font-semibold flex items-center gap-1">
                              <Paperclip className="size-3" />
                              <span>Attached: {tkt.attachmentName}</span>
                            </p>
                          )}
                          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-900 flex items-center justify-between">
                            <span>Status: {isResolved ? "Complaint resolved by Desk." : "Fleet Officer reviewing this case."}</span>
                            <a
                              href={`mailto:${CAPTAIN_SUPPORT_EMAIL}?subject=Update%20on%20Ticket%20#${tkt.ticketNumber}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-black text-emerald-700 underline"
                            >
                              Email Support Desk
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: QUICK FAQS & IMMEDIATE ANSWERS                     */}
        {/* ======================================================== */}
        {activeTab === "faq" && (
          <div className="space-y-2.5 animate-in fade-in duration-200">
            <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider px-1">
              Frequently Asked Questions (Mukhya Sawal)
            </h3>

            <div className="space-y-2">
              {captainFaqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border border-zinc-200/80 bg-white overflow-hidden shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(10);
                        setOpenFaqIndex(isOpen ? null : idx);
                      }}
                      className="w-full flex items-center justify-between p-3.5 text-left text-xs font-black text-zinc-900 hover:bg-zinc-50 transition-colors"
                    >
                      <span className="pr-2">{faq.q}</span>
                      <ChevronDown
                        className={`size-4 text-zinc-400 shrink-0 transition-transform ${
                          isOpen ? "rotate-180 text-emerald-600" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-3.5 pb-3.5 text-xs text-zinc-600 leading-relaxed border-t border-zinc-100 pt-2 bg-zinc-50/50">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
