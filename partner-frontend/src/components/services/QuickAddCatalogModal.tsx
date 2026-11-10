import {
  Check,
  Clock,
  Layers,
  Plus,
  Search,
  Shirt,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

import { usePartnerServices } from "../../context/PartnerServicesContext";
import { partnerRoutes } from "../../navigation/partner-routes";
import type { ServiceCategoryId } from "../../data/partner-services-mock";

type CatalogTemplate = {
  id: string;
  name: string;
  category: ServiceCategoryId;
  categoryName: string;
  iconEmoji: string;
  price: number;
  unit: "kg" | "piece" | "pair" | "fixed";
  estimatedHours: number;
  description: string;
  minOrderValue: number;
};

export const STANDARD_CATALOG: CatalogTemplate[] = [
  
  {
    id: "std-iron-shirt",
    name: "Shirt Steam Iron",
    category: "iron",
    categoryName: "Steam Iron",
    iconEmoji: "",
    price: 15,
    unit: "piece",
    estimatedHours: 12,
    description: "Crisp wrinkle-free hanger finish for formal and casual shirts.",
    minOrderValue: 45,
  },
  {
    id: "std-iron-tshirt",
    name: "T-Shirt Steam Iron",
    category: "iron",
    categoryName: "Steam Iron",
    iconEmoji: "",
    price: 12,
    unit: "piece",
    estimatedHours: 12,
    description: "Gentle temperature-controlled steam press for cotton and polo tees.",
    minOrderValue: 36,
  },
  {
    id: "std-iron-trouser",
    name: "Trouser / Jeans Steam Iron",
    category: "iron",
    categoryName: "Steam Iron",
    iconEmoji: "",
    price: 15,
    unit: "piece",
    estimatedHours: 12,
    description: "Sharp razor creases and flat line press for pants and denim.",
    minOrderValue: 45,
  },
  {
    id: "std-iron-kurta",
    name: "Kurta / Pyjama Steam Iron",
    category: "iron",
    categoryName: "Steam Iron",
    iconEmoji: "",
    price: 25,
    unit: "piece",
    estimatedHours: 12,
    description: "Traditional ethnic wear wrinkle-free steam pressing.",
    minOrderValue: 50,
  },
  {
    id: "std-iron-saree",
    name: "Saree Steam Press",
    category: "iron",
    categoryName: "Steam Iron",
    iconEmoji: "",
    price: 59,
    unit: "piece",
    estimatedHours: 12,
    description: "Delicate temperature steam finish with roller packaging.",
    minOrderValue: 59,
  },
  {
    id: "std-iron-blazer",
    name: "Blazer / Coat Steam Iron",
    category: "iron",
    categoryName: "Steam Iron",
    iconEmoji: "",
    price: 69,
    unit: "piece",
    estimatedHours: 12,
    description: "Form-retaining 3D vertical steam pressing for coats.",
    minOrderValue: 69,
  },
  {
    id: "std-iron-bedsheet",
    name: "Bedsheet Steam Iron",
    category: "iron",
    categoryName: "Steam Iron",
    iconEmoji: "",
    price: 29,
    unit: "piece",
    estimatedHours: 12,
    description: "Large flat linen steam press and crisp hotel-fold.",
    minOrderValue: 58,
  },

  
  {
    id: "std-dc-shirt",
    name: "Shirt Dry Clean",
    category: "dry-clean",
    categoryName: "Dry Clean",
    iconEmoji: "",
    price: 79,
    unit: "piece",
    estimatedHours: 36,
    description: "Eco-friendly solvent stain removal and crisp collar finish.",
    minOrderValue: 149,
  },
  {
    id: "std-dc-trouser",
    name: "Trouser / Jeans Dry Clean",
    category: "dry-clean",
    categoryName: "Dry Clean",
    iconEmoji: "",
    price: 79,
    unit: "piece",
    estimatedHours: 36,
    description: "Deep solvent cleaning, spot treatment and sharp creasing.",
    minOrderValue: 149,
  },
  {
    id: "std-dc-suit2",
    name: "2-Piece Suit Dry Clean",
    category: "dry-clean",
    categoryName: "Dry Clean",
    iconEmoji: "",
    price: 249,
    unit: "piece",
    estimatedHours: 48,
    description: "Blazer + Trouser tailored luxury solvent care and hanger pack.",
    minOrderValue: 249,
  },
  {
    id: "std-dc-suit3",
    name: "3-Piece Suit Dry Clean",
    category: "dry-clean",
    categoryName: "Dry Clean",
    iconEmoji: "",
    price: 349,
    unit: "piece",
    estimatedHours: 48,
    description: "Jacket + Waistcoat + Trouser complete executive dry clean.",
    minOrderValue: 349,
  },
  {
    id: "std-dc-blazer",
    name: "Blazer / Coat Dry Clean",
    category: "dry-clean",
    categoryName: "Dry Clean",
    iconEmoji: "",
    price: 149,
    unit: "piece",
    estimatedHours: 48,
    description: "Solvent stain removal and shape preservation for suits.",
    minOrderValue: 149,
  },
  {
    id: "std-dc-jacket",
    name: "Winter Jacket / Bomber Dry Clean",
    category: "dry-clean",
    categoryName: "Dry Clean",
    iconEmoji: "",
    price: 199,
    unit: "piece",
    estimatedHours: 48,
    description: "Padded and down jacket deep soil and grime extraction.",
    minOrderValue: 199,
  },
  {
    id: "std-dc-woolen",
    name: "Woolen Sweater / Cardigan Dry Clean",
    category: "dry-clean",
    categoryName: "Dry Clean",
    iconEmoji: "",
    price: 119,
    unit: "piece",
    estimatedHours: 36,
    description: "Anti-shrink pure wool cleaning and de-pilling treatment.",
    minOrderValue: 119,
  },
  {
    id: "std-dc-sherwani",
    name: "Sherwani / Indo-Western Dry Clean",
    category: "dry-clean",
    categoryName: "Dry Clean",
    iconEmoji: "",
    price: 399,
    unit: "piece",
    estimatedHours: 48,
    description: "Heavy bridal and wedding wear solvent spa with bead care.",
    minOrderValue: 399,
  },

  
  {
    id: "std-wf-kg",
    name: "Wash & Fold (Per Kg)",
    category: "wash",
    categoryName: "Wash & Fold",
    iconEmoji: "",
    price: 79,
    unit: "kg",
    estimatedHours: 24,
    description: "Daily wear clothes washed, tumble dried & neatly folded.",
    minOrderValue: 199,
  },
  {
    id: "std-wi-kg",
    name: "Wash & Steam Iron (Per Kg)",
    category: "wash",
    categoryName: "Wash & Fold",
    iconEmoji: "",
    price: 99,
    unit: "kg",
    estimatedHours: 24,
    description: "Wash with fabric conditioner & professional steam ironing.",
    minOrderValue: 199,
  },
  {
    id: "std-wf-bedsheet",
    name: "Bed Sheet Wash & Fold",
    category: "wash",
    categoryName: "Wash & Fold",
    iconEmoji: "",
    price: 59,
    unit: "piece",
    estimatedHours: 24,
    description: "Hygienic warm water sanitization and neat folding.",
    minOrderValue: 99,
  },
  {
    id: "std-wf-towel",
    name: "Towel & Bath Linen Wash",
    category: "wash",
    categoryName: "Wash & Fold",
    iconEmoji: "",
    price: 29,
    unit: "piece",
    estimatedHours: 24,
    description: "Deep disinfectant wash and extra fluff drying.",
    minOrderValue: 58,
  },

  
  {
    id: "std-prem-saree",
    name: "Silk Saree Dry Clean & Roll Polish",
    category: "premium",
    categoryName: "Premium",
    iconEmoji: "",
    price: 249,
    unit: "piece",
    estimatedHours: 48,
    description: "Delicate pure silk wash, stain removal and roll polish finish.",
    minOrderValue: 249,
  },
  {
    id: "std-prem-lehenga",
    name: "Heavy Zari / Bridal Lehenga Spa",
    category: "premium",
    categoryName: "Premium",
    iconEmoji: "",
    price: 499,
    unit: "piece",
    estimatedHours: 72,
    description: "Delicate stone and zari embroidery protection with hand finishing.",
    minOrderValue: 499,
  },
  {
    id: "std-prem-gown",
    name: "Designer Gown / Anarkali Dry Clean",
    category: "premium",
    categoryName: "Premium",
    iconEmoji: "",
    price: 299,
    unit: "piece",
    estimatedHours: 48,
    description: "Multi-layer delicate fabric solvent extraction.",
    minOrderValue: 299,
  },

  
  {
    id: "std-shoe-sneaker",
    name: "Sneakers & Sports Shoes Deep Clean",
    category: "shoe-care",
    categoryName: "Shoe Care",
    iconEmoji: "",
    price: 249,
    unit: "pair",
    estimatedHours: 48,
    description: "Deep sonic foam scrubbing, deodorizing and sole whitening.",
    minOrderValue: 249,
  },
  {
    id: "std-shoe-leather",
    name: "Leather Shoes Cleaning & Polish",
    category: "shoe-care",
    categoryName: "Shoe Care",
    iconEmoji: "",
    price: 299,
    unit: "pair",
    estimatedHours: 48,
    description: "Wax buffing, leather cream nourishment and mirror shine.",
    minOrderValue: 299,
  },
  {
    id: "std-shoe-bag",
    name: "Backpack & Handbag Cleaning",
    category: "shoe-care",
    categoryName: "Shoe Care",
    iconEmoji: "",
    price: 199,
    unit: "piece",
    estimatedHours: 48,
    description: "Deep soil extraction, zipper conditioning and fabric sanitization.",
    minOrderValue: 199,
  },

  
  {
    id: "std-home-blanket-single",
    name: "Single Blanket / Quilt Wash",
    category: "home-care",
    categoryName: "Home Care",
    iconEmoji: "",
    price: 249,
    unit: "piece",
    estimatedHours: 48,
    description: "Winter comforter sanitized, washed & sun fluff-dried.",
    minOrderValue: 249,
  },
  {
    id: "std-home-blanket-double",
    name: "Double Blanket / Heavy Rajai Wash",
    category: "home-care",
    categoryName: "Home Care",
    iconEmoji: "",
    price: 349,
    unit: "piece",
    estimatedHours: 48,
    description: "Heavy double winter quilt deep allergen extraction.",
    minOrderValue: 349,
  },
  {
    id: "std-home-curtain",
    name: "Curtain Cleaning (Per Panel)",
    category: "home-care",
    categoryName: "Home Care",
    iconEmoji: "",
    price: 199,
    unit: "piece",
    estimatedHours: 36,
    description: "Dust-free steam extraction and anti-shrink washing.",
    minOrderValue: 199,
  },
  {
    id: "std-home-carpet",
    name: "Carpet / Rug Deep Shampoo",
    category: "home-care",
    categoryName: "Home Care",
    iconEmoji: "",
    price: 449,
    unit: "piece",
    estimatedHours: 48,
    description: "Industrial fibre deep shampoo wash and stain extraction.",
    minOrderValue: 449,
  },

  
  {
    id: "std-bag-leather-jacket",
    name: "Leather Jacket & Coat Spa",
    category: "leather",
    categoryName: "Bag & Leather Cleaning",
    iconEmoji: "",
    price: 499,
    unit: "piece",
    estimatedHours: 72,
    description: "Deep conditioning, stain removal and leather nourishment.",
    minOrderValue: 499,
  },
  {
    id: "std-bag-leather-handbag",
    name: "Luxury Handbag & Purse Spa",
    category: "leather",
    categoryName: "Bag & Leather Cleaning",
    iconEmoji: "",
    price: 399,
    unit: "piece",
    estimatedHours: 48,
    description: "Interior sanitization, strap conditioning and hardware polish.",
    minOrderValue: 399,
  },
];

import { fetchMasterCatalogServices } from "@/api/partner/partner-services-api";

export function QuickAddCatalogModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { services, addService } = usePartnerServices();
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [catalogList, setCatalogList] = useState<CatalogTemplate[]>(STANDARD_CATALOG);

  useEffect(() => {
    let alive = true;
    fetchMasterCatalogServices().then((items) => {
      if (alive && items.length > 0) {
        const dynamicTemplates: CatalogTemplate[] = items.map((it) => {
          let category: ServiceCategoryId = "wash";
          const lower = it.name.toLowerCase();
          if (lower.includes("iron")) category = "iron";
          else if (lower.includes("dry")) category = "dry-clean";
          else if (lower.includes("shoe")) category = "shoe-care";
          else if (lower.includes("curtain") || lower.includes("blanket")) category = "home-care";
          else if (lower.includes("express")) category = "wash";
          else if (lower.includes("saree") || lower.includes("silk")) category = "premium";

          return {
            id: `admin-${it.id}`,
            name: it.name,
            category,
            categoryName: it.name,
            iconEmoji: "",
            price: it.price,
            unit: (it.unit as any) || "piece",
            estimatedHours: it.defaultHours || 24,
            description: it.desc || "Professional platform service standard.",
            minOrderValue: it.price,
          };
        });

        // Merge keeping standard fallbacks for any missing items
        const map = new Map<string, CatalogTemplate>();
        for (const t of STANDARD_CATALOG) map.set(t.name.toLowerCase(), t);
        for (const t of dynamicTemplates) map.set(t.name.toLowerCase(), t);
        setCatalogList(Array.from(map.values()));
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const existingNames = useMemo(
    () => new Set(services.map((s) => s.name.trim().toLowerCase())),
    [services],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalogList;
    return catalogList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.categoryName.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [search, catalogList]);

  if (!open) return null;

  const handleAdd = async (tpl: CatalogTemplate) => {
    setAddingId(tpl.id);
    try {
      await addService({
        name: tpl.name,
        category: tpl.category,
        icon: "premium",
        description: tpl.description,
        price: tpl.price,
        unit: tpl.unit,
        estimatedHours: tpl.estimatedHours,
        minOrderValue: tpl.minOrderValue,
        enabled: true,
        imageLabel: null,
      });
      toast.success(`"${tpl.name}" added to your live rate card!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add service");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-overlay-in absolute inset-0 bg-black/50 backdrop-blur-xs"
      />

      <div className="animate-sheet-up relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl border border-zinc-200 bg-white p-5 shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-zinc-900">Add Service to Rate Card</h2>
              <p className="text-[11px] font-medium text-zinc-500">
                Choose standard catalog services or create a custom service
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search & Custom Service CTA */}
        <div className="mt-3.5 space-y-2.5">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search catalog services (e.g. Dry Clean, Iron, Shoes)..."
              className="h-10 w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-xs font-bold text-zinc-900 placeholder:text-zinc-400 focus:border-amber-400 focus:bg-white focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate({ to: partnerRoutes.serviceNew });
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-amber-300 bg-amber-50/70 px-3.5 py-2.5 text-xs font-black text-amber-950 transition-all hover:bg-amber-100 active:scale-[0.98]"
          >
            <span className="flex items-center gap-2">
              <Plus className="size-4 text-amber-700" />
              <span>+ Create Custom Service (Custom Name / Rate)</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Open Form ›</span>
          </button>
        </div>

        {/* Catalog List */}
        <div className="no-scrollbar mt-3 flex-1 overflow-y-auto space-y-2.5 pr-1 py-1">
          {filtered.map((tpl) => {
            const alreadyAdded = existingNames.has(tpl.name.trim().toLowerCase());
            const isAdding = addingId === tpl.id;

            return (
              <div
                key={tpl.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-2xs transition-all hover:border-amber-400/80"
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700">
                    <Shirt className="size-4.5 text-zinc-700" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="truncate text-xs font-black text-zinc-900">{tpl.name}</h4>
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold text-zinc-600">
                        {tpl.categoryName}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-zinc-500">
                      {tpl.description}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-zinc-600">
                      <span className="text-xs font-black text-zinc-950">
                        ₹{tpl.price} <span className="text-[10px] text-zinc-500 font-normal">/{tpl.unit}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3 text-zinc-400" /> {tpl.estimatedHours}h
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  {alreadyAdded ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      <Check className="size-3" /> Added
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isAdding}
                      onClick={() => handleAdd(tpl)}
                      className="flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-black text-zinc-950 shadow-xs transition-transform active:scale-95 hover:bg-amber-300 disabled:opacity-50"
                    >
                      <Plus className="size-3.5" strokeWidth={3} />
                      <span>{isAdding ? "Adding..." : "Add"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-500">
          <span>You can edit prices anytime after adding.</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-zinc-800 hover:text-zinc-950"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
