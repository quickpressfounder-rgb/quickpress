import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  CheckCircle2,
  Eye,
  RefreshCw,
  Film,
  Gift,
  Link as LinkIcon,
  Layers,
  ArrowRight,
  X,
  Share2,
  Check,
  TrendingUp,
  AlertCircle,
  Smartphone,
  Globe,
} from "lucide-react";
import { toast } from "sonner";

import { AdminShell } from "../components/AdminShell";
import { SectionCard, StatusPill, KpiCard } from "../components/AdminUI";
import {
  fetchAdminStories,
  createAdminStory,
  updateAdminStory,
  deleteAdminStory,
  fetchAdminBanners,
  createAdminBanner,
  updateAdminBanner,
  deleteAdminBanner,
  type AdminStory,
  type AdminBanner,
} from "../api/promotions";
import { adminHead } from "../lib/head";
import { requireAdminSession } from "../lib/require-admin-session";

export const Route = createFileRoute("/promotions")({
  beforeLoad: requireAdminSession,
  head: () =>
    adminHead(
      "Promotions & Stories Hub — Admin",
      "Manage real-time in-app stories, thumbnails, Google Form campaigns, and drawer offer banners across QuickPress apps."
    ),
  component: PromotionsPage,
});

export function PromotionsPage() {
  const [activeTab, setActiveTab] = useState<"stories" | "banners">("stories");
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [banners, setBanners] = useState<AdminBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Story Edit/Create Modal State
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Partial<AdminStory> | null>(null);

  // Banner Edit/Create Modal State
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<AdminBanner> | null>(null);

  // Preview Story in Mobile Frame
  const [previewStory, setPreviewStory] = useState<AdminStory | null>(null);

  const loadData = async (showToast = false) => {
    try {
      setRefreshing(true);
      const [sRes, bRes] = await Promise.all([
        fetchAdminStories(),
        fetchAdminBanners(),
      ]);
      setStories(sRes);
      setBanners(bRes);
      if (showToast) toast.success("Promotions & Stories synced with live DB!");
    } catch {
      toast.error("Failed to fetch promotions. Please check backend connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Story Handlers ---
  const handleOpenCreateStory = (isGoogleForm = false) => {
    setEditingStory({
      title: isGoogleForm ? "Captain Feedback Survey 📝" : "Special Announcement ✨",
      tagline: isGoogleForm ? "Help us improve Kasganj delivery routes" : "Exclusive opportunity for QuickPress riders",
      badge: isGoogleForm ? "GOOGLE FORM" : "FEATURED",
      badgeBg: isGoogleForm ? "bg-blue-600" : "bg-emerald-600",
      gradient: isGoogleForm ? "from-blue-700 via-indigo-900 to-slate-950" : "from-emerald-700 via-teal-800 to-slate-900",
      icon: isGoogleForm ? "📋" : "🚀",
      imageUrl: "",
      points: [
        "Takes less than 2 minutes to complete",
        "Direct input to QuickPress operations team",
        "Win ₹50 wallet credit on verified submission",
      ],
      ctaText: isGoogleForm ? "Open Google Form ➔" : "View Details ➔",
      ctaAction: isGoogleForm ? "https://forms.google.com" : "/wallet",
      actionType: isGoogleForm ? "google_form" : "external_link",
      audience: "riders",
      priority: stories.length + 1,
      isActive: true,
    });
    setIsStoryModalOpen(true);
  };

  const handleEditStory = (story: AdminStory) => {
    setEditingStory({ ...story });
    setIsStoryModalOpen(true);
  };

  const handleSaveStory = async () => {
    if (!editingStory?.title) {
      toast.error("Please enter a title for the story");
      return;
    }

    try {
      if (editingStory._id || editingStory.id) {
        const id = editingStory._id || editingStory.id!;
        await updateAdminStory(id, editingStory);
        toast.success("Story updated successfully!");
      } else {
        await createAdminStory(editingStory as any);
        toast.success("New Story created successfully!");
      }
      setIsStoryModalOpen(false);
      setEditingStory(null);
      await loadData();
    } catch {
      toast.error("Failed to save story. Please try again.");
    }
  };

  const handleDeleteStory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this story?")) return;
    try {
      await deleteAdminStory(id);
      toast.success("Story deleted.");
      await loadData();
    } catch {
      toast.error("Failed to delete story.");
    }
  };

  const handleToggleStoryActive = async (story: AdminStory) => {
    try {
      const nextActive = !story.isActive;
      await updateAdminStory(story._id || story.id, { isActive: nextActive });
      setStories((prev) =>
        prev.map((s) => ((s._id || s.id) === (story._id || story.id) ? { ...s, isActive: nextActive } : s))
      );
      toast.success(`Story ${nextActive ? "activated" : "deactivated"}!`);
    } catch {
      toast.error("Failed to update status.");
    }
  };

  // --- Banner Handlers ---
  const handleOpenCreateBanner = () => {
    setEditingBanner({
      title: "Tap to earn",
      subtitle: "Guaranteed instant cash reward for active duty!",
      badge: "CAPTAIN REWARD",
      badgeColor: "#FFC107",
      theme: "blue_mystery",
      rewardAmount: 10,
      ctaText: "Tap to earn",
      ctaLink: "",
      actionType: "reward_scratch",
      audience: "riders",
      priority: banners.length + 1,
      isActive: true,
    });
    setIsBannerModalOpen(true);
  };

  const handleEditBanner = (banner: AdminBanner) => {
    setEditingBanner({ ...banner });
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async () => {
    if (!editingBanner?.title) {
      toast.error("Please enter a banner title");
      return;
    }

    try {
      if (editingBanner._id || editingBanner.id) {
        const id = editingBanner._id || editingBanner.id!;
        await updateAdminBanner(id, editingBanner);
        toast.success("Offer Banner updated!");
      } else {
        await createAdminBanner(editingBanner as any);
        toast.success("New Offer Banner created!");
      }
      setIsBannerModalOpen(false);
      setEditingBanner(null);
      await loadData();
    } catch {
      toast.error("Failed to save banner.");
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await deleteAdminBanner(id);
      toast.success("Banner deleted.");
      await loadData();
    } catch {
      toast.error("Failed to delete banner.");
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-xs">
                <Sparkles className="size-5" />
              </span>
              <h1 className="text-2xl font-black text-zinc-950 tracking-tight">
                Promotions, Stories & Banners Hub
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Live in-app story reels, thumbnails, Google Forms & drawer mystery banners for Rider and Customer apps.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 active:scale-95 text-xs font-bold text-zinc-800 transition shadow-2xs"
            >
              <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-emerald-600" : ""}`} />
              <span>Refresh</span>
            </button>

            {activeTab === "stories" ? (
              <>
                <button
                  type="button"
                  onClick={() => handleOpenCreateStory(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 active:scale-95 text-xs font-bold transition shadow-2xs"
                >
                  <LinkIcon className="size-3.5" />
                  <span>+ Google Form</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenCreateStory(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white active:scale-95 text-xs font-bold transition shadow-sm"
                >
                  <Plus className="size-3.5" />
                  <span>+ New Story</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleOpenCreateBanner}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white active:scale-95 text-xs font-bold transition shadow-sm"
              >
                <Plus className="size-3.5" />
                <span>+ New Banner</span>
              </button>
            )}
          </div>
        </div>

        {/* Overview KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <KpiCard
            title="Total Stories"
            value={stories.length.toString()}
            hint={`${stories.filter((s) => s.isActive).length} Active in App`}
          />
          <KpiCard
            title="Active Offer Banners"
            value={banners.filter((b) => b.isActive).length.toString()}
            hint="Live in Drawer"
          />
          <KpiCard
            title="External / Forms"
            value={stories.filter((s) => s.ctaAction?.includes("http") || s.actionType === "google_form").length.toString()}
            hint="Google Forms / Links"
          />
          <KpiCard
            title="Target Audience"
            value="Riders & Captains"
            hint="Kasganj Service Zone"
          />
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-200">
          <button
            type="button"
            onClick={() => setActiveTab("stories")}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "stories"
                ? "border-amber-500 text-zinc-950 font-black"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Film className="size-4" />
            <span>App Stories & Bubbles ({stories.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("banners")}
            className={`pb-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "banners"
                ? "border-amber-500 text-zinc-950 font-black"
                : "border-transparent text-zinc-500 hover:text-zinc-800"
            }`}
          >
            <Gift className="size-4" />
            <span>Drawer Offer Banners ({banners.length})</span>
          </button>
        </div>

        {/* TAB 1: STORIES MANAGEMENT */}
        {activeTab === "stories" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stories.map((story, idx) => (
                <div
                  key={story._id || story.id || idx}
                  className={`bg-white rounded-3xl border ${
                    story.isActive ? "border-zinc-200/90 shadow-sm" : "border-zinc-200/50 opacity-60 bg-zinc-50/50"
                  } p-5 flex flex-col justify-between transition hover:shadow-md space-y-4 relative overflow-hidden`}
                >
                  {/* Top Status & Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-zinc-400">#{story.priority || idx + 1}</span>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-white ${
                          story.badgeBg || "bg-blue-600"
                        }`}
                      >
                        {story.badge}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase bg-zinc-100 px-1.5 py-0.5 rounded">
                        {story.audience || "riders"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStoryActive(story)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${
                          story.isActive
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200"
                        }`}
                      >
                        {story.isActive ? "Live ✓" : "Inactive"}
                      </button>
                    </div>
                  </div>

                  {/* Story Card Content Header */}
                  <div className="flex items-start gap-3">
                    <div className="relative size-13 rounded-2xl bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-2xl shadow-2xs shrink-0 overflow-hidden">
                      {story.imageUrl ? (
                        <img src={story.imageUrl} alt={story.title} className="size-full object-cover" />
                      ) : (
                        <span>{story.icon || "✨"}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-black text-zinc-900 truncate">{story.title}</h3>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{story.tagline}</p>
                    </div>
                  </div>

                  {/* Bullet Highlights */}
                  {story.points && story.points.length > 0 && (
                    <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-100 space-y-1.5 text-xs text-zinc-600">
                      {story.points.slice(0, 3).map((pt, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-1.5">
                          <span className="text-emerald-600 font-black">•</span>
                          <span className="truncate">{pt}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Link / CTA Destination */}
                  <div className="pt-1 flex items-center justify-between text-xs border-t border-zinc-100">
                    <div className="flex items-center gap-1.5 text-zinc-600 truncate max-w-[200px]">
                      {story.actionType === "google_form" || story.ctaAction?.includes("forms.gle") ? (
                        <span className="text-blue-600 font-bold flex items-center gap-1">
                          <LinkIcon className="size-3" />
                          <span>Google Form</span>
                        </span>
                      ) : story.actionType === "external_link" ? (
                        <span className="text-purple-600 font-bold flex items-center gap-1">
                          <Globe className="size-3" />
                          <span>External Link</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Smartphone className="size-3" />
                          <span>App Route: {story.ctaAction}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewStory(story)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100"
                        title="Live Mobile Preview"
                      >
                        <Eye className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditStory(story)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100"
                        title="Edit Story"
                      >
                        <Edit3 className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStory(story._id || story.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Delete Story"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: OFFER BANNERS */}
        {activeTab === "banners" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {banners.map((banner, idx) => (
                <div
                  key={banner._id || banner.id || idx}
                  className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-sm space-y-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <span
                      style={{ backgroundColor: banner.badgeColor || "#FFC107" }}
                      className="text-[10px] font-black text-black px-2 py-0.5 rounded-full"
                    >
                      {banner.badge || "OFFER"}
                    </span>
                    <span className="text-xs text-zinc-500 font-bold">Reward: ₹{banner.rewardAmount}</span>
                  </div>

                  {/* Banner Graphic Simulation */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0B2579] to-[#08184C] text-white space-y-2">
                    <h4 className="text-base font-black">{banner.title}</h4>
                    <p className="text-xs text-blue-100">{banner.subtitle}</p>
                    <div className="pt-2 flex justify-center">
                      <span className="px-5 py-1.5 rounded-full bg-amber-400 text-black text-xs font-black shadow-xs">
                        {banner.ctaText}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 text-xs">
                    <span className="text-zinc-500 font-semibold">Priority #{banner.priority}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEditBanner(banner)}
                        className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100"
                      >
                        <Edit3 className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBanner(banner._id || banner.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STORY EDIT / CREATE MODAL */}
        {isStoryModalOpen && editingStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{editingStory.icon || "✨"}</span>
                  <h3 className="text-base font-black text-zinc-950">
                    {editingStory._id ? "Edit Story" : "Create New Story"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStoryModalOpen(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-900 rounded-lg"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                {/* Title */}
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Story Title *</label>
                  <input
                    type="text"
                    value={editingStory.title || ""}
                    onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
                    placeholder="e.g. Join QuickPress Captains 🛵"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 font-semibold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Tagline */}
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Tagline / Subtitle</label>
                  <input
                    type="text"
                    value={editingStory.tagline || ""}
                    onChange={(e) => setEditingStory({ ...editingStory, tagline: e.target.value })}
                    placeholder="e.g. Uttar Pradesh's Fastest Growing Rider Community"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Icon / Emoji & Badge */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">Icon / Emoji</label>
                    <input
                      type="text"
                      value={editingStory.icon || ""}
                      onChange={(e) => setEditingStory({ ...editingStory, icon: e.target.value })}
                      placeholder="🛵, 💰, ⚡, 📋"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-zinc-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">Badge Text</label>
                    <input
                      type="text"
                      value={editingStory.badge || ""}
                      onChange={(e) => setEditingStory({ ...editingStory, badge: e.target.value })}
                      placeholder="e.g. GOOGLE FORM, REFER & EARN"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-zinc-900"
                    />
                  </div>
                </div>

                {/* Action Type & Google Form Link */}
                <div className="space-y-2 bg-blue-50/60 p-3.5 rounded-2xl border border-blue-200/80">
                  <div className="flex items-center justify-between">
                    <label className="font-black text-blue-950 flex items-center gap-1.5">
                      <LinkIcon className="size-3.5 text-blue-600" />
                      <span>Action Type & Destination Link</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <select
                      value={editingStory.actionType || "external_link"}
                      onChange={(e) =>
                        setEditingStory({
                          ...editingStory,
                          actionType: e.target.value as any,
                        })
                      }
                      className="px-2.5 py-2 rounded-xl border border-blue-300 bg-white font-semibold text-zinc-900 text-xs"
                    >
                      <option value="google_form">Google Form (Custom Link)</option>
                      <option value="external_link">External Web Link (URL)</option>
                      <option value="internal_route">App Screen Route (/wallet, /orders)</option>
                      <option value="share">Native Share Dialog</option>
                    </select>

                    <input
                      type="text"
                      value={editingStory.ctaText || ""}
                      onChange={(e) => setEditingStory({ ...editingStory, ctaText: e.target.value })}
                      placeholder="Button Text, e.g. Open Form ➔"
                      className="px-3 py-2 rounded-xl border border-blue-300 bg-white text-zinc-900 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-blue-900 block mt-1.5 mb-1">
                      Destination Link / Google Form URL / App Route:
                    </label>
                    <input
                      type="text"
                      value={editingStory.ctaAction || ""}
                      onChange={(e) => setEditingStory({ ...editingStory, ctaAction: e.target.value })}
                      placeholder="https://forms.google.com/... or /wallet"
                      className="w-full px-3 py-2 rounded-xl border border-blue-300 bg-white font-mono text-zinc-900 text-xs"
                    />
                  </div>
                </div>

                {/* Key Bullet Highlights */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-zinc-700">Bullet Points / Key Features</label>
                    <button
                      type="button"
                      onClick={() =>
                        setEditingStory({
                          ...editingStory,
                          points: [...(editingStory.points || []), "New benefit point"],
                        })
                      }
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
                    >
                      + Add Point
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {(editingStory.points || []).map((pt, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={pt}
                          onChange={(e) => {
                            const copy = [...(editingStory.points || [])];
                            copy[pIdx] = e.target.value;
                            setEditingStory({ ...editingStory, points: copy });
                          }}
                          className="flex-1 px-3 py-1.5 rounded-xl border border-zinc-300 text-zinc-900 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...(editingStory.points || [])];
                            copy.splice(pIdx, 1);
                            setEditingStory({ ...editingStory, points: copy });
                          }}
                          className="size-7 rounded-lg text-zinc-400 hover:text-rose-600 flex items-center justify-center hover:bg-rose-50"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audience & Priority */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">Target Audience</label>
                    <select
                      value={editingStory.audience || "riders"}
                      onChange={(e) => setEditingStory({ ...editingStory, audience: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-zinc-900"
                    >
                      <option value="riders">Riders (Captains)</option>
                      <option value="customers">Customers</option>
                      <option value="partners">Partners</option>
                      <option value="all">Platform Wide (All)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-zinc-700 block mb-1">Display Order (Priority)</label>
                    <input
                      type="number"
                      value={editingStory.priority || 1}
                      onChange={(e) => setEditingStory({ ...editingStory, priority: Number(e.target.value) })}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-zinc-900"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsStoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveStory}
                  className="px-5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs shadow-sm"
                >
                  Save & Publish Story
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LIVE MOBILE STORY PREVIEW MODAL */}
        {previewStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between bg-gradient-to-b from-slate-900 via-indigo-950 to-black text-white p-6 border-4 border-zinc-700">
              <button
                type="button"
                onClick={() => setPreviewStory(null)}
                className="absolute top-4 right-4 size-8 rounded-full bg-white/20 flex items-center justify-center cursor-pointer text-white z-20"
              >
                ✕
              </button>

              <div className="pt-2">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-500 text-white">
                  {previewStory.badge}
                </span>
                <p className="text-xs text-white/70 mt-1 uppercase tracking-wide">Story Preview</p>
              </div>

              <div className="flex flex-col items-center text-center space-y-4 my-auto">
                <div className="size-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center text-4xl border border-white/20">
                  {previewStory.icon || "✨"}
                </div>
                <h2 className="text-xl font-black">{previewStory.title}</h2>
                <p className="text-xs text-white/80">{previewStory.tagline}</p>

                <div className="w-full bg-white/10 rounded-2xl p-3 text-left space-y-1.5 text-xs">
                  {(previewStory.points || []).map((pt, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-emerald-400">✓</span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pb-2">
                <button
                  type="button"
                  className="w-full py-3 rounded-2xl bg-amber-400 text-zinc-950 font-black text-xs shadow-lg"
                >
                  {previewStory.ctaText}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
