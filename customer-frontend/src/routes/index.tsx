import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { restoreCustomerSession, startCustomerAutoRefresh } from "@/api/customer/auth-api";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickPress — Starting up" },
      {
        name: "description",
        content:
          "QuickPress is getting ready: checking your connection and session before taking you to laundry pickup and delivery.",
      },
      { property: "og:title", content: "QuickPress — Starting up" },
      {
        property: "og:description",
        content: "QuickPress is getting ready before taking you to pickup and delivery.",
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
    let stopRefresh: (() => void) | undefined;
    Promise.all([
      initializeApp(),
      // Ultra-fast smooth entry
      new Promise((resolve) => setTimeout(resolve, 200)),
    ]).then(([{ loggedIn }]) => {
      if (cancelled) return;
      if (loggedIn) stopRefresh = startCustomerAutoRefresh();
      navigate({ to: loggedIn ? "/home" : "/login", replace: true });
    });
    return () => {
      cancelled = true;
      stopRefresh?.();
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
