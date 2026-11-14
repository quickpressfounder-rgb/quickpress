import React, { useState, useEffect } from "react";
import { PageType, ModalType, ServiceInfo } from "@/types";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CookieBanner } from "@/components/CookieBanner";
import {
  PartnerModal,
  ContactModal,
  ServiceDetailModal,
  DownloadAppModal,
} from "@/components/Modals";
import { handleGetStartedRedirect } from "@/utils/storeRedirect";

// Pages
import { HomePage } from "@/pages/HomePage";
import { AboutPage } from "@/pages/AboutPage";
import { PrivacyPolicyPage } from "@/pages/PrivacyPolicyPage";
import { TermsPage } from "@/pages/TermsPage";
import { ContactPage } from "@/pages/ContactPage";
import { B2BPartnerPage } from "@/pages/B2BPartnerPage";
import { StorePage } from "@/pages/StorePage";
import { CityLandingPage } from "@/pages/CityLandingPage";

// Mobile App Redirection Utility
import {
  isMobileOrTabletDevice,
  shouldBypassRedirect,
  triggerInstantAppLaunch,
} from "@/utils/mobileAppRedirect";

interface ToastState {
  show: boolean;
  message: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("home");
  const [partnerStoreId, setPartnerStoreId] = useState<string>("");
  const [cityServiceFocus, setCityServiceFocus] = useState<"laundry" | "dry-cleaning" | "steam-iron" | "shoe-cleaning">("laundry");
  const [selectedCityName, setSelectedCityName] = useState<string>("All India");
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: "" });
  // On mobile devices, attempt instant app launch directly without showing any intermediate blocking screen
  useEffect(() => {
    if (typeof window !== "undefined" && isMobileOrTabletDevice() && !shouldBypassRedirect()) {
      triggerInstantAppLaunch(partnerStoreId ? `partner/${partnerStoreId}` : undefined);
    }
  }, [partnerStoreId]);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  const handleOpenModal = (modal: ModalType) => {
    if (modal === "booking") {
      handleGetStartedRedirect();
      return;
    }
    setActiveModal(modal);
  };

  // Synchronize hash / pathname with current page
  useEffect(() => {
    const handleRouteSync = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      const path = window.location.pathname.replace(/^\//, "").toLowerCase();
      const target = hash || path;

      // 1. Detect Direct Store / Partner URLs: e.g. /store/PRT-186660 or /partner/PRT-186660
      const rawPath = window.location.pathname.replace(/^\/+/, "");
      const rawHash = window.location.hash.replace(/^#\/?/, "");
      const storeMatch =
        rawPath.match(/^(?:store|partner)\/([a-zA-Z0-9_-]+)/i) ||
        rawHash.match(/^(?:store|partner)\/([a-zA-Z0-9_-]+)/i) ||
        window.location.search.match(/[?&]partner(?:Id)?=([a-zA-Z0-9_-]+)/i) ||
        window.location.search.match(/[?&]store(?:Id)?=([a-zA-Z0-9_-]+)/i);

      if (storeMatch && storeMatch[1]) {
        const id = decodeURIComponent(storeMatch[1]);
        setPartnerStoreId(id);
        setCurrentPage("store");

        // Device Check: If opened on mobile, instantly launch Customer APK (0.0002 ms) without intermediate redirect page!
        if (isMobileOrTabletDevice() && !shouldBypassRedirect()) {
          triggerInstantAppLaunch(`partner/${id}`);
        }
        return;
      }

      if (
        target === "b2b" ||
        target === "b2b-partner" ||
        target === "b2b/login" ||
        target === "b2b-login" ||
        target === "b2b/portal" ||
        target === "b2b-portal" ||
        path.startsWith("b2b") ||
        rawHash.startsWith("b2b")
      ) {
        setCurrentPage("b2b-partner");
        return;
      }

      // 3. Detect Programmatic City & Pan-India Landing Routes
      // Examples: /laundry-service-in-delhi, /dry-cleaning-in-mumbai, /laundry-in-bangalore, /laundry-services-in-india
      const cityMatch = target.match(
        /^(?:laundry|dry-cleaning|steam-ironing|shoe-cleaning|wash-fold)(?:-service|-services)?-in-([a-zA-Z0-9_-]+)/i
      );

      if (cityMatch && cityMatch[1]) {
        const rawCity = cityMatch[1].replace(/[-_]/g, " ");
        setSelectedCityName(rawCity);

        if (target.includes("dry-cleaning")) {
          setCityServiceFocus("dry-cleaning");
        } else if (target.includes("steam-ironing") || target.includes("steam-iron")) {
          setCityServiceFocus("steam-iron");
        } else if (target.includes("shoe-cleaning") || target.includes("shoe-spa")) {
          setCityServiceFocus("shoe-cleaning");
        } else {
          setCityServiceFocus("laundry");
        }
        setCurrentPage("city-landing");
        return;
      }

      if (
        target === "india" ||
        target === "all-india" ||
        target === "laundry-india" ||
        target === "laundry-service-india"
      ) {
        setSelectedCityName("All India");
        setCityServiceFocus("laundry");
        setCurrentPage("city-landing");
        return;
      }

      // 4. Statutory Legal Page Direct Routing
      if (
        target === "refund" ||
        target === "cancellation-refund-policy" ||
        target === "refund-policy" ||
        target === "garment-care" ||
        target === "garment-care-policy" ||
        target === "fabric-care" ||
        target === "pickup" ||
        target === "cookie" ||
        target === "cookie-policy" ||
        target === "grievance" ||
        target === "grievance-redressal" ||
        target === "nodal" ||
        target === "partner-standards"
      ) {
        setCurrentPage("terms");
        return;
      }

      const validPages: PageType[] = [
        "home",
        "about",
        "contact",
        "privacy",
        "terms",
        "b2b-partner",
        "city-landing",
        "store",
      ];
      if (validPages.includes(target as PageType)) {
        setCurrentPage(target as PageType);
      }
    };

    handleRouteSync();
    window.addEventListener("hashchange", handleRouteSync);
    window.addEventListener("popstate", handleRouteSync);
    return () => {
      window.removeEventListener("hashchange", handleRouteSync);
      window.removeEventListener("popstate", handleRouteSync);
    };
  }, []);

  // Global Zomato-Style Scroll-Driven Reveal Observer across all pages
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
          }
        });
      },
      {
        threshold: 0.08,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    const timer = setTimeout(() => {
      const revealElements = document.querySelectorAll(".reveal-on-scroll");
      revealElements.forEach((el) => observer.observe(el));
    }, 80);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [currentPage]);

  const navigateTo = (page: PageType) => {
    setCurrentPage(page);
    window.location.hash = `#${page}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectService = (service: ServiceInfo) => {
    setSelectedService(service);
    setActiveModal("service_detail");
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans antialiased flex flex-col selection:bg-emerald-200 selection:text-emerald-950">
      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 bg-white text-gray-950 text-xs font-bold px-5 py-3.5 rounded-2xl shadow-2xl border border-gray-200 animate-slide-up flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-live-dot" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Global Navigation Header */}
      <Navbar
        currentPage={currentPage}
        onNavigate={navigateTo}
        onOpenModal={handleOpenModal}
      />

      {/* Primary Page Outlet with Smooth Page Entrance Animation */}
      <main className="flex-grow">
        <div key={currentPage} className="animate-page-enter">
          {currentPage === "home" && (
            <HomePage
              onNavigate={navigateTo}
              onOpenModal={handleOpenModal}
              onSelectService={handleSelectService}
              onShowToast={showToast}
            />
          )}

          {currentPage === "about" && (
            <AboutPage
              onNavigate={navigateTo}
              onOpenModal={handleOpenModal}
            />
          )}

          {currentPage === "privacy" && (
            <PrivacyPolicyPage
              onNavigate={navigateTo}
              onOpenModal={handleOpenModal}
            />
          )}

          {currentPage === "contact" && (
            <ContactPage
              onNavigate={navigateTo}
              onOpenModal={handleOpenModal}
            />
          )}

          {currentPage === "terms" && (
            <TermsPage
              onNavigate={navigateTo}
              onOpenModal={handleOpenModal}
            />
          )}

          {currentPage === "b2b-partner" && (
            <B2BPartnerPage
              onNavigate={navigateTo}
              onOpenModal={handleOpenModal}
            />
          )}

          {currentPage === "city-landing" && (
            <CityLandingPage
              onOpenModal={handleOpenModal}
              serviceFocus={cityServiceFocus}
              cityName={selectedCityName}
            />
          )}

          {currentPage === "store" && (
            <StorePage
              partnerId={partnerStoreId || "PRT-QUICK"}
              onOpenModal={handleOpenModal}
              onShowToast={showToast}
              onNavigateHome={() => navigateTo("home")}
            />
          )}
        </div>
      </main>

      {/* Cookie Consent Banner */}
      <CookieBanner onNavigate={navigateTo} />

      {/* Global Multi-Column Footer */}
      <Footer onNavigate={navigateTo} onOpenModal={handleOpenModal} />

      {/* Interactive Modals */}
      <PartnerModal
        isOpen={activeModal === "partner"}
        onClose={() => setActiveModal(null)}
        onShowToast={showToast}
      />

      <ContactModal
        isOpen={activeModal === "contact"}
        onClose={() => setActiveModal(null)}
        onSuccess={() => {
          setActiveModal(null);
          showToast("Thank you! Your message has been sent to official.quickpress@gmail.com.");
        }}
      />

      {activeModal === "service_detail" && selectedService && (
        <ServiceDetailModal
          service={selectedService}
          onClose={() => setActiveModal(null)}
          onBook={(_serviceId) => {
            setActiveModal(null);
            handleGetStartedRedirect();
          }}
        />
      )}

      <DownloadAppModal
        isOpen={activeModal === "download_app"}
        onClose={() => setActiveModal(null)}
        onShowToast={showToast}
      />
    </div>
  );
}
