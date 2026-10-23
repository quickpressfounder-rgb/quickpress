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

// Mobile App Redirection Utility & Assets
import customerLogo from "@/assets/quickpress-customer-logo.jpg";
import {
  isMobileOrTabletDevice,
  shouldBypassRedirect,
  triggerSmartAppRedirect,
  setWebBypass,
  PLAY_STORE_CUSTOMER_URL,
  APK_CUSTOMER_DOWNLOAD_URL,
  APP_STORE_CUSTOMER_URL,
  isAppleDevice,
} from "@/utils/mobileAppRedirect";

interface ToastState {
  show: boolean;
  message: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("home");
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: "" });
  const [isMobileRedirectActive, setIsMobileRedirectActive] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return isMobileOrTabletDevice() && !shouldBypassRedirect();
    }
    return false;
  });

  useEffect(() => {
    if (isMobileRedirectActive) {
      triggerSmartAppRedirect();
    }
  }, [isMobileRedirectActive]);

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

  // Synchronize hash with current page
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "").toLowerCase();
      if (hash === "b2b" || hash === "b2b-partner") {
        setCurrentPage("b2b-partner");
        setIsMobileRedirectActive(false);
        return;
      }
      const validPages: PageType[] = [
        "home",
        "about",
        "contact",
        "privacy",
        "terms",
        "b2b-partner",
      ];
      if (validPages.includes(hash as PageType)) {
        setCurrentPage(hash as PageType);
      }
    };

    handleHashChange();
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigateTo = (page: PageType) => {
    setCurrentPage(page);
    window.location.hash = `#${page}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectService = (service: ServiceInfo) => {
    setSelectedService(service);
    setActiveModal("service_detail");
  };

  // Mobile / Tablet Smart App Redirection Screen
  if (isMobileRedirectActive) {
    const isApple = isAppleDevice();
    const primaryStoreUrl = isApple ? APP_STORE_CUSTOMER_URL : PLAY_STORE_CUSTOMER_URL;

    return (
      <div className="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-between p-6 sm:p-10 font-sans selection:bg-emerald-500 selection:text-black">
        {/* Top Header */}
        <div className="w-full max-w-md flex items-center justify-between pt-2">
          <div className="text-3xl font-black italic tracking-tight">
            <span className="text-white">Quick</span>
            <span className="text-[#22c55e]">Press</span>
          </div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400">
            Mobile App Gateway
          </span>
        </div>

        {/* Center Card */}
        <div className="max-w-sm w-full text-center space-y-6 my-auto">
          <div className="relative mx-auto w-24 h-24 rounded-3xl overflow-hidden border-2 border-zinc-800 shadow-2xl bg-zinc-900">
            <img
              src={customerLogo}
              alt="QuickPress Customer App"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 border border-white/10 rounded-3xl pointer-events-none" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Opening QuickPress Customer App...</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Hyper-local Laundry on Mobile
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
              If the app is already installed on your device, it will launch automatically. Otherwise, please download QuickPress from the app store.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <a
              href={primaryStoreUrl}
              className="w-full py-3.5 px-5 rounded-2xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M3.609 1.814L13.793 12 3.61 22.186a2.41 2.41 0 0 1-.41-.307 2.37 2.37 0 0 1-.6-1.639V3.76c0-.64.225-1.229.6-1.639.12-.132.257-.235.41-.307zM15.207 13.414l2.586 2.586-11.83 6.83 9.244-9.416zm0-2.828L5.963 1.17l11.83 6.83-2.586 2.586zm1.414 1.414l3.535-2.041c.883-.51.883-1.348 0-1.858L16.621 12l3.535 3.914c.883-.51.883-1.348 0-1.858l-3.535-2.056z"/>
              </svg>
              <span>{isApple ? "Download on Apple App Store" : "Open in Google Play Store"}</span>
            </a>

            {!isApple && (
              <a
                href={APK_CUSTOMER_DOWNLOAD_URL}
                download="QuickPress-Customer.apk"
                className="w-full py-3 px-5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Download Customer APK Directly</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                setWebBypass();
                setIsMobileRedirectActive(false);
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 underline font-mono pt-2 cursor-pointer transition-colors block mx-auto"
            >
              Continue to Web Version (Preview Mode)
            </button>
          </div>
        </div>

        {/* Bottom Security / Trust */}
        <div className="text-center text-[10px] text-zinc-600 font-mono pb-2">
          <span>Official QuickPress Ecosystem • Live Fleet & Customer Gateway</span>
        </div>
      </div>
    );
  }

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

      {/* Primary Page Outlet */}
      <main className="flex-grow">
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
