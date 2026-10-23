import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Search,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  Calendar,
  Truck,
  FileText,
  User,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Filter,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

export interface B2BPartnerLeadItem {
  id: string;
  b2bId: string;
  businessName: string;
  category: string;
  address: string;
  city: string;
  pincode: string;
  unitsCount?: string;
  contactName: string;
  designation: string;
  phone: string;
  whatsapp?: string;
  email: string;
  dailyVolume: string;
  frequency: string;
  services: string[];
  sla?: string;
  gstin?: string;
  pan?: string;
  billingModel?: string;
  creditTerms?: string;
  trialRequested: boolean;
  trialDate?: string;
  specialNotes?: string;
  status: "NEW_INQUIRY" | "CONTACTED" | "TRIAL_SCHEDULED" | "CONTRACT_ACTIVE" | "CLOSED";
  accountManager?: string;
  contactLogs?: Array<{ timestamp: string; note: string; status: string; manager: string }>;
  createdAt: string;
}

// Sample initial institutional contracts for demo & testing if DB is empty
const SEED_B2B_PARTNERS: B2BPartnerLeadItem[] = [
  {
    id: "QP-B2B-849201",
    b2bId: "QP-B2B-849201",
    businessName: "The Grand Heritage Hotel & Suites",
    category: "Hotels & Hospitality",
    address: "Civil Lines, Near Bilram Gate",
    city: "Kasganj",
    pincode: "207123",
    unitsCount: "1 Location",
    contactName: "Vikram Singhania",
    designation: "General Manager",
    phone: "9876543210",
    whatsapp: "9876543210",
    email: "gm@grandheritagehotel.com",
    dailyVolume: "150 - 500 kg / day",
    frequency: "Daily 2x (Morning & Evening)",
    services: [
      "Commercial Bed Linen & Bath Towels (Flatwork Steam Iron)",
      "High-Pressure Roller Calendaring Flatwork Press",
    ],
    sla: "24 Hours Express Turnaround",
    gstin: "09AAACH7821K1Z4",
    pan: "AAACH7821K",
    billingModel: "Per Kg Weight Basis",
    creditTerms: "Weekly Invoicing",
    trialRequested: true,
    trialDate: "2026-10-25",
    specialNotes: "High-thread-count Egyptian cotton bedsheets. Require starching and shrink-wrapped bundles.",
    status: "NEW_INQUIRY",
    accountManager: "Corporate Relations Desk",
    contactLogs: [],
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "QP-B2B-631092",
    b2bId: "QP-B2B-631092",
    businessName: "City Care Multi-Specialty Hospital",
    category: "Hospitals & Healthcare",
    address: "GT Road, Sector 4",
    city: "Aligarh",
    pincode: "202001",
    unitsCount: "2 Locations",
    contactName: "Dr. Arvind Mehta",
    designation: "Operations Director",
    phone: "9837123456",
    whatsapp: "9837123456",
    email: "admin@citycarehospital.in",
    dailyVolume: "500 - 1,500+ kg / day",
    frequency: "Daily 2x (Morning & Evening)",
    services: [
      "Medical Grade 80°C Thermal Anti-Bacterial Sanitization",
      "Commercial Bed Linen & Bath Towels (Flatwork Steam Iron)",
    ],
    sla: "24 Hours Express Turnaround",
    gstin: "09BBAAC9012M1Z2",
    pan: "BBAAC9012M",
    billingModel: "Per Kg Weight Basis",
    creditTerms: "Net 30 Days Monthly Invoicing",
    trialRequested: true,
    trialDate: "2026-10-24",
    specialNotes: "Strict medical sanitization with thermal test certification report per batch.",
    status: "TRIAL_SCHEDULED",
    accountManager: "Aman Saxena",
    contactLogs: [
      {
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        note: "Called Operations Director Dr. Mehta. Scheduled 40kg sample wash pickup for OT gowns.",
        status: "TRIAL_SCHEDULED",
        manager: "Aman Saxena",
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

async function fetchB2BPartnersApi(): Promise<B2BPartnerLeadItem[]> {
  try {
    const res = await fetch("/api/b2b/partners");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        return data.items;
      }
    }
  } catch {
    // ignore network errors and fallback
  }

  // Fallback to local storage + seed items
  try {
    const local = JSON.parse(localStorage.getItem("qp_b2b_leads") || "[]");
    const merged = [...local, ...SEED_B2B_PARTNERS];
    // Deduplicate by b2bId
    const seen = new Set<string>();
    return merged.filter((item) => {
      const key = item.b2bId || item.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  } catch {
    return SEED_B2B_PARTNERS;
  }
}

export function B2BPartnersBox() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Selected Lead Modal State
  const [selectedLead, setSelectedLead] = useState<B2BPartnerLeadItem | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [newStatus, setNewStatus] = useState<string>("NEW_INQUIRY");
  const [accountManager, setAccountManager] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: b2bItems = [], isLoading, refetch } = useQuery({
    queryKey: ["admin", "b2b_partners"],
    queryFn: fetchB2BPartnersApi,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      b2bId,
      status,
      notes,
      manager,
    }: {
      b2bId: string;
      status: string;
      notes: string;
      manager: string;
    }) => {
      // 1. Try API call
      try {
        await fetch(`/api/b2b/partners/${b2bId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, notes, accountManager: manager }),
        });
      } catch {
        // ignore
      }

      // 2. Also update in localStorage for seamless instant UI
      try {
        const local = JSON.parse(localStorage.getItem("qp_b2b_leads") || "[]");
        const idx = local.findIndex((l: B2BPartnerLeadItem) => (l.b2bId || l.id) === b2bId);
        if (idx >= 0) {
          local[idx].status = status;
          if (manager) local[idx].accountManager = manager;
          if (notes) {
            local[idx].contactLogs = local[idx].contactLogs || [];
            local[idx].contactLogs.push({
              timestamp: new Date().toISOString(),
              note: notes,
              status,
              manager: manager || "Admin",
            });
          }
          localStorage.setItem("qp_b2b_leads", JSON.stringify(local));
        }
      } catch {
        // ignore
      }
    },
    onSuccess: () => {
      toast.success("B2B Partner status & contact notes updated successfully!");
      setSelectedLead(null);
      setStatusNote("");
      queryClient.invalidateQueries({ queryKey: ["admin", "b2b_partners"] });
    },
    onError: () => {
      toast.error("Failed to update status.");
    },
  });

  const filteredItems = useMemo(() => {
    return b2bItems.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          item.b2bId.toLowerCase().includes(q) ||
          item.businessName.toLowerCase().includes(q) ||
          item.contactName.toLowerCase().includes(q) ||
          item.phone.includes(q) ||
          item.city.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (selectedStatus !== "all" && item.status !== selectedStatus) return false;
      return true;
    });
  }, [b2bItems, searchQuery, selectedCategory, selectedStatus]);

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = b2bItems.length;
    const newLeads = b2bItems.filter((i) => i.status === "NEW_INQUIRY").length;
    const trials = b2bItems.filter((i) => i.status === "TRIAL_SCHEDULED" || i.trialRequested).length;
    const activeContracts = b2bItems.filter((i) => i.status === "CONTRACT_ACTIVE").length;
    return { total, newLeads, trials, activeContracts };
  }, [b2bItems]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openManageModal = (lead: B2BPartnerLeadItem) => {
    setSelectedLead(lead);
    setNewStatus(lead.status);
    setAccountManager(lead.accountManager || "Aman Saxena");
    setStatusNote("");
  };

  return (
    <div className="space-y-6">
      {/* ── KPI Stat Cards (Crisp High-Contrast Monospace) ─────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono font-bold uppercase">
            <span>Total B2B Partners</span>
            <Building2 className="w-4 h-4 text-zinc-700" />
          </div>
          <div className="mt-2 text-2xl font-black text-zinc-950 font-mono">
            {metrics.total}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-medium">Hotels, Hospitals & PGs</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono font-bold uppercase">
            <span>Pending Contact</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 font-mono">
            {metrics.newLeads}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-medium">New registrations awaiting call</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono font-bold uppercase">
            <span>Free Trial Lots</span>
            <Truck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-blue-600 font-mono">
            {metrics.trials}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-medium">Sample test lots scheduled</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono font-bold uppercase">
            <span>Active Contracts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 font-mono">
            {metrics.activeContracts}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-medium">Daily bulk logistics active</div>
        </div>
      </div>

      {/* ── Search & Filter Controls ────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
            <Input
              type="text"
              placeholder="Search by B2B ID, Business, Name, City..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs bg-zinc-50/70 border-zinc-200 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium bg-zinc-50 text-zinc-700 focus:outline-none"
            >
              <option value="all">All Industries</option>
              <option value="Hotels & Hospitality">Hotels & Hospitality</option>
              <option value="Hospitals & Healthcare">Hospitals & Healthcare</option>
              <option value="Hostels & Universities">Hostels & Universities</option>
              <option value="Restaurants & Banquets">Restaurants & Banquets</option>
              <option value="Salons & Spas">Salons & Spas</option>
              <option value="Corporate & Industrial">Corporate & Industrial</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-medium bg-zinc-50 text-zinc-700 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="NEW_INQUIRY">New Inquiry</option>
              <option value="CONTACTED">Contacted</option>
              <option value="TRIAL_SCHEDULED">Trial Scheduled</option>
              <option value="CONTRACT_ACTIVE">Contract Active</option>
              <option value="CLOSED">Closed / Inactive</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8.5 rounded-xl text-xs font-bold gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* ── B2B Partners Table ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-zinc-800" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900 font-mono">
              B2B Bulk Order Partners & Leads ({filteredItems.length})
            </h3>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            Direct 1-Click Call, WhatsApp & Email Available
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-xs">
            <Building2 className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
            <span>No B2B partner registrations match the current filters.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">B2B Unique ID</th>
                  <th className="py-3 px-4">Enterprise Name & Category</th>
                  <th className="py-3 px-4">Authorized Contact (SPOC)</th>
                  <th className="py-3 px-4">Direct Contact Actions</th>
                  <th className="py-3 px-4">Daily Volume & Frequency</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredItems.map((lead) => {
                  const cleanPhone = lead.phone.replace(/[^0-9]/g, "");
                  const whatsappPhone = (lead.whatsapp || lead.phone).replace(/[^0-9]/g, "");
                  const whatsappMsg = encodeURIComponent(
                    `Hello ${lead.contactName}, this is QuickPress Corporate Operations regarding your B2B Bulk Laundry inquiry for ${lead.businessName} (Ref: ${lead.b2bId}).`
                  );

                  return (
                    <tr key={lead.b2bId || lead.id} className="hover:bg-zinc-50/60 transition-colors">
                      {/* B2B ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-zinc-900">
                        <div className="flex items-center gap-1.5">
                          <span>{lead.b2bId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyId(lead.b2bId)}
                            title="Copy ID"
                            className="p-1 text-zinc-400 hover:text-black cursor-pointer"
                          >
                            {copiedId === lead.b2bId ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-zinc-400 font-normal block mt-0.5">
                          {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString("en-IN") : "Recent"}
                        </span>
                      </td>

                      {/* Enterprise Name & Category */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900">{lead.businessName}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-medium border border-zinc-200">
                            {lead.category}
                          </span>
                          <span className="text-zinc-400 text-[10px]">
                            {lead.city} • {lead.unitsCount || "1 Unit"}
                          </span>
                        </div>
                      </td>

                      {/* Contact SPOC */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900">{lead.contactName}</div>
                        <div className="text-[11px] text-zinc-500">{lead.designation}</div>
                        <div className="text-[11px] text-zinc-600 font-mono mt-0.5">{lead.email}</div>
                      </td>

                      {/* 1-Click Direct Contact Buttons */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {/* Direct Call Button */}
                          <a
                            href={`tel:+91${cleanPhone}`}
                            title={`Call ${lead.contactName} at ${lead.phone}`}
                            className="p-2 rounded-lg bg-zinc-100 hover:bg-emerald-600 hover:text-white text-zinc-700 border border-zinc-200 transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>

                          {/* Direct WhatsApp Button */}
                          <a
                            href={`https://wa.me/91${whatsappPhone}?text=${whatsappMsg}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Send WhatsApp message to ${lead.contactName}`}
                            className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-200 transition-colors"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </a>

                          {/* Direct Email Button */}
                          <a
                            href={`mailto:${lead.email}?subject=${encodeURIComponent(
                              `QuickPress B2B Laundry Quotation & SLA — Ref ${lead.b2bId}`
                            )}`}
                            title={`Send official quotation email to ${lead.email}`}
                            className="p-2 rounded-lg bg-zinc-100 hover:bg-black hover:text-white text-zinc-700 border border-zinc-200 transition-colors"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Volume & Frequency */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900 font-mono">{lead.dailyVolume}</div>
                        <div className="text-[11px] text-zinc-500">{lead.frequency}</div>
                        {lead.trialRequested && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            Sample Lot: {lead.trialDate || "Requested"}
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                            lead.status === "NEW_INQUIRY"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : lead.status === "CONTACTED"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : lead.status === "TRIAL_SCHEDULED"
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : lead.status === "CONTRACT_ACTIVE"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-zinc-100 text-zinc-700 border border-zinc-200"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          <span>{lead.status.replace("_", " ")}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openManageModal(lead)}
                          className="h-8 rounded-xl text-xs font-bold border-zinc-200 hover:bg-zinc-100"
                        >
                          <span>Manage</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Status Management & Notes Dialog ─────────────────────────────────── */}
      {selectedLead && (
        <Dialog open={Boolean(selectedLead)} onOpenChange={() => setSelectedLead(null)}>
          <DialogContent className="max-w-xl bg-white border border-zinc-200 shadow-2xl rounded-3xl p-6">
            <DialogHeader>
              <div className="flex items-center gap-2 text-zinc-500 font-mono text-xs uppercase mb-1">
                <span>B2B LEAD DOSSIER</span>
                <span>•</span>
                <span className="font-bold text-black">{selectedLead.b2bId}</span>
              </div>
              <DialogTitle className="text-xl font-black text-zinc-950 font-mono">
                {selectedLead.businessName}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                {selectedLead.category} • {selectedLead.city} • {selectedLead.address}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-2 text-xs">
              {/* Client Info Grid */}
              <div className="grid grid-cols-2 gap-2.5 p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200 font-mono">
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase">Contact Person</span>
                  <span className="font-bold text-zinc-900">{selectedLead.contactName} ({selectedLead.designation})</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase">Phone / WhatsApp</span>
                  <span className="font-bold text-zinc-900">{selectedLead.phone}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase">Daily Volume</span>
                  <span className="font-bold text-zinc-900">{selectedLead.dailyVolume}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] uppercase">GSTIN / Tax</span>
                  <span className="font-bold text-zinc-900">{selectedLead.gstin || "Unregistered / Composition"}</span>
                </div>
              </div>

              {selectedLead.specialNotes && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  <span className="font-bold block uppercase text-[10px] font-mono mb-0.5">Special Instructions:</span>
                  {selectedLead.specialNotes}
                </div>
              )}

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                  Update Lead / Contract Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium bg-white focus:outline-none"
                >
                  <option value="NEW_INQUIRY">NEW INQUIRY (Awaiting Call)</option>
                  <option value="CONTACTED">CONTACTED (Discussion in progress)</option>
                  <option value="TRIAL_SCHEDULED">TRIAL SCHEDULED (Sample wash in transit)</option>
                  <option value="CONTRACT_ACTIVE">CONTRACT ACTIVE (Regular bulk dispatch)</option>
                  <option value="CLOSED">CLOSED (Not interested / archived)</option>
                </select>
              </div>

              {/* Account Manager Assignment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                  Assigned Key Account Manager
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aman Saxena / Vikram Mehta"
                  value={accountManager}
                  onChange={(e) => setAccountManager(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium bg-white focus:outline-none"
                />
              </div>

              {/* Discussion Note */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-800 mb-1.5 font-mono">
                  Add Conversation Note / Meeting Remarks
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Spoke with GM. They need 250kg daily linen wash. Free trial scheduled for Thursday."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-300 text-xs font-medium bg-white focus:outline-none"
                />
              </div>

              {/* Past Contact Logs */}
              {selectedLead.contactLogs && selectedLead.contactLogs.length > 0 && (
                <div>
                  <span className="font-bold text-[10px] uppercase font-mono text-zinc-400 block mb-1.5">
                    Discussion History ({selectedLead.contactLogs.length})
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {selectedLead.contactLogs.map((log, idx) => (
                      <div key={idx} className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px]">
                        <div className="flex justify-between text-zinc-400 text-[10px] font-mono">
                          <span>{log.manager}</span>
                          <span>{new Date(log.timestamp).toLocaleString("en-IN")}</span>
                        </div>
                        <p className="text-zinc-800 font-medium mt-0.5">{log.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLead(null)}
                className="rounded-xl text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={updateStatusMutation.isPending}
                onClick={() =>
                  updateStatusMutation.mutate({
                    b2bId: selectedLead.b2bId,
                    status: newStatus,
                    notes: statusNote,
                    manager: accountManager,
                  })
                }
                className="bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold"
              >
                {updateStatusMutation.isPending ? "Saving..." : "Save Status & Notes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
