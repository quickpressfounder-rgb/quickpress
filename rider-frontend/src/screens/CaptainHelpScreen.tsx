import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Flame,
  Gift,
  Headphones,
  Image as ImageIcon,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessageSquare,
  PackageCheck,
  Paperclip,
  Phone,
  PhoneCall,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  CAPTAIN_EMERGENCY_SOS,
  CAPTAIN_HELPLINE_PHONE,
  CAPTAIN_SUPPORT_EMAIL,
  createCaptainSupportTicket,
  fetchCaptainSupport,
  fetchCaptainSupportTickets,
  replyCaptainSupportTicket,
  uploadSupportPhoto,
  type CaptainSupportResponse,
  type CreateTicketPayload,
  type SupportTicket,
  type SupportTicketMessage,
} from "../api/rider/rider-support-api";
import { fetchRiderHistory } from "../api/rider/rider-orders-api";
import { playSuccessChime, triggerHaptic } from "../lib/captain-audio";
import { RiderBottomNav } from "../components/RiderBottomNav";

interface CaptainHelpScreenProps {
  onBack?: () => void;
  onOpenGuidelines?: () => void;
  initialCategory?: string;
  initialOrderId?: string;
}

interface ChatMessage {
  id: string;
  sender: "captain" | "support";
  text: string;
  time: string;
  quickAction?: { label: string; actionType: "prefill_ticket" | "call_helpline" | "open_faq"; category?: string; payloadText?: string };
}

type HelpSubTab = "chat" | "ticket" | "my-tickets" | "faq";

export const CaptainHelpScreen: React.FC<CaptainHelpScreenProps> = ({
  onBack,
  onOpenGuidelines,
  initialCategory,
  initialOrderId,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<HelpSubTab>("chat");

  // Support Contacts State
  const [supportData, setSupportData] = useState<CaptainSupportResponse>({
    ok: true,
    helplinePhone: CAPTAIN_HELPLINE_PHONE,
    supportEmail: CAPTAIN_SUPPORT_EMAIL,
    whatsappUrl: "https://wa.me/917906998218?text=Hello%20QuickPress%20Support,%20I%20am%20a%20Captain%20and%20need%20help",
    emergencySosNumber: CAPTAIN_EMERGENCY_SOS,
    workingHours: "24 Hours · 7 Days a Week (24/7)",
    hubAddress: "QuickPress Express Hub, Kasganj, Uttar Pradesh 207123",
  });

  // Recent Orders State for Order Picker
  const [recentOrders, setRecentOrders] = useState<Array<{ orderId: string; displayId: string; label: string }>>([]);

  // ==========================================
  // TAB 1: LIVE CHAT STATE & ENGINE
  // ==========================================
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem("qp_captain_chat_history");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "msg-welcome",
        sender: "support",
        text: "Namaste Captain! 🙏 QuickPress 24/7 Live Fleet Support me aapka swagat hai. Kisi bhi order, store delay, payout ya safety issue ke liye neeche diye quick button tap karein ya message type karein.",
        time: "Just now",
      },
    ];
  });
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // ==========================================
  // TAB 2: RAISE TICKET STATE & ENGINE
  // ==========================================
  const [ticketCategory, setTicketCategory] = useState(initialCategory || "trip");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketOrderId, setTicketOrderId] = useState(initialOrderId || "");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketPriority, setTicketPriority] = useState<"normal" | "urgent" | "emergency">("urgent");
  const [ticketImageName, setTicketImageName] = useState<string | null>(null);
  const [ticketImagePreview, setTicketImagePreview] = useState<string | null>(null);
  const [ticketImageUrl, setTicketImageUrl] = useState<string | null>(null);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const ticketFileInputRef = useRef<HTMLInputElement | null>(null);

  // ==========================================
  // TAB 3: MY TICKETS STATE & ENGINE
  // ==========================================
  const [ticketsList, setTicketsList] = useState<SupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem("qp_captain_tickets");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [ticketFilter, setTicketFilter] = useState<"all" | "open" | "resolved">("all");
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [sendingReply, setSendingReply] = useState(false);

  // ==========================================
  // TAB 4: FAQS STATE & ENGINE
  // ==========================================
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [faqSearchQuery, setFaqSearchQuery] = useState("");
  const [faqCategoryFilter, setFaqCategoryFilter] = useState<string>("all");

  // Load Contact config, Tickets & Recent Orders on mount
  const loadInitialData = useCallback(async () => {
    fetchCaptainSupport()
      .then((res) => {
        if (res) setSupportData(res);
      })
      .catch(() => {});

    setLoadingTickets(true);
    fetchCaptainSupportTickets()
      .then((res) => {
        if (res && Array.isArray(res.items)) {
          setTicketsList(res.items);
          try {
            localStorage.setItem("qp_captain_tickets", JSON.stringify(res.items));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoadingTickets(false));

    fetchRiderHistory()
      .then((history) => {
        if (Array.isArray(history)) {
          const mapped = history.slice(0, 8).map((h: any) => ({
            orderId: h.id || h.orderId || "",
            displayId: h.displayId || h.orderNumber || (h.id ? h.id.slice(0, 8).toUpperCase() : "ORD"),
            label: `${h.displayId || "ORD"} - ₹${Number(h.captainEarnings || h.total || 0).toFixed(0)} (${h.status || "Completed"})`,
          }));
          setRecentOrders(mapped);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Save chat history
  useEffect(() => {
    try {
      localStorage.setItem("qp_captain_chat_history", JSON.stringify(chatMessages));
    } catch {}
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Handle Send Chat Message with Intelligent Fleet AI Assistant
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

    setTimeout(() => {
      setIsTyping(false);
      triggerHaptic(30);

      let replyText =
        "Aapki enquiry Dispatch Desk ko forward kar di gayi hai. Turant solution ke liye neeche diye button se official ticket raise karein.";
      let quickAction: ChatMessage["quickAction"] = {
        label: "Raise Support Ticket",
        actionType: "prefill_ticket",
        category: "trip",
        payloadText: content,
      };

      const lower = content.toLowerCase();
      if (
        lower.includes("customer") &&
        (lower.includes("phone") ||
          lower.includes("call") ||
          lower.includes("reach") ||
          lower.includes("pick") ||
          lower.includes("door"))
      ) {
        replyText =
          "Customer ko app se 2-3 baar call karein. Agar 10 minute tak contact na ho, toh bina kisi penalty ke Customer Unreachable ticket raise karein. Rating safe rahegi.";
        quickAction = {
          label: "Report Unreachable Customer Ticket",
          actionType: "prefill_ticket",
          category: "customer-issue",
          payloadText: "Customer doorstep par phone nahi utha rahe hain. 10 minute se wait kar raha hoon.",
        };
      } else if (
        lower.includes("store") ||
        lower.includes("closed") ||
        lower.includes("delay") ||
        lower.includes("dukan") ||
        lower.includes("partner")
      ) {
        replyText =
          "Partner store par kapde ready na hone ya dukan band hone par store manager ka response note karein. Instant dispatch approval ke liye ticket raise karein.";
        quickAction = {
          label: "Report Store Delay / Issue",
          actionType: "prefill_ticket",
          category: "store-partner",
          payloadText: "Store partner par delay hai ya dukan band hai.",
        };
      } else if (
        lower.includes("payout") ||
        lower.includes("rupaye") ||
        lower.includes("wallet") ||
        lower.includes("bank") ||
        lower.includes("payment") ||
        lower.includes("commission")
      ) {
        replyText =
          "QuickPress 0% Commission policy par chalta hai. 100% trip earnings direct wallet me credit hoti hain aur rozana bank transfer hoti hain.";
        quickAction = {
          label: "Raise Payout & Wallet Ticket",
          actionType: "prefill_ticket",
          category: "payment",
          payloadText: "Meri trip earning ya daily bank transfer ka status check karna hai.",
        };
      } else if (
        lower.includes("cancel") ||
        lower.includes("penalty") ||
        lower.includes("cancellation") ||
        lower.includes("emergency")
      ) {
        replyText =
          "Genuine vehicle breakdown ya medical emergency par cancellation penalty ZERO hai. Turant emergency priority ke sath ticket lodge karein.";
        quickAction = {
          label: "Emergency Trip Cancellation",
          actionType: "prefill_ticket",
          category: "trip",
          payloadText: "Emergency cancellation request due to urgent issue.",
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
    }, 600);
  };

  // Quick Problem Chips for 1-Tap Resolution
  const quickProblems = [
    { label: "📞 Customer not answering", query: "Customer phone nahi utha raha hai, kya karu?" },
    { label: "🏪 Store partner delay", query: "Partner store par kapde ready nahi hain aur delay ho raha hai." },
    { label: "💰 Payout / Bank query", query: "Meri trip earning aur bank settlement ka update chahiye." },
    { label: "📍 Wrong delivery location", query: "Customer ka delivery location map me galat dikh raha hai." },
    { label: "🚨 Urgent cancellation", query: "Emergency hai, trip cancel karne me help chahiye bina penalty." },
    { label: "📦 Damaged / Wrong item", query: "Garment count me farak hai ya packet damaged hai." },
  ];

  // Handle Photo Attachment in Ticket
  const handleTicketPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo size must be less than 5MB");
      return;
    }

    setTicketImageName(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setTicketImagePreview(base64);

      // Upload to backend
      try {
        const uploadRes = await uploadSupportPhoto(base64);
        if (uploadRes?.url) {
          setTicketImageUrl(uploadRes.url);
          toast.success("Photo attached successfully ✓");
        }
      } catch {
        // Fallback to client base64
        setTicketImageUrl(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Ticket Submit
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim()) {
      toast.error("Please enter a short subject");
      return;
    }
    if (!ticketDescription.trim()) {
      toast.error("Please enter detailed issue description");
      return;
    }

    setSubmittingTicket(true);
    triggerHaptic(30);

    const payload: CreateTicketPayload = {
      category: ticketCategory,
      subject: ticketSubject.trim(),
      description: ticketDescription.trim(),
      priority: ticketPriority,
      orderId: ticketOrderId || null,
      attachmentName: ticketImageName || null,
    };

    try {
      const created = await createCaptainSupportTicket(payload);
      playSuccessChime();
      triggerHaptic(50);
      toast.success(`Ticket #${created.ticketNumber || "NEW"} Created Successfully! 🎉`);

      // Add to local state & storage
      setTicketsList((prev) => [created, ...prev]);
      try {
        localStorage.setItem("qp_captain_tickets", JSON.stringify([created, ...ticketsList]));
      } catch {}

      // Reset form
      setTicketSubject("");
      setTicketDescription("");
      setTicketOrderId("");
      setTicketImageName(null);
      setTicketImagePreview(null);
      setTicketImageUrl(null);

      // Switch to My Tickets to track
      setActiveTab("my-tickets");
      setExpandedTicketId(created.id);
    } catch (err: any) {
      // Local fallback in case backend is offline
      const fallbackTicket: SupportTicket = {
        id: `tkt-${Date.now()}`,
        ticketNumber: `TKT-${Math.floor(10000 + Math.random() * 90000)}`,
        category: ticketCategory,
        categoryLabel: ticketCategory.toUpperCase(),
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
        priority: ticketPriority,
        status: "open",
        orderId: ticketOrderId || null,
        attachmentName: ticketImageName || null,
        attachmentUrl: ticketImageUrl || null,
        createdAt: new Date().toISOString(),
        messages: [
          {
            id: `msg-${Date.now()}`,
            ticketId: `tkt-${Date.now()}`,
            author: "rider",
            authorName: "Captain",
            body: ticketDescription.trim(),
            createdAt: new Date().toISOString(),
          },
        ],
      };

      setTicketsList((prev) => [fallbackTicket, ...prev]);
      try {
        localStorage.setItem("qp_captain_tickets", JSON.stringify([fallbackTicket, ...ticketsList]));
      } catch {}

      playSuccessChime();
      toast.success(`Ticket #${fallbackTicket.ticketNumber} Logged (Offline Mode)`);
      setActiveTab("my-tickets");
      setExpandedTicketId(fallbackTicket.id);
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Handle Two-Way Reply to Existing Ticket
  const handleSendTicketReply = async (ticketId: string) => {
    const text = (replyTextMap[ticketId] || "").trim();
    if (!text) return;

    setSendingReply(true);
    triggerHaptic(25);

    try {
      const updated = await replyCaptainSupportTicket(ticketId, { body: text });
      toast.success("Reply sent to Fleet Support ✓");

      setTicketsList((prev) =>
        prev.map((t) => (t.id === ticketId ? updated : t))
      );
      setReplyTextMap((prev) => ({ ...prev, [ticketId]: "" }));
    } catch {
      // Local append fallback
      const newMsg: SupportTicketMessage = {
        id: `msg-${Date.now()}`,
        ticketId,
        author: "rider",
        authorName: "Captain",
        body: text,
        createdAt: new Date().toISOString(),
      };

      setTicketsList((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? { ...t, status: "open", messages: [...(t.messages || []), newMsg] }
            : t
        )
      );
      setReplyTextMap((prev) => ({ ...prev, [ticketId]: "" }));
      toast.success("Reply logged ✓");
    } finally {
      setSendingReply(false);
    }
  };

  // FAQs Catalogue
  const captainFaqs = [
    {
      category: "orders",
      q: "Customer call nahi utha raha hai toh mujhe kya karna chahiye?",
      a: "App se customer ko 2 se 3 baar call karein. Agar 10 minute tak koi contact nahi hota hai, toh app me 'Customer Unreachable' mark karein aur Live Chat ya Ticket se Dispatch team ko inform karein. Return order par puri fee milegi aur rating safe rahegi.",
    },
    {
      category: "payout",
      q: "Zero Commission policy kaise kaam karti hai?",
      a: "QuickPress Captain network 100% 0% Commission par operate karta hai. Delivery fare ka 100% hissa aur customer dwara diya gaya har tip bina kisi deduction ke aapke wallet me jata hai.",
    },
    {
      category: "store",
      q: "Store par kapde drop karne ke baad mujhe 75% payout kab milta hai?",
      a: "Jab aap customer se pickup karke store par kapde safely handover karte hain, tab aap 'Leave Trip at Store' chun sakte hain. 75% net pickup payout turant wallet me add ho jata hai.",
    },
    {
      category: "payout",
      q: "Bank Account settlement kab hota hai?",
      a: "Wallet balance har din automatic aapke verified bank account me transfer kiya jata hai. Minimum balance limit zero hai aur transfer instant hota hai.",
    },
    {
      category: "orders",
      q: "Customer Pickup OTP aur Delivery OTP ka kya role hai?",
      a: "Pickup par customer se 6-digit Pickup OTP lein jo verify karta hai ki kapde collect ho gaye hain. Doorstep delivery par customer se Delivery OTP lene par order complete hota hai aur instant payout unlock hota hai.",
    },
    {
      category: "safety",
      q: "Emergency SOS aur Roadside Help kaise milegi?",
      a: "Kisi bhi durghatna ya accident ki sthiti me top SOS button dabakar seedhe 112 National Emergency ko call karein. Sath hi Dispatch desk ko alert bhejkar ambulance ya towing assistance mangwayein.",
    },
    {
      category: "store",
      q: "Agar Partner Store kapde handover karne se mana kare toh kya karein?",
      a: "Dukan par wait karein aur turant 'Store Partner' category me Ticket raise karein. Dispatch Executive store manager se phone par baat karke 5 minute me order release karwayenge.",
    },
  ];

  const filteredFaqs = captainFaqs.filter((faq) => {
    const matchesCat = faqCategoryFilter === "all" || faq.category === faqCategoryFilter;
    const matchesQuery =
      !faqSearchQuery ||
      faq.q.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(faqSearchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const filteredTickets = ticketsList.filter((t) => {
    if (ticketFilter === "open") return t.status === "open" || t.status === "in-progress" || t.status === "awaiting-customer";
    if (ticketFilter === "resolved") return t.status === "resolved" || t.status === "closed";
    return true;
  });

  return (
    <div className="relative flex flex-col w-full h-[100dvh] max-w-md mx-auto bg-[#F4F5F7] shadow-xl overflow-hidden text-zinc-800 select-none font-sans">
      {/* 1. Header Bar matching Rapido / QuickPress Wallet Screen */}
      <header
        className="sticky top-0 z-30 bg-white border-b border-zinc-200/70 shadow-2xs shrink-0 select-none"
        style={{ paddingTop: "max(calc(env(safe-area-inset-top, 0px) + 12px), 48px)" }}
      >
        <div className="flex items-center justify-between px-4 pb-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                if (onBack) onBack();
                else if (window.history.length > 1) window.history.back();
                else navigate({ to: "/dashboard" });
              }}
              className="p-1.5 -ml-1 text-zinc-900 hover:bg-zinc-100 rounded-full active:scale-95 transition-all cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="size-6 text-zinc-950 stroke-[2.2]" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-zinc-950 flex items-center gap-1.5">
                  <span>Help & Support</span>
                  <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200">
                  24/7 Live
                </span>
              </div>
              <p className="text-[11px] font-semibold text-zinc-500">
                Captain Dispatch Helpdesk · Instant SLA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenGuidelines && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  onOpenGuidelines();
                }}
                className="p-2 text-zinc-700 hover:bg-zinc-100 rounded-xl active:scale-95 transition-all"
                title="Captain Guidelines"
              >
                <FileText className="size-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                triggerHaptic(20);
                loadInitialData();
                toast.success("Support desk synced ✓");
              }}
              disabled={loadingTickets}
              className="p-2 text-black hover:bg-zinc-100 rounded-xl active:scale-95 transition-all"
              title="Refresh Tickets"
            >
              <RefreshCw className={`size-4 text-black ${loadingTickets ? "animate-spin text-emerald-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* 4 Integrated Sub-Tabs with Solid Yellow Underline */}
        <div className="grid grid-cols-4 text-center text-xs font-bold border-t border-zinc-100">
          {[
            { id: "chat", label: "Live Chat" },
            { id: "ticket", label: "Raise Ticket" },
            { id: "my-tickets", label: "My Tickets", badge: ticketsList.filter((t) => t.status === "open").length },
            { id: "faq", label: "FAQs & SOP" },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setActiveTab(tab.id as HelpSubTab);
                }}
                className={`py-3 relative cursor-pointer transition-colors ${
                  active ? "text-zinc-950 font-black" : "text-zinc-500 hover:text-zinc-800 font-bold"
                }`}
              >
                <span className="flex items-center justify-center gap-1">
                  <span>{tab.label}</span>
                  {Boolean(tab.badge && tab.badge > 0) && (
                    <span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
                  )}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-1 bg-[#FFC700] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. Scrollable Body Content */}
      <div
        className="flex-1 overflow-y-auto space-y-4 p-4 bg-[#F8F9FA]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px) + 84px, 100px)" }}
      >
        {/* INSTANT DIRECT CONTACT CARDS (SOS, HELPLINE, WHATSAPP, EMAIL) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Emergency SOS 112 */}
          <a
            href={`tel:${supportData.emergencySosNumber}`}
            onClick={() => triggerHaptic(40)}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-rose-200/90 shadow-2xs hover:bg-rose-50/50 active:scale-98 transition-all"
          >
            <div className="size-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block">Emergency SOS</span>
              <p className="text-xs font-black text-zinc-950">Dial 112</p>
              <span className="text-[10px] text-zinc-500 font-semibold block mt-0.5">Police & Medical</span>
            </div>
          </a>

          {/* Toll-Free Hotline */}
          <a
            href={`tel:${supportData.helplinePhone.replace(/\s+/g, "")}`}
            onClick={() => triggerHaptic(20)}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-white border border-emerald-200/90 shadow-2xs hover:bg-emerald-50/50 active:scale-98 transition-all"
          >
            <div className="size-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <PhoneCall className="size-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block">Helpline 24/7</span>
              <p className="text-xs font-black text-zinc-950 truncate">Toll-Free Call</p>
              <span className="text-[10px] text-zinc-500 font-semibold block mt-0.5">Free Support</span>
            </div>
          </a>
        </div>

        {/* Lilac / Pastel Explainer Banner matching Wallet Screen */}
        <div
          onClick={() => {
            triggerHaptic(20);
            window.open("https://youtube.com/@QuickPressApp", "_blank");
          }}
          className="p-4 rounded-2xl bg-gradient-to-r from-[#EDE9FE] to-[#F5F3FF] border border-[#DDD6FE] text-zinc-900 shadow-2xs flex items-center justify-between cursor-pointer active:scale-98 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-11 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <PlayCircle className="size-6 fill-white text-red-600" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-black text-zinc-950 leading-snug">
                How Captain Support & SOP Works
              </h4>
              <p className="text-[11px] text-zinc-600 mt-0.5 leading-snug">
                Watch 1-min guide on store issues, zero-penalty cancellations & fast payouts
              </p>
            </div>
          </div>
          <ChevronRight className="size-4 text-zinc-500 shrink-0 ml-2" />
        </div>

        {/* ========================================================
            TAB 1: LIVE CHAT ENGINE
        ======================================================== */}
        {activeTab === "chat" && (
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden flex flex-col h-[520px]">
            {/* Chat Header */}
            <div className="p-3.5 bg-zinc-50/70 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Bot className="size-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-zinc-950">Fleet AI & Dispatch Assistant</h3>
                  <p className="text-[10px] text-emerald-700 font-bold">Online · Instant Answers</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(15);
                  setChatMessages([
                    {
                      id: "msg-welcome-new",
                      sender: "support",
                      text: "Chat cleared. Aap naya sawaal puchh sakte hain!",
                      time: "Just now",
                    },
                  ]);
                  toast.info("Chat history cleared");
                }}
                className="text-[10px] font-bold text-zinc-500 hover:text-rose-600 px-2 py-1 rounded-lg hover:bg-zinc-100"
              >
                Clear Chat
              </button>
            </div>

            {/* Quick Action Problem Chips */}
            <div className="p-2.5 bg-zinc-50/40 border-b border-zinc-100 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
              {quickProblems.map((prob, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prob.query)}
                  className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-zinc-100 border border-zinc-200/80 rounded-full text-zinc-800 shrink-0 shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  {prob.label}
                </button>
              ))}
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8F9FA]/40">
              {chatMessages.map((msg) => {
                const isCaptain = msg.sender === "captain";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isCaptain ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-2xs ${
                        isCaptain
                          ? "bg-zinc-950 text-white rounded-tr-xs"
                          : "bg-white text-zinc-900 border border-zinc-200/90 rounded-tl-xs"
                      }`}
                    >
                      <p className="break-words">{msg.text}</p>

                      {/* Bot Quick Action Handler */}
                      {msg.quickAction && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-100">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic(20);
                              if (msg.quickAction?.actionType === "prefill_ticket") {
                                setTicketCategory(msg.quickAction.category || "trip");
                                setTicketSubject(msg.quickAction.label);
                                setTicketDescription(msg.quickAction.payloadText || "");
                                setActiveTab("ticket");
                              }
                            }}
                            className="w-full py-1.5 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-black text-[11px] flex items-center justify-between cursor-pointer active:scale-98 transition-all"
                          >
                            <span>{msg.quickAction.label}</span>
                            <ChevronRight className="size-3 text-amber-700" />
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-zinc-400 font-bold mt-1 px-1">{msg.time}</span>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-center gap-1.5 bg-white border border-zinc-200/90 px-3 py-2 rounded-2xl rounded-tl-xs w-20 shadow-2xs">
                  <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce" />
                  <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="size-1.5 rounded-full bg-zinc-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-white border-t border-zinc-100 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your question or issue..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-zinc-400 font-medium"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="size-10 rounded-xl bg-[#FFC700] hover:bg-amber-400 disabled:opacity-40 text-zinc-950 flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer shadow-xs shrink-0"
              >
                <Send className="size-4" />
              </button>
            </form>
          </div>
        )}

        {/* ========================================================
            TAB 2: RAISE TICKET ENGINE
        ======================================================== */}
        {activeTab === "ticket" && (
          <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
            <div className="p-4 bg-zinc-50/70 border-b border-zinc-100">
              <h3 className="text-sm font-black text-zinc-950 flex items-center gap-1.5">
                <FileText className="size-4 text-amber-500" />
                <span>Raise Official Support Ticket</span>
              </h3>
              <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                Direct dispatch escalation with priority resolution SLA
              </p>
            </div>

            <form onSubmit={handleSubmitTicket} className="divide-y divide-zinc-100 text-xs">
              {/* Category Picker */}
              <div className="p-4 space-y-2">
                <label className="font-bold text-zinc-700 block">Select Issue Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "trip", label: "Live Order Issue", icon: PackageCheck },
                    { id: "store-partner", label: "Store Partner Delay", icon: Clock },
                    { id: "payment", label: "Payout / Wallet", icon: Wallet },
                    { id: "customer-issue", label: "Customer Unreachable", icon: Phone },
                    { id: "vehicle-kyc", label: "Vehicle / Documents", icon: ShieldCheck },
                    { id: "app-glitch", label: "App Glitch / GPS", icon: Zap },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    const selected = ticketCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic(15);
                          setTicketCategory(cat.id);
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          selected
                            ? "bg-amber-50/70 border-amber-300 text-zinc-950 font-black shadow-2xs"
                            : "bg-white border-zinc-200/80 text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        <Icon className={`size-3.5 shrink-0 ${selected ? "text-amber-600" : "text-zinc-400"}`} />
                        <span className="text-[11px] truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Priority Selector */}
              <div className="p-4 space-y-2">
                <label className="font-bold text-zinc-700 block">Priority Level</label>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { id: "normal", label: "Normal (24h)", badge: "Routine" },
                    { id: "urgent", label: "Urgent (1-2h)", badge: "Active Order" },
                    { id: "emergency", label: "Emergency", badge: "Immediate" },
                  ].map((pri) => {
                    const isSelected = ticketPriority === pri.id;
                    return (
                      <button
                        key={pri.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic(15);
                          setTicketPriority(pri.id as any);
                        }}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? pri.id === "emergency"
                              ? "bg-rose-50 border-rose-300 text-rose-900 font-black"
                              : "bg-[#FFC700]/15 border-amber-300 text-zinc-950 font-black shadow-2xs"
                            : "bg-white border-zinc-200/80 text-zinc-600 hover:bg-zinc-50"
                        }`}
                      >
                        <p className="text-[11px]">{pri.label}</p>
                        <span className="text-[9px] text-zinc-400 font-semibold">{pri.badge}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Order Picker */}
              <div className="p-4 space-y-1.5">
                <label className="font-bold text-zinc-700 block">Related Order (Optional)</label>
                <select
                  value={ticketOrderId}
                  onChange={(e) => setTicketOrderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-900 font-semibold focus:outline-none focus:bg-white"
                >
                  <option value="">General Issue (Not Order Specific)</option>
                  {recentOrders.map((ord) => (
                    <option key={ord.orderId} value={ord.displayId}>
                      {ord.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject Input */}
              <div className="p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-zinc-700">Subject</label>
                  <span className="text-[10px] text-zinc-400">{ticketSubject.length}/120</span>
                </div>
                <input
                  type="text"
                  maxLength={120}
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="e.g. Store manager not ready with clothes"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white font-medium"
                />
              </div>

              {/* Description Input */}
              <div className="p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-zinc-700">Detailed Description</label>
                  <span className="text-[10px] text-zinc-400">{ticketDescription.length}/2000</span>
                </div>
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="Explain exactly what happened, location, time, customer/store response..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white font-medium leading-relaxed resize-none"
                />
              </div>

              {/* Photo Proof Upload */}
              <div className="p-4 space-y-2">
                <label className="font-bold text-zinc-700 block">Attach Photo Proof (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  ref={ticketFileInputRef}
                  onChange={handleTicketPhotoUpload}
                  className="hidden"
                />

                {ticketImagePreview ? (
                  <div className="relative rounded-2xl border border-zinc-200 overflow-hidden bg-zinc-50 p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={ticketImagePreview}
                        alt="Preview"
                        className="size-12 rounded-xl object-cover border border-zinc-200"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-zinc-950 truncate max-w-[180px]">
                          {ticketImageName}
                        </p>
                        <span className="text-[9px] text-emerald-700 font-bold">Ready to upload ✓</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTicketImagePreview(null);
                        setTicketImageName(null);
                        setTicketImageUrl(null);
                      }}
                      className="p-1.5 text-zinc-500 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => ticketFileInputRef.current?.click()}
                    className="w-full py-3 px-4 border border-dashed border-zinc-300 hover:border-zinc-400 rounded-2xl bg-zinc-50/70 hover:bg-zinc-100 flex items-center justify-center gap-2 text-zinc-600 cursor-pointer active:scale-98 transition-all"
                  >
                    <Camera className="size-4 text-zinc-500" />
                    <span className="text-xs font-bold">Take Photo or Upload Image</span>
                  </button>
                )}
              </div>

              {/* Submit CTA */}
              <div className="p-4 bg-zinc-50/50">
                <button
                  type="submit"
                  disabled={submittingTicket || !ticketSubject.trim() || !ticketDescription.trim()}
                  className="w-full py-3.5 rounded-2xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white font-black text-xs active:scale-98 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
                >
                  {submittingTicket ? (
                    <RefreshCw className="size-4 animate-spin text-amber-400" />
                  ) : (
                    <Send className="size-4 text-amber-400" />
                  )}
                  <span>{submittingTicket ? "Submitting Ticket..." : "Submit Support Ticket"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================
            TAB 3: MY TICKETS ENGINE & 2-WAY CONVERSATION
        ======================================================== */}
        {activeTab === "my-tickets" && (
          <div className="space-y-3">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-zinc-200/90 shadow-2xs">
              {[
                { id: "all", label: "All Tickets" },
                { id: "open", label: "Active / Open" },
                { id: "resolved", label: "Resolved" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(15);
                    setTicketFilter(f.id as any);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    ticketFilter === f.id
                      ? "bg-zinc-950 text-white shadow-2xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Ticket Cards */}
            {filteredTickets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs p-10 flex flex-col items-center justify-center text-center space-y-3">
                <div className="size-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center">
                  <FileText className="size-7 stroke-[1.8]" />
                </div>
                <div>
                  <p className="text-sm font-black text-zinc-900">No Tickets Found</p>
                  <p className="text-xs text-zinc-500 max-w-xs mt-1">
                    Aapne koi support ticket raise nahi kiya hai. Samasya aane par Raise Ticket tab se report karein.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic(15);
                    setActiveTab("ticket");
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-950 text-white font-black text-xs active:scale-95 transition-all shadow-xs"
                >
                  Raise Ticket Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTickets.map((tkt) => {
                  const isExpanded = expandedTicketId === tkt.id;
                  const isResolved = tkt.status === "resolved" || tkt.status === "closed";
                  const replyText = replyTextMap[tkt.id] || "";

                  return (
                    <div
                      key={tkt.id}
                      className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden transition-all"
                    >
                      {/* Ticket Row Header */}
                      <div
                        onClick={() => {
                          triggerHaptic(15);
                          setExpandedTicketId(isExpanded ? null : tkt.id);
                        }}
                        className="p-4 cursor-pointer hover:bg-zinc-50 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-zinc-950">
                              {tkt.ticketNumber}
                            </span>
                            {tkt.orderId && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700">
                                {tkt.orderId}
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isResolved
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : tkt.priority === "emergency"
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {tkt.status}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-zinc-950 leading-snug">
                          {tkt.subject}
                        </h4>

                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-bold pt-1 border-t border-zinc-100">
                          <span>{tkt.categoryLabel || tkt.category}</span>
                          <div className="flex items-center gap-1 text-zinc-500">
                            <span>{new Date(tkt.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                            <ChevronDown className={`size-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                      </div>

                      {/* Expandable Conversation Timeline & Reply Box */}
                      {isExpanded && (
                        <div className="border-t border-zinc-100 bg-zinc-50/50 p-4 space-y-3.5 animate-in fade-in duration-200 text-xs">
                          {/* Original Description */}
                          <div className="p-3 rounded-xl bg-white border border-zinc-200/80 space-y-1">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block">
                              Issue Statement
                            </span>
                            <p className="text-zinc-800 leading-relaxed font-medium break-words">
                              {tkt.description}
                            </p>
                            {tkt.attachmentUrl && (
                              <div className="pt-2">
                                <img
                                  src={tkt.attachmentUrl}
                                  alt="Attachment"
                                  className="size-20 rounded-xl object-cover border border-zinc-200"
                                />
                              </div>
                            )}
                          </div>

                          {/* Messages Timeline */}
                          {tkt.messages && tkt.messages.length > 0 && (
                            <div className="space-y-2 pt-1">
                              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider block px-1">
                                Conversation Thread
                              </span>
                              {tkt.messages.map((m) => {
                                const isCaptainMsg = m.author === "rider" || m.author === "customer";
                                return (
                                  <div
                                    key={m.id}
                                    className={`p-3 rounded-xl text-xs leading-relaxed ${
                                      isCaptainMsg
                                        ? "bg-zinc-950 text-white ml-6 rounded-tr-xs"
                                        : "bg-white text-zinc-900 border border-zinc-200 mr-6 rounded-tl-xs"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1 text-[9px] opacity-75 font-bold">
                                      <span>{m.authorName || (isCaptainMsg ? "Captain" : "Fleet Support")}</span>
                                      <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                    </div>
                                    <p className="break-words">{m.body}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Two-Way Reply Form */}
                          {!isResolved && (
                            <div className="pt-2 flex items-center gap-2">
                              <input
                                type="text"
                                value={replyText}
                                onChange={(e) =>
                                  setReplyTextMap((prev) => ({ ...prev, [tkt.id]: e.target.value }))
                                }
                                placeholder="Type a response to support..."
                                className="flex-1 px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 font-medium"
                              />
                              <button
                                type="button"
                                disabled={sendingReply || !replyText.trim()}
                                onClick={() => handleSendTicketReply(tkt.id)}
                                className="px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 disabled:opacity-40 text-white font-black text-xs active:scale-95 transition-all cursor-pointer shadow-xs"
                              >
                                Reply
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: FAQS & SOP KNOWLEDGE BASE
        ======================================================== */}
        {activeTab === "faq" && (
          <div className="space-y-3">
            {/* Live Search Input */}
            <div className="relative">
              <Search className="size-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={faqSearchQuery}
                onChange={(e) => setFaqSearchQuery(e.target.value)}
                placeholder="Search captain FAQs, policies, OTP rules..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-white border border-zinc-200/90 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-400 font-medium shadow-2xs"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: "all", label: "All Topics" },
                { id: "orders", label: "Orders & OTP" },
                { id: "payout", label: "Earnings & Payout" },
                { id: "store", label: "Store Rules" },
                { id: "safety", label: "Safety & SOS" },
              ].map((fc) => (
                <button
                  key={fc.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(15);
                    setFaqCategoryFilter(fc.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                    faqCategoryFilter === fc.id
                      ? "bg-zinc-950 text-white shadow-2xs"
                      : "bg-white border border-zinc-200/80 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {fc.label}
                </button>
              ))}
            </div>

            {/* Accordion List */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs divide-y divide-zinc-100 overflow-hidden">
              {filteredFaqs.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 text-xs font-bold">
                  No matching answers found for "{faqSearchQuery}"
                </div>
              ) : (
                filteredFaqs.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} className="transition-colors">
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic(15);
                          setOpenFaqIndex(isOpen ? null : idx);
                        }}
                        className="w-full p-4 flex items-center justify-between text-left gap-3 hover:bg-zinc-50 cursor-pointer"
                      >
                        <h4 className="text-xs font-black text-zinc-900 leading-snug">
                          {item.q}
                        </h4>
                        <ChevronDown
                          className={`size-4 text-zinc-400 shrink-0 transition-transform ${
                            isOpen ? "rotate-180 text-zinc-950" : ""
                          }`}
                        />
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-zinc-600 leading-relaxed font-medium bg-zinc-50/50 border-t border-zinc-100/60 animate-in fade-in duration-150">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Guidelines CTA */}
            {onOpenGuidelines && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(20);
                  onOpenGuidelines();
                }}
                className="w-full p-3.5 rounded-2xl bg-white border border-zinc-200/90 shadow-2xs flex items-center justify-between hover:bg-zinc-50 cursor-pointer active:scale-98 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                    <FileText className="size-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-zinc-950">View Full Captain SOP & Guidelines</p>
                    <p className="text-[10px] text-zinc-500 font-medium">Standard operating rules, incentives & bonuses</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-zinc-400" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Bottom Nav */}
      <RiderBottomNav active="profile" />
    </div>
  );
};
