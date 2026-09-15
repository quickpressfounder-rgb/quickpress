import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  Clock3,
  Images,
  MapPinned,
  Pencil,
  Sparkles,
  Store,
} from "lucide-react";
import { useState } from "react";

import { Toaster } from "@/shared/ui/sonner";
import { PartnerLayout } from "../components/layout/PartnerLayout";
import { PullToRefresh } from "../components/dashboard/PullToRefresh";
import { SectionHeading } from "../components/PartnerPrimitives";
import { ShopEditSheet } from "../components/shop/ShopEditSheet";
import { ShopGallery } from "../components/shop/ShopGallery";
import { ShopHoursCard } from "../components/shop/ShopHoursCard";
import { ShopProfileHeader } from "../components/shop/ShopProfileHeader";
import { ShopServiceArea } from "../components/shop/ShopServiceArea";
import { ShopProfileSkeleton } from "../components/shop/ShopSkeletons";
import { ShopStatsGrid } from "../components/shop/ShopStatsGrid";
import { ShopStatusSheet } from "../components/shop/ShopStatusSheet";
import { ShopSuccessOverlay } from "../components/shop/ShopSuccessOverlay";
import { PartnerShopProvider, usePartnerShop } from "../context/PartnerShopContext";
import { shopStatusMeta } from "../data/partner-shop-mock";
import { partnerRoutes } from "../navigation/partner-routes";

function SectionIcon({ icon: Icon, color = "bg-emerald-50 text-emerald-700" }: { icon: typeof Store; color?: string }) {
  return (
    <span className={`flex size-8 items-center justify-center rounded-xl ${color} shadow-2xs`}>
      <Icon className="size-4 stroke-[2.2]" />
    </span>
  );
}

function ShopManagementContent() {
  const navigate = useNavigate();
  const {
    profile,
    gallery,
    hours,
    area,
    stats,
    status,
    activeServicesCount,
    isLoading,
    galleryLimit,
    refresh,
    updateProfile,
    setStatus,
    updateHours,
    addImage,
    removeImage,
  } = usePartnerShop();

  const [editOpen, setEditOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <PartnerLayout
      activeTab="profile"
      title="Store Profile & Management"
      subtitle={`${shopStatusMeta(status).label} · ${profile.category || "Laundry Service"}`}
    >
      {/* Mobile Top Sticky Navigation Bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] md:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                navigate({ to: partnerRoutes.profile });
              }
            }}
            className="text-zinc-800 p-1.5 -ml-1.5 rounded-full hover:bg-zinc-100 active:scale-90 transition-all cursor-pointer"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-base font-black tracking-tight text-zinc-900">
            Manage Shop Profile
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-800 active:scale-95 transition-all cursor-pointer"
        >
          <Pencil className="size-3 text-emerald-600" />
          <span>Edit</span>
        </button>
      </header>

      {/* Main Content Area */}
      <div className="mx-auto w-full max-w-7xl px-3.5 py-3 md:px-8 md:py-6">
        <PullToRefresh onRefresh={refresh}>
          {isLoading ? (
            <ShopProfileSkeleton />
          ) : (
            <div className="space-y-4 sm:space-y-6 pb-28 md:pb-12 animate-fade-in">
              {/* 1. Storefront Cover Banner & Identity Hero Card */}
              <ShopProfileHeader
                profile={profile}
                status={status}
                galleryCount={gallery.length}
                onEdit={() => setEditOpen(true)}
                onChangeStatus={() => setStatusOpen(true)}
              />

              {/* 2. Shop Performance Statistics Grid (100% Real DB Data) */}
              <section className="rounded-3xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-sm space-y-3.5">
                <SectionHeading
                  title="Shop Performance & Volume"
                  action={<SectionIcon icon={BarChart3} color="bg-blue-50 text-blue-600" />}
                />
                <ShopStatsGrid stats={stats} />
              </section>

              {/* 3. Catalog & Services Quick Route Card */}
              <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-500/10 via-white to-white p-4 sm:p-5 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                      <Sparkles className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-zinc-900">
                        Catalog & Services Rate Card ({activeServicesCount} Active)
                      </h3>
                      <p className="text-xs font-medium text-zinc-500">
                        Configure pricing, turn on/off wash, iron, and dry clean items
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate({ to: partnerRoutes.services })}
                    className="flex items-center justify-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-xs active:scale-95 transition-all hover:bg-emerald-700 cursor-pointer shrink-0"
                  >
                    <span>Manage Rate Card</span>
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              </div>

              {/* 4. Operating Hours & Service Area (2-column on desktop) */}
              <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                <section className="rounded-3xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-sm space-y-3.5">
                  <SectionHeading
                    title="Operating Hours & Weekly Off"
                    action={<SectionIcon icon={Clock3} color="bg-amber-50 text-amber-700" />}
                  />
                  <ShopHoursCard hours={hours} onSave={updateHours} />
                </section>

                <section className="rounded-3xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-sm space-y-3.5">
                  <SectionHeading
                    title="Pickup & Delivery Area Coverage"
                    action={<SectionIcon icon={MapPinned} color="bg-purple-50 text-purple-700" />}
                  />
                  <ShopServiceArea area={area} />
                </section>
              </div>

              {/* 5. Real Store Photos & Machinery Gallery */}
              <section className="rounded-3xl border border-zinc-200/80 bg-white p-4.5 sm:p-6 shadow-sm space-y-3.5">
                <SectionHeading
                  title="Store Photos & Machinery Showcase"
                  action={<SectionIcon icon={Images} color="bg-teal-50 text-teal-700" />}
                />
                <ShopGallery
                  images={gallery}
                  limit={galleryLimit}
                  onUpload={async (base64) => {
                    const ok = await addImage(base64);
                    if (ok) setSuccess("Photo added to your store gallery");
                    return ok;
                  }}
                  onRemove={async (idOrUrl) => {
                    await removeImage(idOrUrl);
                  }}
                />
              </section>
            </div>
          )}
        </PullToRefresh>
      </div>

      {/* Edit Sheet */}
      {editOpen ? (
        <ShopEditSheet
          profile={profile}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={async (patch) => {
            await updateProfile(patch);
            setEditOpen(false);
            setSuccess("Shop details updated successfully");
          }}
        />
      ) : null}

      {/* Status Sheet */}
      {statusOpen ? (
        <ShopStatusSheet
          current={status}
          onClose={() => setStatusOpen(false)}
          onSelect={(next) => {
            setStatus(next);
            setStatusOpen(false);
            setSuccess(`Status changed to ${shopStatusMeta(next).label}`);
          }}
        />
      ) : null}

      <ShopSuccessOverlay message={success} onDone={() => setSuccess(null)} />
      <Toaster />
    </PartnerLayout>
  );
}

export function ShopManagementScreen() {
  return (
    <PartnerShopProvider>
      <ShopManagementContent />
    </PartnerShopProvider>
  );
}
