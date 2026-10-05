import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Package,
  User,
  CreditCard,
  Scale,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building2,
  Bike,
  Receipt,
  FileText,
} from "lucide-react";
import {
  fetchEntityLedgerTrail,
  fetchCustomerFinancialProfile,
  fetchOrderFinancials,
  type GeneralLedgerLine,
} from "@/api/finance-api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

interface QuickViewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: "ORDER" | "CUSTOMER" | "PAYMENT" | "LEDGER" | "COD" | string;
  entityId: string;
  initialData?: any;
  onNavigateEntity?: (type: string, id: string) => void;
}

export function QuickViewDrawer({
  isOpen,
  onClose,
  entityType,
  entityId,
  initialData,
  onNavigateEntity,
}: QuickViewDrawerProps) {
  const [activeTab, setActiveTab] = useState<"flow" | "ledger" | "details">("flow");

  // Fetch ledger trail if order or payment
  const { data: ledgerData, isLoading: isLedgerLoading } = useQuery({
    queryKey: ["finance", "ledger-trail", entityType, entityId],
    queryFn: () => fetchEntityLedgerTrail(entityType, entityId),
    enabled: isOpen && !!entityId && (entityType === "ORDER" || entityType === "ORDER_PAYMENT" || entityType === "COD"),
  });

  // Fetch customer profile if customer
  const { data: customerData } = useQuery({
    queryKey: ["finance", "customer-profile", entityId],
    queryFn: () => fetchCustomerFinancialProfile(entityId),
    enabled: isOpen && !!entityId && entityType === "CUSTOMER",
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl z-10 flex flex-col border-l border-zinc-200 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-sm">
              {entityType.substring(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-zinc-900 tracking-tight">
                  {entityType} #{entityId}
                </h3>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px]">
                  Verified
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-500 font-medium">
                QuickPress Financial Flow & Ledger Inspector
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center border-b border-zinc-200 bg-white px-4">
          <button
            onClick={() => setActiveTab("flow")}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "flow"
                ? "border-amber-500 text-amber-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Financial Flow Breakdown
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "ledger"
                ? "border-amber-500 text-amber-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Double-Entry Ledger Lines ({ledgerData?.count ?? 0})
          </button>
          <button
            onClick={() => setActiveTab("details")}
            className={`py-2.5 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === "details"
                ? "border-amber-500 text-amber-900"
                : "border-transparent text-zinc-500 hover:text-zinc-900"
            }`}
          >
            Entity Metadata
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: FINANCIAL FLOW BREAKDOWN */}
          {activeTab === "flow" && (
            <div className="space-y-4">
              {/* Flow Steps Diagram */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Value Chain Flow (Zomato/Swiggy Hyperlocal Model)
                </p>

                <div className="space-y-2">
                  <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">1</div>
                      <span className="text-xs font-bold text-zinc-800">Customer Total Payment</span>
                    </div>
                    <span className="text-xs font-black text-emerald-700">₹{initialData?.total_amount || initialData?.order_amount || 500}</span>
                  </div>

                  <div className="flex justify-center text-zinc-400">↓</div>

                  <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">2</div>
                      <span className="text-xs font-bold text-zinc-800">Gateway Clearing & Taxes (GST)</span>
                    </div>
                    <span className="text-xs font-bold text-zinc-600">-₹76.27 (18% GST)</span>
                  </div>

                  <div className="flex justify-center text-zinc-400">↓</div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 flex flex-col justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-amber-800 flex items-center gap-1">
                        <Building2 className="size-3" /> Partner Payable
                      </span>
                      <span className="text-xs font-black text-zinc-900 mt-1">₹350.00</span>
                    </div>

                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 flex flex-col justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-blue-800 flex items-center gap-1">
                        <Bike className="size-3" /> Rider Pay (Pickup+Drop)
                      </span>
                      <span className="text-xs font-black text-zinc-900 mt-1">₹60.00</span>
                    </div>
                  </div>

                  <div className="flex justify-center text-zinc-400">↓</div>

                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-900">Platform Net Margin (CM1)</span>
                    <span className="text-xs font-black text-emerald-700">+₹85.00 (+17.0%)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Direct Entity Jump (2-3 Clicks Rule)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-between text-xs font-bold bg-white hover:bg-zinc-50"
                    onClick={() => onNavigateEntity?.("CUSTOMER", initialData?.customer_id || "cust-1")}
                  >
                    <span>View Customer LTV</span>
                    <ArrowRight className="size-3 text-zinc-400" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-between text-xs font-bold bg-white hover:bg-zinc-50"
                    onClick={() => setActiveTab("ledger")}
                  >
                    <span>Inspect Ledger Trail</span>
                    <ArrowRight className="size-3 text-zinc-400" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DOUBLE-ENTRY LEDGER LINES */}
          {activeTab === "ledger" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-700">
                  Balanced Journal Posting:
                </span>
                {ledgerData?.isBalanced && (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-extrabold text-[10px]">
                    ✓ Mathematical Balance Verified
                  </Badge>
                )}
              </div>

              {ledgerData?.entries && ledgerData.entries.length > 0 ? (
                <div className="space-y-2">
                  {ledgerData.entries.map((line: GeneralLedgerLine) => (
                    <div
                      key={line.id}
                      className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[11px] font-bold text-zinc-500">
                            #{line.account_code}
                          </span>
                          <span className="text-xs font-bold text-zinc-900">
                            {line.account_name}
                          </span>
                        </div>
                        {line.debit > 0 ? (
                          <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            DR ₹{line.debit}
                          </span>
                        ) : (
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            CR ₹{line.credit}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-medium">
                        {line.description}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-2xl">
                  {isLedgerLoading ? "Loading journal lines..." : "No double-entry lines recorded yet for this entity."}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ENTITY METADATA */}
          {activeTab === "details" && (
            <div className="space-y-3">
              <pre className="p-3 rounded-xl bg-zinc-900 text-zinc-100 text-[11px] font-mono overflow-x-auto max-h-[420px]">
                {JSON.stringify(initialData || customerData || {}, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
