import React, { useState, useEffect } from "react";
import { PageType, ModalType } from "@/types";

// Vector outline icons (strictly NO cartoon emojis)
const IconBuilding = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
  </svg>
);

const IconTruck = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const IconScale = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
    <path d="M7 21h10" />
    <path d="M12 3v18" />
    <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
  </svg>
);

const IconReceipt = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M16 8h-8M16 12h-8M12 16h-4" />
  </svg>
);

const IconDownload = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconPlus = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconCheck = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconLogOut = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const IconX = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconAlert = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export function B2BPortalPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [client, setClient] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"orders" | "invoices" | "contract">("orders");
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isUtrModalOpen, setIsUtrModalOpen] = useState<string | null>(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [utrAmount, setUtrAmount] = useState(0);

  // New Bulk Order Form
  const [orderForm, setOrderForm] = useState({
    pickupDate: new Date().toISOString().slice(0, 10),
    pickupSlot: "08:30 AM - 10:30 AM",
    estimatedKg: 150,
    bagCount: 3,
    serviceType: "Commercial Linen Wash & Steam Ironing",
    specialInstructions: "Gate 2 Loading Dock, ask for Housekeeping Supervisor",
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState("");

  // Load client session
  useEffect(() => {
    const raw = localStorage.getItem("qp_b2b_client");
    if (!raw) {
      onNavigate("b2b-login");
      window.location.hash = "#b2b/login";
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setClient(parsed);
      loadClientData(parsed.b2bId || parsed.id);
    } catch {
      onNavigate("b2b-login");
    }
  }, []);

  const loadClientData = async (b2bId: string) => {
    try {
      // 1. Fetch Profile
      const meRes = await fetch(`/api/b2b/client/me?b2b_id=${encodeURIComponent(b2bId)}`);
      if (meRes.ok) {
        const meData = await meRes.json();
        setClient(meData.client);
        localStorage.setItem("qp_b2b_client", JSON.stringify(meData.client));
      }

      // 2. Fetch Orders
      const ordersRes = await fetch(`/api/b2b/client/orders?b2b_id=${encodeURIComponent(b2bId)}`);
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(oData.items || []);
      }

      // 3. Fetch Invoices
      const invRes = await fetch(`/api/b2b/client/invoices?b2b_id=${encodeURIComponent(b2bId)}`);
      if (invRes.ok) {
        const iData = await invRes.json();
        setInvoices(iData.items || []);
      }
    } catch (err) {
      console.warn("Error loading B2B client data:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("qp_b2b_token");
    localStorage.removeItem("qp_b2b_client");
    onNavigate("b2b-login");
    window.location.hash = "#b2b/login";
  };

  const handleCreateBulkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setSubmittingOrder(true);
    setOrderSuccessMsg("");

    try {
      const res = await fetch("/api/b2b/client/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          b2bId: client.b2bId || client.id,
          pickupDate: orderForm.pickupDate,
          pickupSlot: orderForm.pickupSlot,
          estimatedKg: Number(orderForm.estimatedKg),
          bagCount: Number(orderForm.bagCount),
          serviceType: orderForm.serviceType,
          specialInstructions: orderForm.specialInstructions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to schedule bulk dispatch");
      }

      setOrderSuccessMsg(`Order ${data.order?.orderCode} Scheduled! ${data.order?.bagCount} sealed bag QR codes generated.`);
      setIsNewOrderOpen(false);
      loadClientData(client.b2bId || client.id);
    } catch (err: any) {
      alert(err.message || "Failed to schedule order");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUtrModalOpen || !utrNumber.trim()) return;

    try {
      const res = await fetch(`/api/b2b/admin/invoices/${encodeURIComponent(isUtrModalOpen)}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          utrNumber: utrNumber.trim(),
          amount: Number(utrAmount),
          bankName: "Client RTGS / NEFT",
          mode: "RTGS",
        }),
      });

      if (!res.ok) throw new Error("Failed to record UTR");
      alert("UTR submitted for reconciliation. Invoice updated!");
      setIsUtrModalOpen(null);
      setUtrNumber("");
      loadClientData(client.b2bId || client.id);
    } catch (err: any) {
      alert(err.message || "UTR submission failed");
    }
  };

  if (!client) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-mono text-xs">
        Loading Commercial Facility Dashboard...
      </div>
    );
  }

  const contract = client.contract || {};
  const creditLimit = contract.creditLimit || 50000;
  const balance = client.currentBalance || 0;
  const isHoldActive = contract.autoHoldEnabled && balance > creditLimit;
  const utilPercent = Math.min(100, Math.round((balance / creditLimit) * 100));

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pt-20 pb-24 font-sans">
      {/* ── Top Facility Command Ribbon ────────────────────────────────────── */}
      <section className="bg-zinc-950 text-white border-b border-zinc-800 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                  {client.b2bId}
                </span>
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-mono">
                  {client.category || "Commercial Client"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white uppercase">
                {client.businessName}
              </h1>
              <p className="text-xs text-zinc-400">
                Facility Address: {client.address}, {client.city} • Contact: {client.contactName} ({client.phone})
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsNewOrderOpen(true)}
                disabled={isHoldActive}
                className={`py-3 px-5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-lg cursor-pointer ${
                  isHoldActive
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-emerald-500 hover:bg-emerald-400 text-black"
                }`}
              >
                <IconPlus className="w-4 h-4" />
                <span>Schedule Bulk Dispatch</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="py-3 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-mono text-xs border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
                title="Log Out of Facility Portal"
              >
                <IconLogOut className="w-4 h-4" />
                <span>Exit</span>
              </button>
            </div>
          </div>

          {/* Credit Terms & Utilization Bar */}
          <div className="mt-6 pt-5 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 text-[10px] uppercase block">Agreed Base Rate</span>
              <span className="text-white font-bold text-sm">₹{contract.baseRatePerKg || 32}.00 / kg</span>
            </div>
            <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 text-[10px] uppercase block">Payment Credit Terms</span>
              <span className="text-white font-bold text-sm">{contract.creditTerms || "Net 15 Days"}</span>
            </div>
            <div className="sm:col-span-2 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">
                  Credit: ₹{balance.toLocaleString()} / ₹{creditLimit.toLocaleString()}
                </span>
                <span className={isHoldActive ? "text-red-400 font-bold" : "text-emerald-400"}>
                  {isHoldActive ? "CREDIT HOLD ⚠️" : `${utilPercent}% Used`}
                </span>
              </div>
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isHoldActive ? "bg-red-500" : utilPercent > 80 ? "bg-amber-500" : "bg-emerald-400"
                  }`}
                  style={{ width: `${utilPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Order Success Toast */}
      {orderSuccessMsg && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconCheck className="w-5 h-5 text-emerald-700" />
              <span>{orderSuccessMsg}</span>
            </div>
            <button
              onClick={() => setOrderSuccessMsg("")}
              className="text-emerald-600 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Main Container ─────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 font-mono text-xs">
          {[
            { id: "orders", label: `Live Bulk Orders (${orders.length})`, icon: IconTruck },
            { id: "invoices", label: `GST Tax Invoices (${invoices.length})`, icon: IconReceipt },
            { id: "contract", label: "Contract Rate Card", icon: IconScale },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-2 px-4 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeTab === t.id
                    ? "bg-black text-white"
                    : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: Live Bulk Orders Queue ─────────────────────────────────── */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-zinc-200">
                <IconTruck className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold font-mono text-zinc-800 uppercase">
                  No Bulk Dispatches Scheduled
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Click "Schedule Bulk Dispatch" to request daily commercial van pickups with multi-bag QR seals.
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewOrderOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-black text-white font-mono text-xs font-bold"
                >
                  Schedule First Batch
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((ord) => (
                  <div
                    key={ord.orderCode || ord.id}
                    className="bg-white rounded-3xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-base text-black">
                            {ord.orderCode}
                          </span>
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-zinc-100 text-zinc-800">
                            {ord.serviceType || "Commercial Linen"}
                          </span>
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            {ord.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">
                          Pickup Slot: <span className="font-bold text-zinc-800">{ord.pickupDate} ({ord.pickupSlot})</span> • SLA: <span className="text-emerald-700 font-semibold">{ord.sla}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-xs text-zinc-400 block">Est. Weight</span>
                        <span className="font-mono font-black text-lg text-black">{ord.estimatedKg} kg</span>
                      </div>
                    </div>

                    {/* Scale Verification & Bags Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-zinc-50 p-4 rounded-2xl border border-zinc-100 text-xs font-mono">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">Doorstep Scale</span>
                        <span className="font-bold text-black text-sm">
                          {ord.doorstepScaleKg ? `${ord.doorstepScaleKg} kg` : "Weigh-in on Arrival"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">Hub Net Scale</span>
                        <span className="font-bold text-black text-sm">
                          {ord.netKg ? `${ord.netKg} kg (Net)` : "Processing at Hub"}
                        </span>
                        {ord.variancePercent !== undefined && ord.variancePercent > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 block">
                            Variance: {ord.variancePercent}% [Safe]
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                          Sealed Bags ({ord.bagCount || 1} Total)
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(ord.bagBarcodes || []).map((b: string) => (
                            <span key={b} className="text-[9px] bg-white border border-zinc-200 px-1.5 py-0.5 rounded font-bold text-zinc-700">
                              {b.replace(ord.orderCode, "")}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {ord.pod && (
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-mono text-emerald-900 flex items-center justify-between">
                        <span>Handed over to Storekeeper: {ord.pod.storekeeperName}</span>
                        <span className="text-[10px]">{ord.pod.deliveredAt?.slice(0, 16).replace("T", " ")}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 2: Monthly GST Invoices & A/R Ledger ───────────────────────── */}
        {activeTab === "invoices" && (
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-zinc-200">
                <IconReceipt className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold font-mono text-zinc-800 uppercase">
                  No Invoices Generated Yet
                </h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Consolidated monthly GST tax invoices with 18% input credit and official HSN 9987 breakdown will appear here.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-zinc-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-100 text-zinc-600 uppercase text-[10px] border-b border-zinc-200">
                      <tr>
                        <th className="py-3.5 px-4 font-bold">Invoice #</th>
                        <th className="py-3.5 px-4 font-bold">Billing Cycle</th>
                        <th className="py-3.5 px-4 font-bold text-right">Net Wt</th>
                        <th className="py-3.5 px-4 font-bold text-right">Taxable</th>
                        <th className="py-3.5 px-4 font-bold text-right">18% GST</th>
                        <th className="py-3.5 px-4 font-bold text-right">Total (₹)</th>
                        <th className="py-3.5 px-4 font-bold text-center">Status</th>
                        <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {invoices.map((inv) => {
                        const isPaid = inv.status === "PAID";
                        return (
                          <tr key={inv.invoiceNumber || inv.id} className="hover:bg-zinc-50">
                            <td className="py-3.5 px-4 font-bold text-black">{inv.invoiceNumber}</td>
                            <td className="py-3.5 px-4 text-zinc-600">
                              {inv.billingPeriod}
                              <span className="block text-[10px] text-zinc-400">Due: {inv.dueDate?.slice(0, 10)}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right text-zinc-800">{inv.totalKg} kg</td>
                            <td className="py-3.5 px-4 text-right text-zinc-800">₹{inv.subtotal?.toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-right text-zinc-500">₹{inv.taxTotal?.toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-right font-black text-black">
                              ₹{inv.totalAmount?.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {inv.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <a
                                  href={inv.pdfUrl || `/api/b2b/admin/invoices/${inv.invoiceNumber}/pdf`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-black text-white hover:bg-zinc-800 font-bold text-[10px]"
                                >
                                  <IconDownload className="w-3 h-3" />
                                  PDF
                                </a>
                                {!isPaid && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsUtrModalOpen(inv.invoiceNumber);
                                      setUtrAmount(inv.balanceDue || inv.totalAmount);
                                    }}
                                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] cursor-pointer"
                                  >
                                    Submit UTR
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: Contract Rate Card ─────────────────────────────────────── */}
        {activeTab === "contract" && (
          <div className="bg-white rounded-3xl border border-zinc-200 p-6 space-y-6">
            <div className="border-b border-zinc-200 pb-4">
              <h3 className="text-base font-bold font-mono text-black uppercase">
                Agreed Commercial Linen Service Contract
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Lock-in pricing schedule between {client.businessName} and QuickPress Enterprise Operations.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                <span className="text-zinc-500 text-[10px] uppercase block">Base Weight Pricing</span>
                <span className="text-black font-black text-lg">₹{contract.baseRatePerKg || 32}.00 / kg</span>
                <span className="text-zinc-400 text-[10px] block mt-1">Wash, 80°C Sanitization & Steam Iron</span>
              </div>
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                <span className="text-zinc-500 text-[10px] uppercase block">Credit Policy</span>
                <span className="text-black font-black text-lg">{contract.creditTerms || "Net 15 Days"}</span>
                <span className="text-zinc-400 text-[10px] block mt-1">Direct Bank RTGS / NEFT</span>
              </div>
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                <span className="text-zinc-500 text-[10px] uppercase block">Approved Credit Limit</span>
                <span className="text-black font-black text-lg">₹{creditLimit.toLocaleString()}</span>
                <span className="text-zinc-400 text-[10px] block mt-1">Automatic Hold Guard Active</span>
              </div>
              <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                <span className="text-zinc-500 text-[10px] uppercase block">Commercial SLA</span>
                <span className="text-emerald-700 font-black text-lg">{client.sla || "24h Express"}</span>
                <span className="text-zinc-400 text-[10px] block mt-1">Dedicated Van Logistics</span>
              </div>
            </div>

            {/* Itemized Linen Rates */}
            {contract.itemizedRates && (
              <div>
                <h4 className="text-xs font-bold font-mono text-zinc-700 uppercase mb-3">
                  Itemized Piece Rates (Flatwork Calendaring)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  {Object.entries(contract.itemizedRates).map(([item, rate]) => (
                    <div key={item} className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex justify-between items-center">
                      <span className="text-zinc-600 truncate">{item}</span>
                      <span className="font-bold text-black">₹{String(rate)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: Schedule Bulk Dispatch ──────────────────────────────────── */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div>
                <h3 className="text-base font-bold font-mono text-black uppercase">
                  Schedule Commercial Bulk Dispatch
                </h3>
                <p className="text-xs text-zinc-500">
                  Van will arrive with sealed barcode custody bags.
                </p>
              </div>
              <button
                onClick={() => setIsNewOrderOpen(false)}
                className="text-zinc-400 hover:text-black font-mono font-bold text-sm p-1"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBulkOrder} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Pickup Date</label>
                  <input
                    type="date"
                    value={orderForm.pickupDate}
                    onChange={(e) => setOrderForm({ ...orderForm, pickupDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Pickup Window Slot</label>
                  <select
                    value={orderForm.pickupSlot}
                    onChange={(e) => setOrderForm({ ...orderForm, pickupSlot: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 text-xs"
                  >
                    <option value="08:30 AM - 10:30 AM">Morning (08:30 – 10:30 AM)</option>
                    <option value="01:00 PM - 03:00 PM">Afternoon (01:00 – 03:00 PM)</option>
                    <option value="05:00 PM - 07:00 PM">Evening (05:00 – 07:00 PM)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Estimated Load (kg)</label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={orderForm.estimatedKg}
                    onChange={(e) => setOrderForm({ ...orderForm, estimatedKg: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-zinc-700 mb-1">Sealed Bag Count</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={orderForm.bagCount}
                    onChange={(e) => setOrderForm({ ...orderForm, bagCount: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-zinc-300 text-xs"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Fabric Care Requirement</label>
                <select
                  value={orderForm.serviceType}
                  onChange={(e) => setOrderForm({ ...orderForm, serviceType: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 text-xs"
                >
                  <option value="Commercial Linen Wash & Steam Ironing">Commercial Linen Wash & Steam Ironing</option>
                  <option value="Medical Grade 80°C Thermal Sanitization">Medical Grade 80°C Thermal Sanitization</option>
                  <option value="Flatwork Roller Calendaring Press">Flatwork Roller Calendaring Press</option>
                  <option value="Executive Staff Uniforms Care">Executive Staff Uniforms Care</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Loading Bay / Gate Instructions</label>
                <textarea
                  value={orderForm.specialInstructions}
                  onChange={(e) => setOrderForm({ ...orderForm, specialInstructions: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-zinc-300 text-xs h-16"
                  placeholder="e.g. Loading bay entrance, housekeeping storekeeper available"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsNewOrderOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  className="px-6 py-2.5 rounded-xl bg-black text-white text-xs font-bold uppercase hover:bg-zinc-800"
                >
                  {submittingOrder ? "Scheduling Dispatch..." : "Confirm & Generate Bags"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Submit Bank UTR ─────────────────────────────────────────── */}
      {isUtrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <h3 className="text-sm font-bold font-mono text-black uppercase">
                Submit RTGS/NEFT Payment UTR
              </h3>
              <button onClick={() => setIsUtrModalOpen(null)} className="text-zinc-400 hover:text-black p-1">
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitUtr} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block font-bold text-zinc-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={isUtrModalOpen}
                  disabled
                  className="w-full p-2.5 rounded-xl border border-zinc-200 bg-zinc-100 text-zinc-600 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Bank UTR / Ref Number *</label>
                <input
                  type="text"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFCR520261115009182"
                  className="w-full p-2.5 rounded-xl border border-zinc-300 uppercase"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 mb-1">Amount Transferred (₹) *</label>
                <input
                  type="number"
                  value={utrAmount}
                  onChange={(e) => setUtrAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-zinc-300"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsUtrModalOpen(null)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 text-zinc-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  Submit Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
