import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Search,
  IndianRupee,
  ShoppingBag,
  RotateCcw,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Eye,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { fetchCustomerFinance360, CustomerFinance360 } from "@/api/finance-api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { toast } from "sonner";

interface CustomerFinance360ViewProps {
  onInspectOrder?: (orderId: string) => void;
  initialIdentifier?: string;
}

export function CustomerFinance360View({ onInspectOrder, initialIdentifier = "" }: CustomerFinance360ViewProps) {
  const [searchInput, setSearchInput] = useState(initialIdentifier);
  const [activeQuery, setActiveQuery] = useState(initialIdentifier);
  const [subTab, setSubTab] = useState<"orders" | "payments" | "wallet" | "timeline">("orders");

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<CustomerFinance360>({
    queryKey: ["customer-finance-360", activeQuery],
    queryFn: () => fetchCustomerFinance360(activeQuery),
    enabled: Boolean(activeQuery && activeQuery.trim().length > 0),
    staleTime: 30000,
  });

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      toast.error("Please enter a customer phone number, user ID, or email");
      return;
    }
    setActiveQuery(trimmed);
  };

  const customer = data?.customer;
  const metrics = data?.metrics;

  return (
    <div className="space-y-6">
      {/* Search Header Bar */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                <User className="size-5" />
              </span>
              <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Customer Finance 360</h2>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Search by customer phone number (+91), User ID, or email to inspect complete financial history.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Phone (e.g. 9876543210) or User ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 text-xs rounded-xl h-9"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 h-9 rounded-xl shadow-xs"
            >
              {isLoading ? <RefreshCw className="size-3.5 animate-spin" /> : "Inspect 360"}
            </Button>
          </form>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center shadow-xs">
          <RefreshCw className="size-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-700">Gathering 360° Financial Records...</p>
          <p className="text-xs text-zinc-400 mt-1">Aggregating orders, payments, refunds, and wallet transactions</p>
        </div>
      )}

      {/* Empty Initial State */}
      {!activeQuery && !isLoading && (
        <div className="bg-zinc-50/80 border border-dashed border-zinc-300 rounded-2xl p-12 text-center">
          <div className="size-12 bg-white rounded-2xl border border-zinc-200 flex items-center justify-center mx-auto mb-3 text-zinc-400 shadow-xs">
            <Search className="size-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-800">Search for a Customer</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mt-1">
            Enter a customer's phone number or account ID above to unlock their full lifetime spend, orders, payment receipts, refunds, and double-entry wallet history.
          </p>
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
          <AlertCircle className="size-6 mx-auto mb-2 text-rose-600" />
          <h4 className="text-sm font-bold">Failed to load customer profile</h4>
          <p className="text-xs text-rose-600 mt-1">Please verify the phone number or ID and try again.</p>
        </div>
      )}

      {/* Profile & Financial Dashboard */}
      {data && !isLoading && (
        <div className="space-y-6">
          {/* Customer Header Info */}
          <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-2xl p-6 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 font-bold text-xl">
                  {customer?.name ? customer.name.charAt(0).toUpperCase() : "C"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{customer?.name || "QuickPress Customer"}</h3>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] px-2 py-0.5 font-bold">
                      VERIFIED ACCOUNT
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-300 mt-1 font-mono">
                    <span>Phone: {customer?.phone || "N/A"}</span>
                    <span>•</span>
                    <span>Email: {customer?.email || "N/A"}</span>
                    <span>•</span>
                    <span>ID: {customer?.userId}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs rounded-xl self-start sm:self-auto"
              >
                <RefreshCw className="size-3.5 mr-1.5" />
                Refresh Profile
              </Button>
            </div>
          </div>

          {/* KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Lifetime Gross Spend</span>
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <IndianRupee className="size-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-zinc-900 mt-2">
                ₹{((metrics?.lifetimeSpent ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1 font-medium">
                <span>Avg Order Value:</span>
                <span className="font-bold text-zinc-700">₹{(metrics?.averageOrderValue ?? 0).toFixed(0)}</span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Total Orders Placed</span>
                <span className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <ShoppingBag className="size-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-zinc-900 mt-2">
                {metrics?.totalOrders ?? 0}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2 font-medium">
                <span className="text-emerald-600 font-bold">{metrics?.completedOrders ?? 0} Completed</span>
                <span>•</span>
                <span className="text-rose-500 font-bold">{metrics?.cancelledOrders ?? 0} Cancelled</span>
              </div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Wallet Balance</span>
                <span className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                  <Wallet className="size-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-purple-700 mt-2">
                ₹{((metrics?.walletBalance ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Available for instant checkout</div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500">Refunds Processed</span>
                <span className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <RotateCcw className="size-4" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-700 mt-2">
                ₹{((metrics?.totalRefunds ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Total credits & gateway reversals</div>
            </div>
          </div>

          {/* Sub-tabs for detailed drill-down */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs">
            <Tabs value={subTab} onValueChange={(v) => setSubTab(v as any)} className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 gap-3">
                <TabsList className="bg-zinc-100 p-1 rounded-xl">
                  <TabsTrigger value="orders" className="text-xs font-bold rounded-lg px-3 py-1.5">
                    Orders ({data?.orders?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="payments" className="text-xs font-bold rounded-lg px-3 py-1.5">
                    Payment Receipts ({data?.payments?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="wallet" className="text-xs font-bold rounded-lg px-3 py-1.5">
                    Wallet Ledger ({data?.walletTransactions?.length ?? 0})
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs font-bold rounded-lg px-3 py-1.5">
                    Audit Timeline
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Orders Tab */}
              <TabsContent value="orders" className="mt-4">
                {(!data?.orders || data.orders.length === 0) ? (
                  <p className="text-xs text-zinc-400 py-6 text-center">No orders recorded for this customer yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 font-semibold">
                          <th className="pb-3">Order ID</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">City</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Payment Status</th>
                          <th className="pb-3">Fulfillment Status</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {data.orders.map((o) => (
                          <tr key={o.id} className="hover:bg-zinc-50/70">
                            <td className="py-3 font-mono font-bold text-zinc-900">{o.orderNumber || o.id}</td>
                            <td className="py-3 text-zinc-500">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-IN") : "N/A"}</td>
                            <td className="py-3 text-zinc-600">{o.city || "Kasganj"}</td>
                            <td className="py-3 font-bold text-zinc-900">₹{(o.totalAmount ?? 0).toFixed(2)}</td>
                            <td className="py-3">
                              <Badge
                                className={
                                  o.paymentStatus === "PAID"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : o.paymentStatus === "REFUNDED"
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-zinc-100 text-zinc-700"
                                }
                              >
                                {o.paymentStatus || "PENDING"}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <Badge variant="outline" className="text-[10px]">
                                {o.status || "CONFIRMED"}
                              </Badge>
                            </td>
                            <td className="py-3 text-right">
                              {onInspectOrder && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onInspectOrder(o.id)}
                                  className="h-7 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                >
                                  <Eye className="size-3 mr-1" />
                                  Inspect 360
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="mt-4">
                {(!data?.payments || data.payments.length === 0) ? (
                  <p className="text-xs text-zinc-400 py-6 text-center">No payment gateway records found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 font-semibold">
                          <th className="pb-3">Payment ID / Txn</th>
                          <th className="pb-3">Gateway</th>
                          <th className="pb-3">Order Ref</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {data.payments.map((p) => (
                          <tr key={p.id} className="hover:bg-zinc-50/70">
                            <td className="py-3 font-mono text-zinc-900">{p.transactionId || p.id}</td>
                            <td className="py-3 font-semibold text-zinc-700">{p.gateway || "Razorpay"}</td>
                            <td className="py-3 font-mono text-zinc-500">{p.orderId || "N/A"}</td>
                            <td className="py-3 font-bold text-zinc-900">₹{(p.amount ?? 0).toFixed(2)}</td>
                            <td className="py-3">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                {p.status || "SUCCESS"}
                              </Badge>
                            </td>
                            <td className="py-3 text-zinc-500">{p.createdAt ? new Date(p.createdAt).toLocaleString("en-IN") : "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Wallet Ledger Tab */}
              <TabsContent value="wallet" className="mt-4">
                {(!data?.walletTransactions || data.walletTransactions.length === 0) ? (
                  <p className="text-xs text-zinc-400 py-6 text-center">No wallet activity recorded.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-200 text-zinc-500 font-semibold">
                          <th className="pb-3">Type</th>
                          <th className="pb-3">Description</th>
                          <th className="pb-3">Amount</th>
                          <th className="pb-3">Balance After</th>
                          <th className="pb-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {data.walletTransactions.map((w) => (
                          <tr key={w.id} className="hover:bg-zinc-50/70">
                            <td className="py-3">
                              <span className={`inline-flex items-center gap-1 font-bold ${w.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"}`}>
                                {w.type === "CREDIT" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                                {w.type}
                              </span>
                            </td>
                            <td className="py-3 text-zinc-700">{w.description}</td>
                            <td className="py-3 font-bold text-zinc-900">₹{(w.amount ?? 0).toFixed(2)}</td>
                            <td className="py-3 font-mono text-zinc-600">₹{(w.balanceAfter ?? 0).toFixed(2)}</td>
                            <td className="py-3 text-zinc-500">{w.createdAt ? new Date(w.createdAt).toLocaleString("en-IN") : "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="mt-4">
                {(!data?.timeline || data.timeline.length === 0) ? (
                  <p className="text-xs text-zinc-400 py-6 text-center">No timeline events recorded.</p>
                ) : (
                  <div className="space-y-4 pl-4 border-l-2 border-indigo-200">
                    {data.timeline.map((t, idx) => (
                      <div key={idx} className="relative pl-6">
                        <div className="absolute -left-[29px] top-1 size-3.5 rounded-full bg-indigo-600 border-2 border-white ring-2 ring-indigo-100" />
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-zinc-900">{t.title}</h5>
                          <span className="text-[10px] text-zinc-400">{t.timestamp ? new Date(t.timestamp).toLocaleString("en-IN") : ""}</span>
                        </div>
                        <p className="text-xs text-zinc-600 mt-0.5">{t.description}</p>
                        {t.amount !== undefined && (
                          <span className="inline-block mt-1 text-[11px] font-mono font-bold text-zinc-900">
                            Amount: ₹{Number(t.amount).toFixed(2)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </div>
  );
}
