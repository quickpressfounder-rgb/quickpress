import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BadgePercent,
  Check,
  Copy,
  Crown,
  Gift,
  Loader2,
  PartyPopper,
  Share2,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { BottomNav } from "@/components/home/BottomNav";
import { FloatingCartBar } from "@/components/cart/FloatingCartBar";
import { OffersSkeleton } from "@/components/rewards/RewardsSkeletons";
import { ScratchCard } from "@/components/rewards/ScratchCard";
import { RedeemPointsModal } from "@/components/rewards/RedeemPointsModal";
import { NotificationBellAction, ScreenTopBar } from "@/components/rewards/ScreenTopBar";
import { Toaster } from "@/shared/ui/sonner";
import {
  applyCoupon,
  fetchCoupons,
  fetchOffers,
  scratchLoyaltyCard,
  type Coupon,
  type OfferBanner,
  type ScratchCard as ScratchCardData,
  type SpecialOffer,
} from "@/api/customer/offers-api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

export const Route = createFileRoute("/offers")({
  head: () => ({
    meta: [
      { title: "Offers & Coupons — QuickPress Laundry Deals" },
      {
        name: "description",
        content:
          "Grab QuickPress festival offers, coupon codes, cashback deals, scratch card rewards and loyalty points to save on every laundry pickup.",
      },
      { property: "og:title", content: "Offers & Coupons — QuickPress Laundry Deals" },
      {
        property: "og:description",
        content:
          "Festival offers, coupon codes, scratch card rewards and loyalty points on QuickPress laundry orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OffersScreen,
});

const BANNER_TONE: Record<OfferBanner["tone"], string> = {
  festival: "from-brand-dark via-brand-dark to-brand-green",
  discount: "from-brand-green via-brand-green to-primary",
  cashback: "from-primary via-primary to-brand-green",
};

const OFFER_ICON: Record<SpecialOffer["kind"], typeof Gift> = {
  "first-order": Sparkles,
  referral: Users,
  membership: Crown,
  festival: PartyPopper,
};

function OffersScreen() {
  useAuthGuard();
  const navigate = useNavigate();
  const [banners, setBanners] = useState<OfferBanner[] | null>(null);
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]);
  const [scratchCards, setScratchCards] = useState<ScratchCardData[]>([]);
  const [rewardPoints, setRewardPoints] = useState(0);
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const [activeBanner, setActiveBanner] = useState(0);
  const [isRedeemOpen, setIsRedeemOpen] = useState(false);
  const sliderRef = useRef<HTMLDivElement | null>(null);

  const handleScratch = async (card: ScratchCardData) => {
    try {
      const res = await scratchLoyaltyCard(card.id);
      if (res.ok) {
        setRewardPoints(res.newTotalPoints);
        setScratchCards((prev) =>
          prev.map((c) =>
            c.id === card.id
              ? {
                  ...c,
                  scratched: true,
                  reward: `${res.points} Points`,
                  caption: `Worth ₹${res.rupeeValue.toFixed(2)} cash`,
                }
              : c,
          ),
        );
        toast.success(`🎉 You won ${res.points} Loyalty Points (₹${res.rupeeValue.toFixed(2)})!`, {
          description: "Added to your points balance. Transfer anytime into real wallet money.",
        });
      }
    } catch (err: any) {
      console.error("Failed to scratch card:", err);
      toast.error(err?.message || "Failed to reveal scratch card");
    }
  };

  useEffect(() => {
    let active = true;
    void Promise.all([fetchOffers(), fetchCoupons()])
      .then(([offers, couponList]) => {
        if (!active) return;
        setBanners(offers.banners || []);
        setSpecialOffers(offers.specialOffers || []);
        setScratchCards(offers.scratchCards || []);
        setRewardPoints(offers.rewardPoints || 0);
        setCoupons(couponList || []);
      })
      .catch((err) => {
        console.error("Failed to load offers page:", err);
        if (!active) return;
        setBanners([]);
        setSpecialOffers([]);
        setScratchCards([]);
        setRewardPoints(0);
        setCoupons([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleCopy = async (code: string) => {
    await navigator.clipboard?.writeText(code);
    setCopied(code);
    toast.success(`${code} copied`);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const handleApply = async (coupon: Coupon) => {
    setApplying(coupon.id);
    // TODO: replace with POST /api/coupon/apply
    await applyCoupon(coupon.code);
    setApplying(null);
    toast.success(`${coupon.code} applied to your cart`);
    navigate({ to: "/cart" });
  };

  const handleShare = async (offer: SpecialOffer) => {
    const text = `${offer.title} on QuickPress — ${offer.description}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "QuickPress Offer", text });
        return;
      } catch {
        /* dismissed */
      }
    }
    await navigator.clipboard?.writeText(text);
    toast.success("Offer copied to share");
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden scroll-smooth bg-white dark:bg-zinc-950">
      <div className="relative mx-auto w-full max-w-md">
        <ScreenTopBar title="Offers" action={<NotificationBellAction count={2} />} />

        {!banners || !coupons ? (
          <OffersSkeleton />
        ) : (
          <div className="px-5 pb-32 pt-4">
            {/* Banner slider — GET /api/offers */}
            <section>
              <div
                ref={sliderRef}
                onScroll={(event) => {
                  const el = event.currentTarget;
                  setActiveBanner(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
                }}
                className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth"
              >
                {banners.map((banner) => (
                  <article
                    key={banner.id}
                    className={`relative w-full shrink-0 snap-center overflow-hidden rounded-3xl bg-gradient-to-br p-5 shadow-soft ${BANNER_TONE[banner.tone]}`}
                  >
                    <div className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-background/20 blur-2xl" />
                    <p className="relative text-[0.65rem] font-black uppercase tracking-widest text-background/75">
                      {banner.eyebrow}
                    </p>
                    <h2 className="relative mt-2 text-2xl font-black tracking-tight text-background">
                      {banner.title}
                    </h2>
                    <p className="relative mt-1 text-xs text-background/85">{banner.subtitle}</p>
                    <button
                      type="button"
                      onClick={() => navigate({ to: "/home" })}
                      className="relative mt-4 rounded-full bg-background/20 px-4 py-2 text-[0.7rem] font-black tracking-tight text-background transition-transform duration-300 active:scale-[0.96]"
                    >
                      Book now
                    </button>
                  </article>
                ))}
              </div>

              <div className="mt-3 flex justify-center gap-1.5">
                {banners.map((banner, index) => (
                  <span
                    key={banner.id}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index === activeBanner ? "w-5 bg-primary" : "w-1.5 bg-border"
                    }`}
                  />
                ))}
              </div>
            </section>

            {/* Coupons — GET /api/coupons */}
            <section className="mt-6">
              <h2 className="text-sm font-black tracking-tight text-foreground">
                Coupons for you
              </h2>
              <div className="stagger-children mt-4 space-y-3">
                {coupons.map((coupon, index) => (
                  <article
                    key={coupon.id} className="card-soft relative overflow-hidden border border-border p-4 transition-all duration-300 hover:border-primary/60"
                  >
                    <span className="pointer-events-none absolute -left-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background" />
                    <span className="pointer-events-none absolute -right-3 top-1/2 size-6 -translate-y-1/2 rounded-full bg-background" />

                    <div className="flex items-start gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                        <Ticket className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black tracking-tight text-foreground">
                          {coupon.discount}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {coupon.description} · Min ₹{coupon.minOrder}
                        </p>
                        <p className="mt-1 text-[0.65rem] font-semibold text-brand-green">
                          {coupon.expiry}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center gap-2 border-t border-dashed border-border pt-3">
                      <button
                        type="button"
                        onClick={() => void handleCopy(coupon.code)}
                        className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-2xl border border-dashed border-primary bg-primary/10 px-3 py-2.5 transition-all duration-300 active:scale-[0.97]"
                      >
                        <span className="truncate text-xs font-black tracking-widest text-brand-dark">
                          {coupon.code}
                        </span>
                        {copied === coupon.code ? (
                          <Check className="size-4 shrink-0 text-brand-green" />
                        ) : (
                          <Copy className="size-4 shrink-0 text-brand-dark" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleApply(coupon)}
                        disabled={applying === coupon.id}
                        className="ripple flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-brand-green to-primary px-5 py-2.5 text-xs font-black tracking-tight text-background shadow-cta transition-transform duration-300 active:scale-[0.96] disabled:opacity-70"
                      >
                        {applying === coupon.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : null}
                        Apply
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Special offers */}
            <section className="mt-7">
              <h2 className="text-sm font-black tracking-tight text-foreground">Special offers</h2>
              <div className="stagger-children mt-4 grid grid-cols-2 gap-3">
                {specialOffers.map((offer, index) => {
                  const Icon = OFFER_ICON[offer.kind];
                  return (
                    <article
                      key={offer.id} className="card-soft flex flex-col border border-border p-4 transition-all duration-300 hover:border-primary/60"
                    >
                      <span className="flex size-10 items-center justify-center rounded-2xl bg-secondary/10 text-brand-green">
                        <Icon className="size-5" />
                      </span>
                      <p className="mt-3 text-xs font-black tracking-tight text-foreground">
                        {offer.title}
                      </p>
                      <p className="mt-1 flex-1 text-[0.68rem] leading-relaxed text-muted-foreground">
                        {offer.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[0.6rem] font-bold tracking-tight text-brand-dark">
                          {offer.highlight}
                        </span>
                        <button
                          type="button"
                          aria-label={`Share ${offer.title}`}
                          onClick={() => void handleShare(offer)}
                          className="flex size-8 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-all duration-300 hover:text-foreground active:scale-[0.92]"
                        >
                          <Share2 className="size-4" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* Scratch cards */}
            <section className="mt-7">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black tracking-tight text-foreground">
                    Scratch &amp; Win
                  </h2>
                  <p className="text-[0.68rem] text-muted-foreground">
                    Earned on every delivered laundry order
                  </p>
                </div>
                <span className="flex items-center gap-1 text-[0.68rem] font-semibold text-brand-green bg-brand-green/10 px-2.5 py-0.5 rounded-full">
                  <BadgePercent className="size-3.5" />
                  {scratchCards.filter((c) => !c.scratched).length} available
                </span>
              </div>

              {scratchCards.length === 0 ? (
                <div className="card-soft mt-3 border border-dashed border-border p-5 text-center space-y-2">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                    <Gift className="size-5" />
                  </div>
                  <p className="text-xs font-black text-foreground">No scratch cards yet</p>
                  <p className="text-[0.7rem] text-muted-foreground leading-relaxed">
                    Complete your laundry order to automatically unlock a scratch card upon delivery!
                  </p>
                </div>
              ) : (
                <div className="stagger-children mt-4 grid grid-cols-2 gap-3">
                  {scratchCards.map((card) => (
                    <ScratchCard
                      key={card.id}
                      reward={card.reward}
                      caption={card.caption}
                      isScratched={Boolean(card.scratched)}
                      onRevealed={() => void handleScratch(card)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Loyalty rewards */}
            <section className="card-soft mt-7 border border-border p-5 bg-gradient-to-br from-amber-500/5 via-transparent to-emerald-500/5">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-brand-dark">
                  <Gift className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black tracking-tight text-foreground">
                      Loyalty Rewards
                    </p>
                    <span className="text-[10px] font-black uppercase text-brand-green bg-brand-green/15 px-2 py-0.5 rounded-full">
                      100 pts = ₹10
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    You have <strong className="text-foreground font-black">{rewardPoints.toLocaleString("en-IN")} points</strong>{" "}
                    (worth <strong className="text-brand-green font-black">₹{(rewardPoints / 10).toFixed(2)}</strong> real wallet cash).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRedeemOpen(true)}
                className="ripple mt-4 w-full rounded-full bg-gradient-to-r from-brand-green to-primary py-3.5 text-sm font-black tracking-tight text-background shadow-cta transition-transform duration-300 active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="size-4" />
                <span>Transfer Points to Wallet (Real Money)</span>
              </button>
            </section>
          </div>
        )}
      </div>

      <RedeemPointsModal
        isOpen={isRedeemOpen}
        onClose={() => setIsRedeemOpen(false)}
        currentPoints={rewardPoints}
        onRedeemSuccess={(_redeemed, _rupees, remaining) => {
          setRewardPoints(remaining);
        }}
      />

      <FloatingCartBar />
      <BottomNav active="offers" />
    </main>
  );
}
