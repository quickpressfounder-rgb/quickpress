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

interface ToastState {
  show: boolean;
  message: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("home");
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: "" });

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
