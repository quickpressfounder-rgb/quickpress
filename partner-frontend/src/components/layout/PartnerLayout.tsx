import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { Bell, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PartnerSidebar } from "./PartnerSidebar";
import { PartnerDesktopTopBar } from "./PartnerDesktopTopBar";
import { PartnerBottomNav } from "../PartnerBottomNav";
import { partnerRoutes, type PartnerTabId } from "../../navigation/partner-routes";
import { fetchPartnerProfile, getCachedPartnerProfile, toggleStoreStatus } from "../../api/partner/partner-profile-api";
import { usePartnerContext } from "../../context/PartnerContext";

export function PartnerLayout({
  children,
  activeTab,
  title,
  subtitle,
  searchQuery,
  onSearchChange,
  hideBottomNav = false,
}: {
  children: ReactNode;
  activeTab?: PartnerTabId;
  title?: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  hideBottomNav?: boolean;
}) {
  const navigate = useNavigate();
  const { session, hydrating, isOnline, toggleOnline, signOut } = usePartnerContext();
  const [shopName, setShopName] = useState<string>(() => session?.businessName || (session as any)?.name || "QuickPress Partner");
  const [shopLogo, setShopLogo] = useState<string>(() => {
    const cached = getCachedPartnerProfile();
    return (
      cached?.logo ||
      cached?.logoUrl ||
      cached?.storeImage ||
      cached?.image ||
      (session as any)?.storeImage ||
      (session as any)?.logoUrl ||
      (session as any)?.logo ||
      ""
    );
  });

  // Strict Auth Guard: If not logged in, redirect to login screen
  useEffect(() => {
    if (!hydrating && !session) {
      void navigate({ to: partnerRoutes.auth });
    }
  }, [hydrating, session, navigate]);

  useEffect(() => {
    if (!session) return;
    let alive = true;
    fetchPartnerProfile()
      .then((p: any) => {
        if (!alive) return;
        setShopName(p.businessName || p.ownerName || "QuickPress Partner");
        const found = p.logo || p.logoUrl || p.storeImage || p.image;
        if (found) {
          setShopLogo(found);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [session]);

  // Listen to live profile and logo updates
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      const updated = e.detail;
      if (!updated) return;
      if (updated.businessName) setShopName(updated.businessName);
      const found = updated.logo || updated.logoUrl || updated.storeImage || updated.image;
      if (found) setShopLogo(found);
    };
    window.addEventListener("qp:partner-profile-updated", handleProfileUpdate);
    return () => {
      window.removeEventListener("qp:partner-profile-updated", handleProfileUpdate);
    };
  }, []);

  const handleToggleStatus = async () => {
    try {
      await toggleOnline();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleLogout = async () => {
    try {
      signOut();
      void navigate({ to: partnerRoutes.auth });
    } catch {
      void navigate({ to: partnerRoutes.auth });
    }
  };

  // Show loading indicator while checking authentication session
  if (hydrating || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs font-bold text-muted-foreground">Checking store session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Left Sidebar (>= md) */}
      <PartnerSidebar
        shopName={shopName}
        shopLogo={shopLogo}
        isOnline={isOnline}
        onToggleStatus={handleToggleStatus}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {/* Desktop Top Bar (>= md) */}
        <PartnerDesktopTopBar
          title={title}
          subtitle={subtitle}
          shopName={shopName}
          shopLogo={shopLogo}
          isOnline={isOnline}
          onToggleStatus={handleToggleStatus}
          onLogout={handleLogout}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
        />

        {/* Page Content */}
        <main className="flex-1 w-full pb-24 md:pb-8">
          {children}
        </main>

        {/* Customer-Panel Style Glass Pill Bottom Navigation Bar (< md) */}
        {activeTab && !hideBottomNav ? (
          <div className="md:hidden">
            <PartnerBottomNav active={activeTab} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
