import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { restoreCustomerSession, startCustomerAutoRefresh } from "@/api/customer/auth-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickPress | Best Laundry Service, Dry Cleaning & Doorstep Delivery" },
      {
        name: "description",
        content:
          "QuickPress is India's leading on-demand laundry and garment care marketplace. 15-minute doorstep pickup, hygienic RO-wash, steam iron, and 24h delivery across India.",
      },
      {
        name: "keywords",
        content:
          "laundry service near me, dry cleaners near me, best laundry service Kasganj, online laundry pickup and delivery, steam iron near me, wash and fold per kg, shoe dry cleaning, saree dry clean, quickpress laundry",
      },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "QuickPress" },
      { property: "og:url", content: "https://withquickpress.com/" },
      { property: "og:title", content: "QuickPress — Best Laundry & Dry Cleaning (Doorstep Pickup & Delivery)" },
      {
        property: "og:description",
        content: "Top-rated on-demand laundry and garment care with 15-minute doorstep pickup, live GPS tracking, and 24h delivery. Book online starting at ₹29!",
      },
      { property: "og:image", content: "https://withquickpress.com/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "QuickPress | On-Demand Laundry & Garment Care" },
      {
        name: "twitter:description",
        content: "India's hyper-local laundry marketplace starting at ₹29. Fast pickup & doorstep delivery!",
      },
      { name: "twitter:image", content: "https://withquickpress.com/og-image.jpg" },
    ],
    links: [
      { rel: "canonical", href: "https://withquickpress.com/" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "DryCleaningOrLaundry",
          "name": "QuickPress",
          "legalName": "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED",
          "url": "https://withquickpress.com",
          "logo": "https://withquickpress.com/quickpress-logo-yellow.jpg",
          "telephone": "+919258730561",
          "email": "info@withquickpress.com",
          "priceRange": "₹29 - ₹499",
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.9",
            "reviewCount": "1280",
            "bestRating": "5",
            "worstRating": "1"
          },
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "Kasganj",
            "addressRegion": "Uttar Pradesh",
            "postalCode": "207123",
            "addressCountry": "IN"
          }
        }),
      },
    ],
  }),
  component: SplashScreen,
});

type InitResult = { loggedIn: boolean };

async function initializeApp(): Promise<InitResult> {
  // Check internet
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    await new Promise((resolve) => {
      window.addEventListener("online", resolve, { once: true });
    });
  }

  // Restore the remembered session: Firebase user + stored QuickPress JWT,
  // refreshing the access token when it has already expired.
  let loggedIn = false;
  try {
    loggedIn = (await restoreCustomerSession()) !== null;
  } catch {
    loggedIn = false;
  }

  return { loggedIn };
}

function SplashScreen() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      initializeApp(),
      // Ultra-fast smooth entry
      new Promise((resolve) => setTimeout(resolve, 200)),
    ]).then(([{ loggedIn }]) => {
      if (cancelled) return;
      navigate({ to: loggedIn ? "/home" : "/login", replace: true });
    });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-white px-6">
      <div
        className="relative flex flex-col items-center transition-opacity duration-500"
        style={{ opacity: visible ? 1 : 0 }}
      >
        <h1 className="splash-mark relative text-[3rem] font-black leading-none tracking-[-0.05em] sm:text-[3.75rem]">
          <span className="text-zinc-950 font-black">Quick</span>
          <span className="text-emerald-600 font-black">Press</span>
        </h1>

        <p className="splash-rise mt-4 text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500">
          Laundry · Pickup · Delivery
        </p>

        <span className="splash-rise mt-7 block h-1.5 w-28 overflow-hidden rounded-full bg-zinc-100 border border-zinc-200/80">
          <span className="splash-bar block h-full w-1/3 rounded-full bg-emerald-600" />
        </span>
      </div>

      <p
        className="absolute bottom-12 text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-400 transition-opacity delay-300 duration-700"
        style={{ opacity: visible ? 1 : 0 }}
      >
        Fastest laundry, delivered
      </p>
    </main>
  );
}
