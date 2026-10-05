import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Crown,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Plus,
  Sliders,
  CheckCircle2,
  Clock,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMembershipMetrics,
  fetchMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  toggleMembershipPlan,
  fetchActiveMembers,
} from "@/api/finance-api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export function MembershipFinanceView() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<"plans" | "subscribers">("plans");
  const [searchMember, setSearchMember] = useState("");

  // Create Plan Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newMonthlyPrice, setNewMonthlyPrice] = useState(299);
  const [newYearlyPrice, setNewYearlyPrice] = useState(2499);
  const [newFreeDeliveryMin, setNewFreeDeliveryMin] = useState(199);
  const [newDiscountPct, setNewDiscountPct] = useState(15);
  const [newTagline, setNewTagline] = useState("");

  // Edit Plan Modal State
  const [editingPlan, setEditingPlan] = useState<any>(null);

  // Queries
  const { data: metricsData } = useQuery({
    queryKey: ["finance", "membership", "metrics"],
    queryFn: fetchMembershipMetrics,
  });

  const { data: plansData } = useQuery({
    queryKey: ["finance", "membership", "plans"],
    queryFn: fetchMembershipPlans,
  });

  const { data: membersData, isLoading: isMembersLoading } = useQuery({
    queryKey: ["finance", "membership", "members", searchMember],
    queryFn: () => fetchActiveMembers({ search: searchMember.trim() || undefined }),
  });

  // Create Plan Mutation
  const createPlanMutation = useMutation({
    mutationFn: (data: any) => createMembershipPlan(data),
    onSuccess: () => {
      toast.success("New dynamic membership plan created!");
      setIsCreateModalOpen(false);
      setNewPlanName("");
      queryClient.invalidateQueries({ queryKey: ["finance", "membership", "plans"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to create plan");
    },
  });

  // Update Plan Mutation
  const updatePlanMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) =>
      updateMembershipPlan(data.id, data.payload),
    onSuccess: () => {
      toast.success("Plan pricing and perks updated dynamically!");
      setEditingPlan(null);
      queryClient.invalidateQueries({ queryKey: ["finance", "membership", "plans"] });
    },
  });

  // Toggle Plan Mutation
  const togglePlanMutation = useMutation({
    mutationFn: (data: { id: string; isActive: boolean }) =>
      toggleMembershipPlan(data.id, data.isActive),
    onSuccess: () => {
      toast.success("Plan status updated.");
      queryClient.invalidateQueries({ queryKey: ["finance", "membership", "plans"] });
    },
  });

  const metrics = metricsData?.metrics;

  return (
    <div className="space-y-6">
      {/* Top Subscription Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Monthly Recurring (MRR)</span>
            <Crown className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            ₹{metrics?.mrr?.toLocaleString("en-IN") ?? "0.00"}
          </div>
          <span className="text-[11px] text-zinc-400">
            Annual Run Rate (ARR): ₹{metrics?.arr?.toLocaleString("en-IN") ?? "0.00"}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Active VIP Members</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {metrics?.total_active_members ?? 0}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">
            Subscribed customer base
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Upfront Cash Collected</span>
            <DollarSign className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-zinc-900">
            ₹{metrics?.total_upfront_cash_collected?.toLocaleString("en-IN") ?? "0"}
          </div>
          <span className="text-[11px] text-zinc-400">
            Ind AS 115 Deferred Revenue
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500 uppercase">Subscriber Churn Rate</span>
            <RotateCcw className="size-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-black text-zinc-700">
            {metrics?.churn_rate_percentage ?? 0}%
          </div>
          <span className="text-[11px] text-zinc-400">
            Retention and renewal health
          </span>
        </div>
      </div>

      {/* Sub Tabs: Plans vs Subscribers */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab("plans")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "plans"
                ? "bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Dynamic Plans & Pricing ({plansData?.plans?.length ?? 0})
          </button>
          <button
            onClick={() => setActiveSubTab("subscribers")}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === "subscribers"
                ? "bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Active Subscribers Directory ({membersData?.total ?? 0})
          </button>
        </div>

        {activeSubTab === "plans" && (
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1.5 text-xs"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="size-3.5" />
            <span>Create New Plan</span>
          </Button>
        )}
      </div>

      {/* TAB 1: DYNAMIC PLANS GRID */}
      {activeSubTab === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plansData?.plans?.map((plan: any) => {
            const mPrice = plan.monthly_price ?? plan.monthlyPrice ?? 0;
            const yPrice = plan.yearly_price ?? plan.yearlyPrice ?? 0;
            const freeMin = plan.free_delivery_min_order ?? plan.freeDeliveryMinOrder ?? 0;
            const disc = plan.discount_percent ?? plan.discountPercent ?? 0;
            const isActive = plan.status === "Active" || plan.is_active;

            return (
              <div
                key={plan._id || plan.id}
                className="p-5 rounded-2xl bg-white border border-zinc-200 shadow-2xs flex flex-col justify-between space-y-4 hover:border-amber-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-base font-black text-zinc-900">{plan.name}</h4>
                    <Badge className={isActive ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-500"}>
                      {isActive ? "Active" : "Archived"}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{plan.tagline || "Exclusive QuickPress VIP Plan"}</p>

                  <div className="mt-4 pt-3 border-t border-zinc-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Monthly Price:</span>
                      <span className="font-black text-zinc-900 text-sm">₹{mPrice} / mo</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Annual Price:</span>
                      <span className="font-bold text-zinc-700">₹{yPrice} / yr</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Free Delivery Order:</span>
                      <span className="font-bold text-emerald-600">Above ₹{freeMin}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-500">Flat Laundry Discount:</span>
                      <span className="font-bold text-emerald-600">{disc}% OFF</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs font-bold bg-white"
                    onClick={() => setEditingPlan(plan)}
                  >
                    Edit Pricing & Perks
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-zinc-500"
                    onClick={() =>
                      togglePlanMutation.mutate({
                        id: plan._id || plan.id,
                        isActive: !isActive,
                      })
                    }
                  >
                    {isActive ? "Archive" : "Activate"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: ACTIVE SUBSCRIBERS DIRECTORY */}
      {activeSubTab === "subscribers" && (
        <div className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 size-3.5 text-zinc-400" />
            <Input
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              placeholder="Search member name or phone..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Member Name & Phone</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Cycle</th>
                  <th className="py-3 px-4 text-right">Fee Paid</th>
                  <th className="py-3 px-4">Days Left</th>
                  <th className="py-3 px-4 text-right">Orders As VIP</th>
                  <th className="py-3 px-4 text-right">Lifetime LTV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 font-medium">
                {isMembersLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                      Loading VIP subscribers...
                    </td>
                  </tr>
                ) : membersData?.members && membersData.members.length > 0 ? (
                  membersData.members.map((m) => (
                    <tr key={m.subscription_id} className="hover:bg-zinc-50/70">
                      <td className="py-3 px-4">
                        <div className="font-bold text-zinc-900">{m.customer_name}</div>
                        <div className="text-[11px] text-zinc-500">{m.customer_phone || m.user_id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px]">
                          {m.plan_id}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 capitalize text-zinc-600">{m.billing_cycle}</td>
                      <td className="py-3 px-4 text-right font-bold text-zinc-900">₹{m.amount_paid}</td>
                      <td className="py-3 px-4">
                        {m.is_expiring_soon ? (
                          <Badge className="bg-rose-100 text-rose-800 font-bold text-[10px] animate-pulse">
                            🔴 {m.days_remaining} Days Left
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                            {m.days_remaining} Days Left
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-zinc-700">{m.orders_count}</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-700">₹{m.total_spend.toLocaleString("en-IN")}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                      No active subscribers match query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Plan Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-zinc-900">Create New Dynamic Membership Plan</h3>

            <div className="space-y-2.5">
              <div>
                <label className="text-xs font-bold text-zinc-700">Plan Name:</label>
                <Input
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="e.g. QuickPress Family Laundry Pass"
                  className="text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-zinc-700">Monthly Price (₹):</label>
                  <Input
                    type="number"
                    value={newMonthlyPrice}
                    onChange={(e) => setNewMonthlyPrice(Number(e.target.value))}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700">Yearly Price (₹):</label>
                  <Input
                    type="number"
                    value={newYearlyPrice}
                    onChange={(e) => setNewYearlyPrice(Number(e.target.value))}
                    className="text-xs mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-zinc-700">Free Delivery Min (₹):</label>
                  <Input
                    type="number"
                    value={newFreeDeliveryMin}
                    onChange={(e) => setNewFreeDeliveryMin(Number(e.target.value))}
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700">Flat Discount (%):</label>
                  <Input
                    type="number"
                    value={newDiscountPct}
                    onChange={(e) => setNewDiscountPct(Number(e.target.value))}
                    className="text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700">Tagline:</label>
                <Input
                  value={newTagline}
                  onChange={(e) => setNewTagline(e.target.value)}
                  placeholder="e.g. Free delivery on every laundry order"
                  className="text-xs mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
                disabled={!newPlanName.trim() || createPlanMutation.isPending}
                onClick={() =>
                  createPlanMutation.mutate({
                    name: newPlanName.trim(),
                    monthlyPrice: newMonthlyPrice,
                    yearlyPrice: newYearlyPrice,
                    freeDeliveryMinOrder: newFreeDeliveryMin,
                    discountPercent: newDiscountPct,
                    tagline: newTagline,
                  })
                }
              >
                Create Plan in DB
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-black text-zinc-900">Edit Plan: {editingPlan.name}</h3>

            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-zinc-700">Monthly Price (₹):</label>
                  <Input
                    type="number"
                    defaultValue={editingPlan.monthly_price ?? editingPlan.monthlyPrice}
                    id="edit-m-price"
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700">Yearly Price (₹):</label>
                  <Input
                    type="number"
                    defaultValue={editingPlan.yearly_price ?? editingPlan.yearlyPrice}
                    id="edit-y-price"
                    className="text-xs mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-zinc-700">Free Delivery Min (₹):</label>
                  <Input
                    type="number"
                    defaultValue={editingPlan.free_delivery_min_order ?? editingPlan.freeDeliveryMinOrder}
                    id="edit-free-min"
                    className="text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700">Flat Discount (%):</label>
                  <Input
                    type="number"
                    defaultValue={editingPlan.discount_percent ?? editingPlan.discountPercent}
                    id="edit-disc-pct"
                    className="text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditingPlan(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
                onClick={() => {
                  const mPrice = Number((document.getElementById("edit-m-price") as HTMLInputElement).value);
                  const yPrice = Number((document.getElementById("edit-y-price") as HTMLInputElement).value);
                  const freeMin = Number((document.getElementById("edit-free-min") as HTMLInputElement).value);
                  const disc = Number((document.getElementById("edit-disc-pct") as HTMLInputElement).value);

                  updatePlanMutation.mutate({
                    id: editingPlan._id || editingPlan.id,
                    payload: {
                      monthlyPrice: mPrice,
                      yearlyPrice: yPrice,
                      freeDeliveryMinOrder: freeMin,
                      discountPercent: disc,
                    },
                  });
                }}
              >
                Save Live Price
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
