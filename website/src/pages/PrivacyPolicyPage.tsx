import React, { useState, useMemo } from "react";
import { PageType, ModalType } from "@/types";
import { IconMail, IconShield } from "@/components/Icons";

interface PolicySection {
  id: string;
  num: number;
  title: string;
  keywords: string[];
  content: React.ReactNode;
}

export function PrivacyPolicyPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("s1");
  const [isMobileTocOpen, setIsMobileTocOpen] = useState(false);

  const sections: PolicySection[] = useMemo(
    () => [
      {
        id: "s1",
        num: 1,
        title: "Introduction",
        keywords: ["intro", "overview", "scope", "welcome"],
        content: (
          <div className="space-y-3">
            <p>
              Welcome to QuickPress. We understand that you entrust us with personal details, garment care instructions, location data, and payment information when you use our on-demand laundry and dry cleaning ecosystem.
            </p>
            <p>
              This Privacy Policy explains in transparent, plain language what data we collect, why we collect it, how it is secured, and how you retain full control over your personal information across all QuickPress services.
            </p>
          </div>
        ),
      },
      {
        id: "s2",
        num: 2,
        title: "About QuickPress",
        keywords: ["company", "corporate", "office", "noida", "registered", "entity"],
        content: (
          <div className="space-y-3">
            <p>
              QuickPress is operated by <strong>Shree Krishna EVs</strong>.
            </p>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs space-y-1.5 font-mono">
              <p className="font-sans font-bold text-gray-900 text-sm">Shree Krishna EVs</p>
              <p>Registered Office: 0, JAIL ROAD, NAGLA BENI, NEAR GADDA FACTORY, KALIYANPUR, Kasganj, Kasganj, Uttar Pradesh, 207123, India</p>
              <p>Grievance / Privacy Email: official.quickpress@gmail.com</p>
              <p>Official Website: https://with.quickpress.com</p>
            </div>
          </div>
        ),
      },
      {
        id: "s3",
        num: 3,
        title: "Who This Policy Applies To",
        keywords: ["users", "audience", "customer", "partner", "rider", "captain", "store"],
        content: (
          <div className="space-y-3">
            <p>This Privacy Policy applies to every user interacting with our ecosystem:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-gray-700">
              <li><strong>Customers:</strong> Individuals who download the QuickPress Customer App or book laundry via our website.</li>
              <li><strong>Laundry Partners:</strong> Commercial laundry stores, dry cleaners, and franchise hubs registered on the QuickPress Partner App.</li>
              <li><strong>Delivery Partners (Captains):</strong> Independent delivery riders who operate the QuickPress Delivery Partner (Captain) App for pickups and doorstep drop-offs.</li>
              <li><strong>Website Visitors:</strong> Any individual browsing our marketing pages or submitting web inquiries.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "s4",
        num: 4,
        title: "Information We Collect",
        keywords: ["collect", "data", "categories", "overview"],
        content: (
          <div className="space-y-3">
            <p>
              We adhere strictly to the principle of <em>data minimization</em>. We collect only information that is strictly necessary to schedule pickups, clean clothes with appropriate fabric care, navigate routes, process payments, and verify deliveries.
            </p>
            <p>
              Information is collected directly when you register, place an order, enable device permissions (such as location), or interact with our support desk.
            </p>
          </div>
        ),
      },
      {
        id: "s5",
        num: 5,
        title: "Customer Information",
        keywords: ["customer", "name", "phone", "email", "address"],
        content: (
          <div className="space-y-3">
            <p>When you create an account and place laundry orders as a customer, we collect:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700">
              <li>Full name, primary mobile phone number, and optional email address.</li>
              <li>Exact delivery addresses, flat/house numbers, building names, street landmarks, and selected pin codes.</li>
              <li>Garment counts, laundry preferences (e.g., starch, hypoallergenic detergent, hanger packaging), and order special instructions.</li>
              <li>Order feedback, customer satisfaction ratings, and customer care communications.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "s6",
        num: 6,
        title: "Partner Information",
        keywords: ["partner", "store", "kyc", "bank", "gstin", "pan", "shop"],
        content: (
          <div className="space-y-3">
            <p>For store owners joining the QuickPress Partner network, we collect:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700">
              <li>Store name, commercial business address, geo-coordinates of the facility, and operational hours.</li>
              <li>Authorized signatory contact information (name, phone, business email).</li>
              <li>Statutory KYC documentation: GSTIN certificate, PAN card, Trade License / FSSAI (where applicable).</li>
              <li>Settlement bank account details (Account number, Account holder name, IFSC code) for weekly direct automated disbursements.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "s7",
        num: 7,
        title: "Delivery Partner Information",
        keywords: ["rider", "captain", "license", "rc", "onboarding", "fleet"],
        content: (
          <div className="space-y-3">
            <p>For delivery captains who provide pickup and drop logistics, we collect:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700">
              <li>Full legal name, phone number, selfie photograph for identity verification.</li>
              <li>Government identity and driving credentials: Valid Driving License, Vehicle Registration Certificate (RC), and emergency contact number.</li>
              <li>Bank account or UPI VPA for real-time trip fare credits and performance incentives.</li>
              <li>Trip history, completed delivery counts, on-time performance metrics, and customer satisfaction ratings.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "s8",
        num: 8,
        title: "Location Information",
        keywords: ["location", "gps", "background", "foreground", "tracking", "map", "permission"],
        content: (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm space-y-2">
              <h4 className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                <span>Prominent Location Disclosure (Google Play & App Store Compliance)</span>
              </h4>
              <p>
                <strong>For Delivery Captains:</strong> QuickPress collects precise real-time location data (including <em>foreground</em> while app is open and <em>background</em> when minimized or screen is locked) exclusively to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li>Dispatch pickup offers based on proximity to the customer’s doorstep.</li>
                <li>Display live bike route arrival updates to the customer awaiting their laundry.</li>
                <li>Calculate accurate trip fare distances (₹30 base + ₹8/km matrix).</li>
                <li>Verify safe arrival and store handover milestones.</li>
              </ul>
              <p className="text-[11px] text-amber-900 font-semibold pt-1">
                Background location tracking is activated ONLY when the Captain is marked "ON DUTY". Turning Duty "OFF" immediately ceases all background location collection.
              </p>
            </div>
            <p className="text-xs sm:text-sm text-gray-700">
              <strong>For Customers:</strong> Foreground location is requested with your explicit permission solely to accurately pin your doorstep on the map during checkout and to display the assigned captain's live arrival on the order tracking screen.
            </p>
          </div>
        ),
      },
      {
        id: "s9",
        num: 9,
        title: "Device & Technical Information",
        keywords: ["device", "ip", "os", "fcm", "push", "tokens", "crash"],
        content: (
          <div className="space-y-3">
            <p>When accessing our web portals or mobile applications, our servers automatically collect:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700">
              <li>Device model, hardware identifiers, operating system version (iOS/Android), and app release version.</li>
              <li>IP addresses, browser user-agent strings, and network connection type (Wi-Fi/Cellular).</li>
              <li>Firebase Cloud Messaging (FCM) push tokens used strictly to deliver essential transactional order updates (e.g., "Captain Arrived", "Clothes Dispatched").</li>
            </ul>
          </div>
        ),
      },
      {
        id: "s10",
        num: 10,
        title: "Order Information",
        keywords: ["order", "service", "wash", "dryclean", "iron", "otp"],
        content: (
          <div className="space-y-3">
            <p>
              Every transaction creates an immutable order record comprising unique order IDs, timestamped laundry stages (Scheduled, Picked Up, Washing, Quality Checked, Out for Delivery, Delivered), garment tags, and single-use 4-digit verification OTPs.
            </p>
            <p>
              OTPs are securely generated on our backend and verified at the doorstep to ensure clothes are never handed over to an unauthorized party.
            </p>
          </div>
        ),
      },
      {
        id: "s11",
        num: 11,
        title: "Payment Information",
        keywords: ["payment", "razorpay", "upi", "card", "pci", "refund"],
        content: (
          <div className="space-y-3">
            <p>
              QuickPress prioritizes customer financial safety. All digital transactions are processed through RBI-regulated payment aggregators (such as Razorpay Software Private Limited) over 256-bit encrypted TLS channels.
            </p>
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 space-y-1">
              <p className="font-bold text-gray-900">Zero Card Storage Guarantee:</p>
              <p>
                QuickPress servers NEVER capture, store, or have access to full debit/credit card numbers, expiry dates, CVVs, or Net Banking PINs.
              </p>
            </div>
            <p className="text-xs sm:text-sm text-gray-700">
              For Cash on Delivery (COD) and Fleet settlements, payments collected by delivery captains are reconciled through our double-entry ledger engine.
            </p>
          </div>
        ),
      },
      {
        id: "s12",
        num: 12,
        title: "How We Use Information",
        keywords: ["use", "purpose", "processing", "fulfillment"],
        content: (
          <div className="space-y-3">
            <p>We use collected data solely for legitimate operational and business purposes:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700">
              <li>To schedule doorstep collection, garment cleaning, and return delivery.</li>
              <li>To dispatch the nearest available delivery captain to your location.</li>
              <li>To calculate and settle partner store earnings and captain trip payouts.</li>
              <li>To send order lifecycle status SMS, push notifications, and digital invoices.</li>
              <li>To resolve customer disputes, garment care queries, and service claims.</li>
              <li>To detect and prevent fraudulent accounts, referral abuse, and security threats.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "s13",
        num: 13,
        title: "Communications",
        keywords: ["sms", "whatsapp", "notifications", "email", "promotional"],
        content: (
          <div className="space-y-3">
            <p>
              <strong>Transactional Messages:</strong> You will receive essential SMS, WhatsApp, and push notifications relating to active orders, OTP verifications, and invoice receipts. These cannot be opted out of as they are critical for service fulfillment.
            </p>
            <p>
              <strong>Promotional Communications:</strong> We may occasionally send discount coupons and seasonal offers. You can easily toggle promotional marketing notifications off at any time under <strong>Profile → Settings → Notifications</strong>.
            </p>
          </div>
        ),
      },
      {
        id: "s14",
        num: 14,
        title: "Cookies",
        keywords: ["cookie", "cookies", "analytics", "sessions", "preferences"],
        content: (
          <div className="space-y-3">
            <p>
              Our website uses first-party cookies and local storage to remember your login session, chosen address, and interface preferences.
            </p>
            <p>
              We categorize our cookies into Essential (required for login and cart), Functional (remembers preferences), and Analytics (anonymized usage trends). You can manage your preferences at any time using our Cookie Consent Banner or browser settings.
            </p>
          </div>
        ),
      },
      {
        id: "s15",
        num: 15,
        title: "Information Sharing",
        keywords: ["sharing", "third-party", "disclosure", "partners"],
        content: (
          <div className="space-y-3">
            <p>We do not sell, rent, or trade your personal data. Data is shared strictly on a need-to-know basis with:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700">
              <li><strong>Assigned Laundry Store:</strong> Customer name, garment item count, and washing specifications to clean clothes properly.</li>
              <li><strong>Assigned Delivery Captain:</strong> Customer delivery address, landmark, and masked phone call routing for doorstep handover.</li>
              <li><strong>Cloud & Payment Infrastructure Providers:</strong> Secure hosting (AWS/Cloudflare) and licensed payment gateways (Razorpay).</li>
              <li><strong>Law Enforcement & Statutory Authorities:</strong> Only when strictly mandated by a valid judicial court order or government warrant under applicable Indian law.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "s16",
        num: 16,
        title: "Data Security",
        keywords: ["security", "encryption", "tls", "protection", "ssl"],
        content: (
          <div className="space-y-3">
            <p>
              QuickPress implements rigorous technical and organizational security measures:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700">
              <li>All web and API traffic is encrypted in transit using Transport Layer Security (TLS 1.3).</li>
              <li>Databases are encrypted at rest with AES-256 standards.</li>
              <li>Strict role-based access controls (RBAC) ensure that customer details are accessible only to verified support agents assisting with active orders.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "s17",
        num: 17,
        title: "Data Retention",
        keywords: ["retention", "period", "archive", "statutory"],
        content: (
          <div className="space-y-3">
            <p>
              We retain personal information for as long as your account remains active or as needed to provide you with laundry services.
            </p>
            <p>
              Completed order invoices and tax transaction logs are retained for statutory compliance as mandated under the Central Goods and Services Tax (CGST) Act, 2017 and Indian accounting standards.
            </p>
          </div>
        ),
      },
      {
        id: "s18",
        num: 18,
        title: "Account Deletion",
        keywords: ["deletion", "delete", "close", "erasure", "remove"],
        content: (
          <div className="space-y-3">
            <p>
              You hold the absolute right to delete your QuickPress account and wipe your personal records at any time:
            </p>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs sm:text-sm space-y-2">
              <p className="font-bold text-gray-900">How to Delete Your Account:</p>
              <ol className="list-decimal pl-5 space-y-1 text-gray-700">
                <li>Open the QuickPress App (Customer, Partner, or Captain).</li>
                <li>Navigate to <strong>Profile → Settings → Legal & Privacy → Request Account Deletion</strong>.</li>
                <li>Alternatively, send an email to <a href="mailto:official.quickpress@gmail.com" className="text-emerald-700 font-bold underline">official.quickpress@gmail.com</a> with the subject <em>"Account Deletion Request"</em>.</li>
              </ol>
              <p className="text-[11px] text-gray-500 pt-1">
                Notice: Deleting your account will immediately revoke access and permanently scrub your saved addresses and profile data within 7 business days, retaining only legally required tax transaction invoices.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "s19",
        num: 19,
        title: "User Privacy Rights",
        keywords: ["rights", "access", "rectification", "portability", "consent"],
        content: (
          <div className="space-y-3">
            <p>Under applicable Indian privacy jurisprudence and international best practices, you possess:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700">
              <li><strong>Right to Access:</strong> View all saved personal data, addresses, and transaction receipts.</li>
              <li><strong>Right to Rectification:</strong> Edit or update inaccurate phone numbers, names, or addresses at any time.</li>
              <li><strong>Right to Withdraw Consent:</strong> Revoke optional location or marketing notification permissions via your device settings.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "s20",
        num: 20,
        title: "Third-Party Services",
        keywords: ["third-party", "links", "google", "maps", "razorpay"],
        content: (
          <div className="space-y-3">
            <p>
              Our applications interface with trusted third-party SDKs to deliver core functionality:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700">
              <li><strong>Google Maps Platform:</strong> For geocoding addresses and delivery navigation (governed by Google Privacy Policy).</li>
              <li><strong>Razorpay:</strong> For secure digital payments and UPI settlement.</li>
              <li><strong>Firebase:</strong> For secure phone OTP authentication and transactional push notifications.</li>
            </ul>
          </div>
        ),
      },
      {
        id: "s21",
        num: 21,
        title: "Children's Privacy",
        keywords: ["children", "minors", "age", "18"],
        content: (
          <div className="space-y-3">
            <p>
              QuickPress services are not directed to individuals under the age of 18 years. We do not knowingly collect personal data from minors. If you believe a minor has submitted personal information to us, please contact us immediately for prompt removal.
            </p>
          </div>
        ),
      },
      {
        id: "s22",
        num: 22,
        title: "Data Transfers",
        keywords: ["transfer", "cross-border", "servers", "india"],
        content: (
          <div className="space-y-3">
            <p>
              All primary operational databases, order logs, and customer records are stored securely in cloud data centers located within the territory of India in accordance with domestic data localization standards.
            </p>
          </div>
        ),
      },
      {
        id: "s23",
        num: 23,
        title: "Security Incidents",
        keywords: ["incident", "breach", "notification", "security"],
        content: (
          <div className="space-y-3">
            <p>
              In the unlikely event of a verified data security incident impacting personal data, QuickPress will promptly notify affected users and statutory bodies in accordance with CERT-In cyber incident directives and applicable Indian laws.
            </p>
          </div>
        ),
      },
      {
        id: "s24",
        num: 24,
        title: "Grievance Redressal",
        keywords: ["grievance", "officer", "complaint", "redressal"],
        content: (
          <div className="space-y-3">
            <p>
              In accordance with the Information Technology Act, 2000 and rules made thereunder, our designated Grievance Officer details are published below:
            </p>
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs sm:text-sm space-y-1 text-emerald-950">
              <p className="font-bold text-emerald-900">Grievance Redressal Officer</p>
              <p>Shree Krishna EVs</p>
              <p>Registered Office: 0, JAIL ROAD, NAGLA BENI, NEAR GADDA FACTORY, KALIYANPUR, Kasganj, Kasganj, Uttar Pradesh, 207123, India</p>
              <p className="font-bold">Email: official.quickpress@gmail.com</p>
              <p><strong>Quickpress Helpdesk:</strong> +91 99978 74502 | <strong>Company MD:</strong> +91 92587 30561</p>
              <p className="text-emerald-800/80 text-xs">Acknowledgment Time: Within 24 hours | Resolution Time: Within 15 business days</p>
            </div>
          </div>
        ),
      },
      {
        id: "s25",
        num: 25,
        title: "Contact Information",
        keywords: ["contact", "support", "help", "email"],
        content: (
          <div className="space-y-3">
            <p>For any queries, feedback, or data privacy requests, you may connect with our team through:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs sm:text-sm text-gray-700">
              <li>Quickpress Helpdesk: <a href="tel:+919997874502" className="text-emerald-700 font-bold underline">+91 99978 74502</a> (Mon–Sun, 7:00 AM – 10:00 PM IST)</li>
              <li>Company MD Contact: <a href="tel:+919258730561" className="text-emerald-700 font-bold underline">+91 92587 30561</a></li>
              <li>In-App Support: Available on Customer, Partner, and Captain apps.</li>
              <li>General Support Email: <a href="mailto:official.quickpress@gmail.com" className="text-emerald-700 font-bold underline">official.quickpress@gmail.com</a></li>
              <li>Physical Mail: 0, JAIL ROAD, NAGLA BENI, NEAR GADDA FACTORY, KALIYANPUR, Kasganj, Kasganj, Uttar Pradesh, 207123, India</li>
            </ul>
          </div>
        ),
      },
      {
        id: "s26",
        num: 26,
        title: "Policy Changes",
        keywords: ["changes", "updates", "revisions", "version"],
        content: (
          <div className="space-y-3">
            <p>
              We may periodically update this Privacy Policy to reflect advancements in our technology or amendments in legal statutes. Any material modifications will be announced via in-app banner notifications or email prior to taking effect.
            </p>
            <p className="text-xs font-bold text-gray-600">
              Last Updated: 3 September 2026 (Version 2.4 — Comprehensive Multi-App Privacy Architecture)
            </p>
          </div>
        ),
      },
    ],
    []
  );

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase().trim();
    return sections.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.keywords.some((k) => k.includes(q))
    );
  }, [sections, searchQuery]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setIsMobileTocOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-white text-gray-900 min-h-screen pt-24 pb-20 selection:bg-emerald-200 selection:text-emerald-950">
      {/* Header Banner */}
      <div className="bg-emerald-50/60 text-gray-950 py-14 sm:py-18 px-4 sm:px-6 lg:px-8 border-b border-emerald-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              QuickPress Legal Center
            </span>
            <span className="text-xs text-gray-500 font-mono">
              Last Updated: 3 September 2026
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-gray-950 mb-4">
            QuickPress Privacy Policy
          </h1>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed max-w-3xl">
            Official privacy, personal data protection, location access, and statutory disclosures for the QuickPress Customer App, Partner Store App, Delivery Partner (Captain) App, and website.
          </p>

          {/* Search Box */}
          <div className="mt-8 max-w-xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Privacy Policy (e.g. Location, Payment, Cookies, Deletion, Partner)..."
                className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white border border-gray-300 text-gray-950 text-xs sm:text-sm placeholder:text-gray-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
              />
              <svg
                className="w-4 h-4 text-emerald-600 absolute left-4 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-900"
                >
                  Clear
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-[11px] text-emerald-800 mt-2 font-medium">
                Found {filteredSections.length} matching section{filteredSections.length === 1 ? "" : "s"} for "{searchQuery}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Collapsible TOC Bar */}
      <div className="lg:hidden sticky top-20 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 px-4 py-3">
        <button
          onClick={() => setIsMobileTocOpen(!isMobileTocOpen)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200/80 text-xs font-bold text-gray-900 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>Table of Contents</span>
            <span className="text-[10px] text-gray-500 font-normal">
              (Section {activeSection.replace("s", "")} of 26)
            </span>
          </span>
          <span>{isMobileTocOpen ? "▲ Close" : "▼ Jump to Section"}</span>
        </button>

        {isMobileTocOpen && (
          <div className="mt-2 max-h-72 overflow-y-auto rounded-xl bg-white border border-gray-200 shadow-xl p-2 space-y-1">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                  activeSection === s.id
                    ? "bg-emerald-50 text-emerald-800 font-bold"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="w-5 text-gray-400 text-[10px] font-mono">{s.num}.</span>
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid: Desktop Left Sticky Sidebar + Right Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Desktop Sticky Table of Contents */}
          <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
            <div className="sticky top-28 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
                  Table of Contents
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  26 Sections
                </span>
              </div>

              <nav className="max-h-[calc(100vh-180px)] overflow-y-auto pr-2 space-y-0.5 scrollbar-thin">
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                      activeSection === s.id
                        ? "bg-emerald-600 text-white font-bold shadow-xs"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <span className={`text-[10px] font-mono shrink-0 ${activeSection === s.id ? "text-emerald-200" : "text-gray-400"}`}>
                      {String(s.num).padStart(2, "0")}.
                    </span>
                    <span className="truncate">{s.title}</span>
                  </button>
                ))}
              </nav>

              <div className="pt-3 border-t border-gray-200 space-y-2">
                <button
                  onClick={() => onNavigate("terms")}
                  className="w-full py-2 px-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                >
                  <span>Terms & Conditions</span>
                  <span>→</span>
                </button>
                <button
                  onClick={() => onOpenModal("contact")}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-gray-200 hover:border-emerald-600 text-xs font-bold text-gray-900 flex items-center justify-between cursor-pointer shadow-2xs"
                >
                  <span>Privacy Support</span>
                  <IconMail className="w-3.5 h-3.5 text-emerald-600" />
                </button>
              </div>
            </div>
          </aside>

          {/* Right Content Area */}
          <main className="lg:col-span-8 xl:col-span-9 space-y-12">
            {/* Quick Overview Pill Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border border-emerald-100 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm mb-2">
                <IconShield className="w-4 h-4 text-emerald-700" />
                <span>Plain-English Privacy Commitment</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-950/80 leading-relaxed">
                QuickPress operates an on-demand laundry and garment logistics network. We collect only what is necessary to pick up your laundry, clean it with the highest fabric standards, and return it safely to your doorstep. We never sell your personal data to external advertisers or brokers.
              </p>
            </div>

            {/* Render Sections */}
            {filteredSections.map((s) => (
              <section
                key={s.id}
                id={s.id}
                className="scroll-mt-28 p-6 sm:p-8 rounded-3xl bg-white border border-gray-200/90 shadow-2xs hover:border-emerald-200 transition-all space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h2 className="text-lg sm:text-xl font-black text-gray-950 flex items-center gap-2.5">
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-black">
                      {s.num}
                    </span>
                    <span>{s.title}</span>
                  </h2>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(`${window.location.origin}/#privacy`);
                      alert("Link to Privacy Policy copied to clipboard!");
                    }}
                    className="text-[11px] font-bold text-gray-400 hover:text-emerald-700 transition-colors"
                    title="Copy section link"
                  >
                    Share
                  </button>
                </div>
                {s.content}
              </section>
            ))}

            {/* Bottom Footer Actions */}
            <div className="pt-8 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={() => onNavigate("home")}
                className="px-6 py-2.5 rounded-full bg-white border border-gray-300 text-gray-900 text-xs font-bold hover:border-emerald-600 hover:text-emerald-700 transition-all cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <span>← Back to Home</span>
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => onNavigate("terms")}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer"
                >
                  Terms & Conditions
                </button>
                <button
                  onClick={() => onOpenModal("contact")}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-xs"
                >
                  Contact Grievance Officer
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
