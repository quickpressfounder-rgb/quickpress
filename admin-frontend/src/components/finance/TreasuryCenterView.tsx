import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Landmark,
  Building2,
  DollarSign,
  Plus,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
} from "lucide-react";
import { fetchTreasuryCenter, addBankAccount, TreasuryCenterResponse } from "@/api/finance-api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { toast } from "sonner";

export function TreasuryCenterView() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("OPERATING");
  const [ifsc, setIfsc] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");

  const { data, isLoading, isError, refetch } = useQuery<TreasuryCenterResponse>({
    queryKey: ["treasury-center"],
    queryFn: () => fetchTreasuryCenter(),
    staleTime: 30000,
  });

  const addBankMutation = useMutation({
    mutationFn: addBankAccount,
    onSuccess: () => {
      toast.success("Corporate bank account added successfully");
      queryClient.invalidateQueries({ queryKey: ["treasury-center"] });
      setModalOpen(false);
      setBankName("");
      setAccountNumber("");
      setIfsc("");
      setInitialBalance("0");
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to register bank account");
    },
  });

  const handleCreateBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName.trim() || !accountNumber.trim() || !ifsc.trim()) {
      toast.error("Please fill in all required bank details");
      return;
    }
    addBankMutation.mutate({
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      accountType,
      ifsc: ifsc.trim().toUpperCase(),
      currentBalance: parseFloat(initialBalance) || 0,
    });
  };

  const liq = data?.liquidity;
  const accounts = data?.bankAccounts || [];
  const forecast = data?.forecastTimeline || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <Landmark className="size-5" />
            </span>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Corporate Treasury & Liquidity Center</h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time multi-bank cash positioning, gateway in-transit escrow, fleet COD float, and liquidity runway.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 rounded-xl shadow-xs"
          >
            <Plus className="size-3.5 mr-1.5" />
            Register Bank Account
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-9 text-xs rounded-xl"
          >
            <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-12 text-center shadow-xs">
          <RefreshCw className="size-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-zinc-700">Evaluating Corporate Liquidity Position...</p>
        </div>
      )}

      {isError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-800">
          <AlertCircle className="size-6 mx-auto mb-2 text-rose-600" />
          <h4 className="text-sm font-bold">Failed to load treasury data</h4>
          <p className="text-xs text-rose-600 mt-1">Please retry or check system logs.</p>
        </div>
      )}

      {data && !isLoading && (
        <div className="space-y-6">
          {/* Liquidity KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-zinc-500">Total Liquid Position</span>
              <div className="text-2xl font-black text-zinc-900 mt-2">
                ₹{((liq?.totalLiquidity ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 font-bold flex items-center gap-1">
                <CheckCircle2 className="size-3" />
                Reserve Status: {liq?.status || "HEALTHY"}
              </div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-zinc-500">Corporate Bank Balances</span>
              <div className="text-2xl font-black text-blue-700 mt-2">
                ₹{((liq?.totalBankBalance ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">{accounts.length} active corporate accounts</div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-zinc-500">Payment Gateway In-Transit</span>
              <div className="text-2xl font-black text-purple-700 mt-2">
                ₹{((liq?.gatewayInTransit ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Settling within T+1 / T+2 days</div>
            </div>

            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-semibold text-zinc-500">Fleet COD Cash Float</span>
              <div className="text-2xl font-black text-amber-700 mt-2">
                ₹{((liq?.codFloat ?? 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">Pending hub bank deposit</div>
            </div>
          </div>

          {/* Bank Accounts Master */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-zinc-900">Corporate Bank Accounts</h3>
              </div>
              <Badge variant="outline" className="text-xs">
                {accounts.length} Accounts Configured
              </Badge>
            </div>

            {accounts.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">No corporate bank accounts registered yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 font-semibold">
                      <th className="pb-3 text-left">Bank Name</th>
                      <th className="pb-3 text-left">Account Number</th>
                      <th className="pb-3 text-left">Account Type</th>
                      <th className="pb-3 text-left">IFSC Code</th>
                      <th className="pb-3 text-right">Live Balance (₹)</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {accounts.map((b) => (
                      <tr key={b.id} className="hover:bg-zinc-50/70">
                        <td className="py-3 font-bold text-zinc-900 flex items-center gap-2">
                          <Landmark className="size-4 text-zinc-500" />
                          {b.bankName}
                        </td>
                        <td className="py-3 font-mono text-zinc-700">{b.accountNumber}</td>
                        <td className="py-3">
                          <Badge variant="outline" className="text-[10px]">
                            {b.accountType}
                          </Badge>
                        </td>
                        <td className="py-3 font-mono text-zinc-600">{b.ifsc}</td>
                        <td className="py-3 text-right font-mono font-bold text-zinc-900">
                          ₹{(b.currentBalance ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 text-right">
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                            {b.status || "ACTIVE"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 14-Day Cash Flow Runway */}
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-blue-600" />
                <h3 className="text-sm font-bold text-zinc-900">14-Day Liquidity & Runway Projections</h3>
              </div>
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                Deterministic Model
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 font-semibold">
                    <th className="pb-2 text-left">Forecast Day</th>
                    <th className="pb-2 text-right">Projected Inflow (₹)</th>
                    <th className="pb-2 text-right">Projected Outflow (₹)</th>
                    <th className="pb-2 text-right">Net Daily Cash (₹)</th>
                    <th className="pb-2 text-right">Ending Liquidity (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {forecast.map((f, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/70">
                      <td className="py-2.5 font-bold text-zinc-900">{f.day}</td>
                      <td className="py-2.5 text-right font-mono text-emerald-600">
                        +₹{(f.projectedInflow ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right font-mono text-rose-600">
                        -₹{(f.projectedOutflow ?? 0).toFixed(2)}
                      </td>
                      <td
                        className={`py-2.5 text-right font-mono font-bold ${
                          (f.netCash ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        ₹{(f.netCash ?? 0).toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-zinc-900">
                        ₹{(f.projectedBalance ?? 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Bank Account Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Register Corporate Bank Account</DialogTitle>
            <DialogDescription>
              Add an operating, nodal, or gateway escrow account to the corporate treasury.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateBank} className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Bank Name *</Label>
              <Input
                placeholder="e.g. HDFC Bank, ICICI Bank, State Bank of India"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="text-xs mt-1"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Account Number *</Label>
              <Input
                placeholder="e.g. 50200012345678"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="text-xs mt-1 font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Account Type</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger className="text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERATING">Operating Current</SelectItem>
                    <SelectItem value="ESCROW">Gateway Escrow</SelectItem>
                    <SelectItem value="NODAL">RBI Nodal Account</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">IFSC Code *</Label>
                <Input
                  placeholder="e.g. HDFC0001234"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  className="text-xs mt-1 font-mono uppercase"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Current Opening Balance (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className="text-xs mt-1 font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={addBankMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {addBankMutation.isPending ? "Adding..." : "Add Bank Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
