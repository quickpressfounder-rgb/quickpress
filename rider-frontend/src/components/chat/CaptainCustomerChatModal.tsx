import React, { useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface MessageItem {
  id: string;
  sender: "rider" | "customer";
  text: string;
  time: string;
}

interface CaptainCustomerChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerName?: string;
  customerPhone?: string;
}

export const CaptainCustomerChatModal: React.FC<CaptainCustomerChatModalProps> = ({
  isOpen,
  onClose,
  customerName = "Customer",
  customerPhone = "+91 98••• ••210",
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: "msg-1",
      sender: "rider",
      text: "I'll be there soon. Kindly wait for me",
      time: "7:01 pm",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [showQuickChat, setShowQuickChat] = useState(true);

  if (!isOpen) return null;

  const quickReplies = [
    "Hi, I have arrived",
    "You are unreachable on call",
    "Please come to your pickup location",
  ];

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const newMsg: MessageItem = {
      id: `msg-${Date.now()}`,
      sender: "rider",
      text,
      time: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    toast.success("Message delivered");
  };

  const handleCall = () => {
    toast.info("Connecting via QuickPress Privacy Call Bridge (Customer phone is shielded 🔒)");
    if (customerPhone && !customerPhone.includes("••")) {
      window.open(`tel:${customerPhone.replace(/\s/g, "")}`);
    } else {
      toast.success("Privacy Call: Patching through to customer via virtual bridge 📞");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white text-neutral-900 select-none animate-in fade-in duration-200">
      {/* 1. Top Header (Pure White Background - No Black) */}
      <header className="flex items-center justify-between px-3.5 py-3 bg-white border-b border-neutral-200 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1 -ml-1 text-neutral-800 hover:bg-neutral-100 rounded-full active:scale-95 transition-transform"
            aria-label="Back"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.4]" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-black text-neutral-900 leading-tight line-clamp-1">
                {customerName}
              </h3>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-50 text-[9px] font-bold text-emerald-700 border border-emerald-200 shrink-0">
                <ShieldCheck className="size-2.5 text-emerald-600" />
                <span>Protected</span>
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online
            </span>
          </div>
        </div>

        {/* Call Button in Top Right Header (Yellow Visual) */}
        <button
          type="button"
          onClick={handleCall}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-400 hover:bg-amber-500 text-neutral-950 rounded-xl font-black text-xs shadow-sm active:scale-95 transition-transform border border-amber-300"
        >
          <Phone className="w-3.5 h-3.5 fill-neutral-950 text-neutral-950" />
          <span>Call</span>
        </button>
      </header>

      {/* 2. Chat Messages List */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-neutral-50/60">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === "rider" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl shadow-sm text-sm font-medium ${
                m.sender === "rider"
                  ? "bg-amber-100/90 text-neutral-950 rounded-tr-none border border-amber-300"
                  : "bg-white text-neutral-900 rounded-tl-none border border-neutral-200"
              }`}
            >
              <p className="leading-relaxed font-bold">{m.text}</p>
              <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-neutral-500 font-semibold">
                <span>{m.time}</span>
                {m.sender === "rider" && <span className="text-blue-600 font-bold">✓✓</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Floating Quick Chat Suggestions Card (Pure White with Yellow Accents) */}
      <div className="px-3.5 pb-2 bg-neutral-50/60">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-md overflow-hidden">
          {/* Quick Chat Header Toggle */}
          <button
            type="button"
            onClick={() => setShowQuickChat(!showQuickChat)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 bg-amber-50/50 border-b border-neutral-100 hover:bg-amber-100/60 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">💬</span>
              <span className="text-xs font-black text-neutral-900">Quick chat</span>
            </div>
            {showQuickChat ? (
              <ChevronDown className="w-4 h-4 text-neutral-600" />
            ) : (
              <ChevronUp className="w-4 h-4 text-neutral-600" />
            )}
          </button>

          {/* Quick Chat Replies List */}
          {showQuickChat && (
            <div className="divide-y divide-neutral-100">
              {quickReplies.map((reply, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(reply)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-bold text-neutral-800 hover:bg-amber-50 active:bg-amber-100 transition-colors group"
                >
                  <MessageSquare className="w-4 h-4 text-neutral-400 group-hover:text-amber-600 shrink-0" />
                  <span className="flex-1">{reply}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Input Bar (Pure White) */}
      <div className="p-3 bg-white border-t border-neutral-200 shadow-lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Type a message"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 h-12 px-4 bg-neutral-50 border border-neutral-200 rounded-full text-sm font-medium focus:bg-white focus:border-amber-400 focus:outline-none transition-all placeholder:text-neutral-400"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="flex items-center justify-center w-12 h-12 bg-neutral-100 disabled:opacity-40 enabled:bg-amber-400 text-neutral-950 rounded-full shadow-md active:scale-95 transition-transform shrink-0 border border-neutral-200"
            aria-label="Send"
          >
            <Send className="w-5 h-5 fill-neutral-950 -ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
