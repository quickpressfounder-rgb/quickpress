import { useState, useEffect, useRef } from "react";
import {
  Search,
  Phone,
  Mail,
  Package,
  CreditCard,
  FileText,
  RotateCcw,
  Landmark,
  Scale,
  DollarSign,
  User,
  ArrowRight,
  X,
  Loader2,
  Bike,
  Building2,
} from "lucide-react";
import { performGlobalFinanceSearch, type GlobalSearchResult } from "@/api/finance-api";
import { Badge } from "@/shared/ui/badge";

interface GlobalFinanceSearchProps {
  onSelectEntity?: (type: string, id: string, data?: any) => void;
}

export function GlobalFinanceSearch({ onSelectEntity }: GlobalFinanceSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResult(null);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await performGlobalFinanceSearch(query.trim());
        setResult(res);
        setIsOpen(true);
      } catch (err) {
        console.error("Finance search failed:", err);
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  const getBadgeForType = (type: string) => {
    switch (type) {
      case "CUSTOMER_PHONE":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold flex items-center gap-1"><Phone className="size-3" /> Customer Phone</Badge>;
      case "EMAIL":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold flex items-center gap-1"><Mail className="size-3" /> Email</Badge>;
      case "ORDER_ID":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold flex items-center gap-1"><Package className="size-3" /> Order ID</Badge>;
      case "PAYMENT_ID":
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold flex items-center gap-1"><CreditCard className="size-3" /> Payment ID</Badge>;
      case "INVOICE_ID":
        return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 font-bold flex items-center gap-1"><FileText className="size-3" /> Invoice ID</Badge>;
      case "REFUND_ID":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold flex items-center gap-1"><RotateCcw className="size-3" /> Refund ID</Badge>;
      case "SETTLEMENT_ID":
        return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-300 font-bold flex items-center gap-1"><Landmark className="size-3" /> Settlement ID</Badge>;
      case "LEDGER_ID":
        return <Badge className="bg-zinc-100 text-zinc-800 border-zinc-300 font-bold flex items-center gap-1"><Scale className="size-3" /> Ledger Entry</Badge>;
      case "COD_ID":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 font-bold flex items-center gap-1"><DollarSign className="size-3" /> COD Record</Badge>;
      default:
        return <Badge className="bg-zinc-100 text-zinc-600 border-zinc-200">Global Search</Badge>;
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 size-4 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (result && query) setIsOpen(true);
          }}
          placeholder="Search User, Order (QP-), Payment (PAY-), Invoice (INV-), Ledger (LED-)..."
          className="w-full pl-10 pr-24 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 placeholder:text-zinc-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
        />

        <div className="absolute right-2.5 flex items-center gap-1.5">
          {isLoading && <Loader2 className="size-3.5 text-amber-500 animate-spin" />}
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResult(null);
                setIsOpen(false);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100"
            >
              <X className="size-3.5" />
            </button>
          )}
          {result && getBadgeForType(result.detectedType)}
        </div>
      </div>

      {/* Dropdown Results Box */}
      {isOpen && result && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden z-50 max-h-[460px] overflow-y-auto">
          <div className="p-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              {result.totalMatches} match(es) for &quot;{result.query}&quot;
            </span>
            <span className="text-[10px] text-zinc-400">Press ESC to dismiss</span>
          </div>

          <div className="p-2 space-y-3">
            {/* USERS / CUSTOMERS */}
            {result.users && result.users.length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <User className="size-3" /> Customers / Users ({result.users.length})
                </p>
                <div className="space-y-1">
                  {result.users.map((u: any) => (
                    <div
                      key={u.customerId || u.id}
                      onClick={() => {
                        onSelectEntity?.("CUSTOMER", u.customerId || u.id, u);
                        setIsOpen(false);
                      }}
                      className="p-2.5 rounded-xl hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 cursor-pointer flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                          {(u.name || "QP").substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-900">{u.name}</div>
                          <div className="text-[11px] text-zinc-500">{u.phone} • {u.city}</div>
                        </div>
                      </div>
                      {u.kpis && (
                        <div className="text-right">
                          <div className="text-xs font-black text-emerald-700">LTV: ₹{u.kpis.lifetimeValue?.toLocaleString("en-IN")}</div>
                          <div className="text-[10px] text-zinc-400">{u.kpis.totalOrders} order(s) • Wallet: ₹{u.kpis.walletBalance}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ORDERS */}
            {result.orders && result.orders.length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                  <Package className="size-3" /> Orders ({result.orders.length})
                </p>
                <div className="space-y-1">
                  {result.orders.map((o: any) => {
                    const ord = o.order || o;
                    const fin = o.financials || {};
                    return (
                      <div
                        key={ord.id}
                        onClick={() => {
                          onSelectEntity?.("ORDER", ord.id, o);
                          setIsOpen(false);
                        }}
                        className="p-2.5 rounded-xl hover:bg-amber-50/70 border border-transparent hover:border-amber-200 cursor-pointer flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">
                            ORD
                          </div>
                          <div>
                            <div className="text-xs font-bold text-zinc-900">Order #{ord.id}</div>
                            <div className="text-[11px] text-zinc-500">{ord.status} • {ord.paymentMode || ord.paymentMethod || "Prepaid"}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-zinc-900">₹{ord.total_amount || ord.amount || fin.customerPayable || 0}</div>
                          <div className="text-[10px] text-emerald-600 font-semibold">{o.ledgerLinesCount ? `${o.ledgerLinesCount} ledger lines` : "View details"}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* PAYMENTS */}
            {result.payments && result.payments.length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-purple-700 flex items-center gap-1">
                  <CreditCard className="size-3" /> Payments ({result.payments.length})
                </p>
                <div className="space-y-1">
                  {result.payments.map((p: any) => (
                    <div
                      key={p.id || p.transaction_id}
                      onClick={() => {
                        onSelectEntity?.("PAYMENT", p.id || p.transaction_id, p);
                        setIsOpen(false);
                      }}
                      className="p-2.5 rounded-xl hover:bg-purple-50/70 border border-transparent hover:border-purple-200 cursor-pointer flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-purple-600 text-white font-black text-[10px] flex items-center justify-center">
                          PAY
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-900">{p.id || p.transaction_id}</div>
                          <div className="text-[11px] text-zinc-500">{p.method || p.payment_method || "UPI"} • {p.status || "SUCCESS"}</div>
                        </div>
                      </div>
                      <div className="text-xs font-black text-purple-700">₹{p.amount || 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LEDGER ENTRIES */}
            {result.ledgerEntries && result.ledgerEntries.length > 0 && (
              <div>
                <p className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-zinc-700 flex items-center gap-1">
                  <Scale className="size-3" /> General Ledger Lines ({result.ledgerEntries.length})
                </p>
                <div className="space-y-1">
                  {result.ledgerEntries.map((l: any) => (
                    <div
                      key={l.id}
                      onClick={() => {
                        onSelectEntity?.("LEDGER", l.id, l);
                        setIsOpen(false);
                      }}
                      className="p-2.5 rounded-xl hover:bg-zinc-100 border border-transparent hover:border-zinc-300 cursor-pointer flex items-center justify-between transition-all"
                    >
                      <div>
                        <div className="text-xs font-bold text-zinc-900">
                          {l.account_code} - {l.account_name}
                        </div>
                        <div className="text-[11px] text-zinc-500">{l.description} ({l.reference_id})</div>
                      </div>
                      <div className="text-right">
                        {l.debit > 0 ? (
                          <span className="text-xs font-black text-rose-600">DR ₹{l.debit}</span>
                        ) : (
                          <span className="text-xs font-black text-emerald-600">CR ₹{l.credit}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.totalMatches === 0 && (
              <div className="p-6 text-center text-zinc-400 text-xs">
                No matching financial records found for &quot;{result.query}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
