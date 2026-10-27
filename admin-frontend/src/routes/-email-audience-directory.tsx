import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  Filter,
  Mail,
  Send,
  Building2,
  Truck,
  User,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
  Inbox,
  Clock,
  MapPin,
  Phone,
  AtSign,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { fetchCustomers, type AdminCustomer } from "../api/customers";
import { fetchPartners, type BackendPartnerItem } from "../api/partners";
import { fetchRiders, type AdminRider } from "../api/riders";

export interface DirectoryEntity {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "customer" | "partner" | "rider";
  city: string;
  status: string;
  metricLabel: string;
  metricValue: string | number;
  avatar?: string;
  joined?: string;
}

interface AudienceDirectoryTabProps {
  onComposeTo: (recipient: {
    to: string;
    name: string;
    audience: "customer" | "partner" | "rider";
    suggestedSubject?: string;
    suggestedMessage?: string;
  }) => void;
  onBulkCompose?: (recipients: { to: string; name: string }[]) => void;
}

export function AudienceDirectoryTab({ onComposeTo }: AudienceDirectoryTabProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "customer" | "partner" | "rider">("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 1. Fetch Customers
  const customersQuery = useQuery({
    queryKey: ["admin", "directory", "customers"],
    queryFn: () => fetchCustomers(),
    staleTime: 60000,
  });

  // 2. Fetch Store Partners
  const partnersQuery = useQuery({
    queryKey: ["admin", "directory", "partners"],
    queryFn: () => fetchPartners(),
    staleTime: 60000,
  });

  // 3. Fetch Fleet Captains / Riders
  const ridersQuery = useQuery({
    queryKey: ["admin", "directory", "riders"],
    queryFn: () => fetchRiders(),
    staleTime: 60000,
  });

  const isLoading = customersQuery.isLoading || partnersQuery.isLoading || ridersQuery.isLoading;

  // Unify entities
  const allEntities = useMemo<DirectoryEntity[]>(() => {
    const list: DirectoryEntity[] = [];

    // Customers
    if (customersQuery.data && Array.isArray(customersQuery.data)) {
      customersQuery.data.forEach((c: AdminCustomer) => {
        if (!c) return;
        list.push({
          id: `cust_${c.id}`,
          name: c.name || "Customer",
          email: c.email || "",
          phone: c.phone || "",
          role: "customer",
          city: c.city || "Kasganj",
          status: c.status || "Active",
          metricLabel: "Orders",
          metricValue: c.orders || 0,
          joined: c.joined || "Recent",
        });
      });
    }

    // Partners
    if (partnersQuery.data && Array.isArray(partnersQuery.data)) {
      partnersQuery.data.forEach((p: BackendPartnerItem) => {
        if (!p) return;
        list.push({
          id: `part_${p.id}`,
          name: p.businessName || p.ownerName || "Laundromat Partner",
          email: p.email || "",
          phone: p.phone || "",
          role: "partner",
          city: p.city || "Kasganj",
          status: "Verified",
          metricLabel: "Completed",
          metricValue: p.completedOrders || p.totalOrders || 0,
          joined: "Partner Network",
        });
      });
    }

    // Riders
    if (ridersQuery.data && Array.isArray(ridersQuery.data)) {
      ridersQuery.data.forEach((r: AdminRider) => {
        if (!r) return;
        list.push({
          id: `rider_${r.id}`,
          name: r.name || "Delivery Captain",
          email: r.email || "",
          phone: r.phone || "",
          role: "rider",
          city: r.city || "Kasganj",
          status: r.status || "Active",
          metricLabel: "Trips",
          metricValue: r.trips || 0,
          joined: r.joinedOn || "Fleet",
        });
      });
    }

    return list;
  }, [customersQuery.data, partnersQuery.data, ridersQuery.data]);

  // Extract cities
  const availableCities = useMemo(() => {
    const set = new Set<string>();
    allEntities.forEach((e) => {
      if (e.city && e.city.trim()) {
        set.add(e.city.trim());
      }
    });
    return Array.from(set).sort();
  }, [allEntities]);

  // Counts
  const counts = useMemo(() => {
    return {
      total: allEntities.length,
      customer: allEntities.filter((e) => e.role === "customer").length,
      partner: allEntities.filter((e) => e.role === "partner").length,
      rider: allEntities.filter((e) => e.role === "rider").length,
    };
  }, [allEntities]);

  // Filtered entities
  const filteredEntities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allEntities.filter((item) => {
      if (roleFilter !== "all" && item.role !== roleFilter) return false;
      if (cityFilter !== "all" && item.city.toLowerCase() !== cityFilter.toLowerCase()) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.phone.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
      );
    });
  }, [allEntities, search, roleFilter, cityFilter]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === filteredEntities.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEntities.map((e) => e.id)));
    }
  }

  function handleDirectMail(entity: DirectoryEntity) {
    if (!entity.email) {
      toast.error(`No email address available for ${entity.name}`);
      return;
    }
    let defaultSub = "";
    let defaultMsg = "";
    if (entity.role === "customer") {
      defaultSub = "Update regarding your QuickPress Laundry booking";
      defaultMsg = "We are reaching out regarding your recent garment care booking with QuickPress. Please let us know if you need any assistance!";
    } else if (entity.role === "partner") {
      defaultSub = "QuickPress Partner Store Operational Notice";
      defaultMsg = "Notice regarding your laundromat hub operations, weekly payout statement, or service quality update.";
    } else {
      defaultSub = "QuickPress Delivery Fleet Update";
      defaultMsg = "Important notification regarding your duty schedule, distance payouts, or duty performance.";
    }

    onComposeTo({
      to: entity.email,
      name: entity.name,
      audience: entity.role,
      suggestedSubject: defaultSub,
      suggestedMessage: defaultMsg,
    });
  }

  function handleBulkDispatch() {
    const chosen = filteredEntities.filter((e) => selectedIds.has(e.id) && e.email);
    if (!chosen.length) {
      toast.error("Please select at least one contact with a valid email.");
      return;
    }
    // Pre-fill with the first selected recipient or comma list
    const first = chosen[0];
    onComposeTo({
      to: chosen.map((c) => c.email).join(", "),
      name: `${chosen.length} Selected Recipients`,
      audience: first.role,
      suggestedSubject: "Important QuickPress Official Update",
      suggestedMessage: "Official correspondence from QuickPress Operations Team.",
    });
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-black uppercase tracking-wider">Total Directory</span>
            <Users className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-black text-zinc-950 tabular-nums">{counts.total}</div>
          <div className="text-xs text-zinc-500 mt-1">Cross-platform verified contacts</div>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-black uppercase tracking-wider">Customers</span>
            <User className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-zinc-950 tabular-nums">{counts.customer}</div>
          <div className="text-xs text-zinc-500 mt-1">Registered laundry customers</div>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-black uppercase tracking-wider">Store Partners</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-zinc-950 tabular-nums">{counts.partner}</div>
          <div className="text-xs text-zinc-500 mt-1">Laundromat hubs &amp; stores</div>
        </div>
        <div className="p-4 bg-white border border-zinc-200 rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-xs font-black uppercase tracking-wider">Fleet Captains</span>
            <Truck className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-zinc-950 tabular-nums">{counts.rider}</div>
          <div className="text-xs text-zinc-500 mt-1">Active delivery personnel</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 border border-zinc-200 rounded-2xl shadow-xs space-y-4">
        {/* Role Pills */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-sm">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400 mr-2 flex items-center gap-1 shrink-0">
              <Filter className="h-3 w-3" /> Filter By:
            </span>
            {[
              { id: "all", label: "All Contacts", count: counts.total, icon: Users },
              { id: "customer", label: "Customers", count: counts.customer, icon: User },
              { id: "partner", label: "Store Partners", count: counts.partner, icon: Building2 },
              { id: "rider", label: "Fleet Captains", count: counts.rider, icon: Truck },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = roleFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setRoleFilter(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black transition-all ${
                    active
                      ? "bg-zinc-950 text-white shadow-xs"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* City Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-500 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-zinc-400" /> City:
            </span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="text-xs font-bold border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-zinc-50 focus:bg-white focus:outline-none"
            >
              <option value="all">All Operational Cities</option>
              {availableCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search input + Multi-select actions */}
        <div className="flex items-center gap-3 pt-1 border-t border-zinc-100">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, phone number, city, or ID..."
              className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-zinc-950 bg-zinc-50/50"
            />
          </div>

          {selectedIds.size > 0 && (
            <Button
              onClick={handleBulkDispatch}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 px-4 rounded-xl shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Bulk Email ({selectedIds.size})</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              customersQuery.refetch();
              partnersQuery.refetch();
              ridersQuery.refetch();
              toast.success("Directory refreshed from live database.");
            }}
            className="text-xs font-bold text-zinc-600 flex items-center gap-1.5 rounded-xl border-zinc-200"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-4 w-10">
                  <button onClick={selectAll} className="text-zinc-400 hover:text-zinc-600">
                    {selectedIds.size > 0 && selectedIds.size === filteredEntities.length ? (
                      <CheckSquare className="h-4 w-4 text-zinc-900" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4">Contact / Name</th>
                <th className="py-3 px-4">Audience Role</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">City / Region</th>
                <th className="py-3 px-4">Performance</th>
                <th className="py-3 px-4 text-right">Instant Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <RotateCw className="h-6 w-6 animate-spin mx-auto mb-2 text-zinc-300" />
                    Loading cross-entity directory from Supabase...
                  </td>
                </tr>
              ) : filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <Users className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                    No contacts matched your search or filters.
                  </td>
                </tr>
              ) : (
                filteredEntities.map((entity) => {
                  const isSelected = selectedIds.has(entity.id);
                  return (
                    <tr
                      key={entity.id}
                      className={`hover:bg-zinc-50/80 transition-colors ${
                        isSelected ? "bg-emerald-50/30" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleSelect(entity.id)}
                          className="text-zinc-400 hover:text-zinc-700"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-black text-zinc-900 flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                              entity.role === "customer"
                                ? "bg-emerald-100 text-emerald-800"
                                : entity.role === "partner"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {entity.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-zinc-950 font-bold">{entity.name}</div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              {entity.id.replace("cust_", "QP-C-").replace("part_", "QP-P-").replace("rider_", "QP-R-")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            entity.role === "customer"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : entity.role === "partner"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {entity.role === "customer" && <User className="h-2.5 w-2.5" />}
                          {entity.role === "partner" && <Building2 className="h-2.5 w-2.5" />}
                          {entity.role === "rider" && <Truck className="h-2.5 w-2.5" />}
                          {entity.role === "customer" ? "Customer" : entity.role === "partner" ? "Store Partner" : "Captain"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          {entity.email ? (
                            <div className="text-zinc-700 font-medium flex items-center gap-1.5 font-mono text-[11px]">
                              <AtSign className="h-3 w-3 text-zinc-400" />
                              <span>{entity.email}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-400 italic text-[11px]">No email registered</span>
                          )}
                          {entity.phone && (
                            <div className="text-zinc-500 text-[10px] flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-zinc-400" />
                              <span>{entity.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 font-semibold text-zinc-700">
                          <MapPin className="h-3 w-3 text-zinc-400" />
                          <span>{entity.city || "Kasganj"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[11px]">
                          <span className="text-zinc-400 uppercase font-black text-[10px]">
                            {entity.metricLabel}:
                          </span>{" "}
                          <span className="font-black text-zinc-900 tabular-nums">
                            {entity.metricValue}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleDirectMail(entity)}
                          disabled={!entity.email}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 ml-auto shadow-xs ${
                            entity.email
                              ? "bg-zinc-950 hover:bg-zinc-800 text-white"
                              : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                          }`}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>Compose Mail</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
