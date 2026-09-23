import React, { useState, useEffect } from "react";
import { ServiceInfo, JobPosition } from "@/types";
import { IconClose, IconCheck } from "./Icons";

const GREEN = "#1A7A3C";
const YELLOW = "#F59E0B";

const SERVICES_DATA: ServiceInfo[] = [
  {
    id: "laundry",
    title: "Laundry & Dry Cleaning",
    category: "Garment Care",
    tagline: "Fresh, neatly folded garments returned within 24 hours.",
    desc: "Pickup, professional eco-wash, crisp pressing, and doorstep return. From everyday wear to delicate formal garments.",
    price: "From ₹49 / kg",
    turnaround: "24-48 Hours",
    features: [
      "Wash, tumble dry & crisp folding",
      "Eco-friendly hypo-allergenic detergents",
      "Delicate garment & formal dry cleaning",
      "Custom folding & hanging preferences",
      "Doorstep pickup & scheduled return slots",
    ],
    accentColor: GREEN,
    bgLight: "#E8F7EE",
  },
  {
    id: "bag-leather",
    title: "Bag & Leather Cleaning",
    category: "Specialized Fabric & Leather",
    tagline: "Professional deep restoration for luxury handbags, jackets & suede.",
    desc: "Conditioning, stain extraction, deodorization, zipper care, and moisture-seal finish for leather jackets and luxury designer bags.",
    price: "From ₹299 / piece",
    turnaround: "48-72 Hours",
    features: [
      "Pure leather & suede deep stain extraction",
      "Wax buffing & color tone rejuvenation",
      "Handbag interior lining deep sanitization",
      "Hardware polish & zipper conditioning",
      "Moisture-seal & anti-fungal barrier coating",
    ],
    accentColor: "#92400E",
    bgLight: "#FEF3C7",
  },
  {
    id: "business",
    title: "Business Services",
    category: "Enterprise Fleet",
    tagline: "Dedicated operational logistics for modern enterprises.",
    desc: "Technology, scheduled route logistics, and volume fulfillment support designed to help retail and corporate businesses scale faster.",
    price: "Custom SLA",
    turnaround: "Scheduled & On-Demand",
    features: [
      "Bulk scheduled daily & weekly pickups",
      "Automated API integration & dispatch webhook",
      "Dedicated account manager & guaranteed SLA",
      "Multi-location corporate billing dashboard",
      "Consolidated monthly invoicing",
    ],
    accentColor: "#7C3AED",
    bgLight: "#F5F3FF",
  },
  {
    id: "local",
    title: "Local Services",
    category: "Neighborhood Hub",
    tagline: "A curated ecosystem of verified local everyday specialists.",
    desc: "Connecting vetted local service partners—from tailoring and repairs to specialty care—directly to your home with transparent rates.",
    price: "Transparent Rates",
    turnaround: "Same-Day Booking",
    features: [
      "100% background-verified local artisans",
      "Upfront pricing with zero hidden surcharges",
      "Guaranteed satisfaction or free rework",
      "Direct in-app messaging with technicians",
      "Contactless payment & digital invoicing",
    ],
    accentColor: "#D97706",
    bgLight: "#FFFBEB",
  },
];

// ─── Booking Modal ───────────────────────────────────────────────────────────
export function BookingModal({
  isOpen,
  onClose,
  initialServiceId,
  onShowToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialServiceId?: string;
  onShowToast: (msg: string) => void;
}) {
  const [selectedService, setSelectedService] = useState(initialServiceId || "laundry");
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("Today, Immediate Window (Under 45m)");
  const [notes, setNotes] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (initialServiceId) {
      setSelectedService(initialServiceId);
    }
  }, [initialServiceId]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    onShowToast("Booking confirmed! Order #QP-94820 is scheduled.");
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative animate-slide-up max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <IconClose className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                QuickPress Instant Booking
              </span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-1">Schedule a Service</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-6">
              Select your service and pickup window for instant courier dispatch.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Service selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  1. Choose Service
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SERVICES_DATA.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSelectedService(s.id)}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                        selectedService === s.id
                          ? "border-emerald-600 bg-emerald-50/80 text-emerald-950 ring-2 ring-emerald-600/20"
                          : "border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div>{s.title}</div>
                      <span className="text-[10px] font-normal text-gray-500">{s.price}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Address input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  2. Pickup Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 406 Tower B, Bhutani Alphathum, Sector 90, Noida"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Time slot */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  3. Pickup Window
                </label>
                <select
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option>Today, Immediate Window (Under 45m)</option>
                  <option>Today, Afternoon (2:00 PM – 4:00 PM)</option>
                  <option>Today, Evening (6:00 PM – 8:00 PM)</option>
                  <option>Tomorrow Morning (9:00 AM – 11:00 AM)</option>
                  <option>Tomorrow Afternoon (1:00 PM – 3:00 PM)</option>
                </select>
              </div>

              {/* Special notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  4. Special Instructions (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Leave with doorman, delicate garment"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Total & Submit */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Estimated Total
                  </span>
                  <span className="text-base font-black text-gray-900">
                    ₹249 (Pay on Delivery)
                  </span>
                </div>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-full font-bold text-white text-sm shadow-lg hover:scale-105 transition-all cursor-pointer"
                  style={{ background: GREEN }}
                >
                  Confirm Booking →
                </button>
              </div>

              <p className="text-[11px] text-gray-500 text-center mt-3 leading-relaxed">
                By creating an account, you acknowledge that you have read and understood our{" "}
                <a href="#privacy" onClick={onClose} className="text-emerald-700 font-bold underline">
                  Privacy Policy
                </a>{" "}
                and agree to the applicable{" "}
                <a href="#terms" onClick={onClose} className="text-emerald-700 font-bold underline">
                  Terms & Conditions
                </a>.
              </p>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              ✓
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Order Confirmed!</h3>
            <p className="text-sm text-gray-600 mb-6">
              Your request for <strong>{SERVICES_DATA.find((s) => s.id === selectedService)?.title}</strong> has been received. Driver is assigned.
            </p>
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-left text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-500">Order ID:</span>
                <span className="font-bold text-gray-900">#QP-94820</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Pickup Address:</span>
                <span className="font-bold text-gray-900 truncate max-w-[200px]">{address || "Bhutani Alphathum, Sector 90, Noida"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Scheduled Slot:</span>
                <span className="font-bold text-gray-900">{date}</span>
              </div>
            </div>
            <button
              onClick={handleResetAndClose}
              className="px-8 py-3 rounded-full font-bold text-white text-sm cursor-pointer shadow-md"
              style={{ background: GREEN }}
            >
              Done & Return
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Partner Modal ────────────────────────────────────────────────────────────
export function PartnerModal({
  isOpen,
  onClose,
  onShowToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}) {
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState("Laundromat / Dry Cleaner");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    onShowToast("Partner application submitted! Our team will contact you in 24h.");
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative animate-slide-up max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
        >
          <IconClose className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-100 text-yellow-900 text-xs font-bold tracking-widest uppercase mb-2">
              Partner Network
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-1">Become a QuickPress Partner</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-6">
              Connect your business or courier fleet to our on-demand order dispatch network.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Business / Partner Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Cleaners & Logistics"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Service Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600 bg-white"
                >
                  <option>Commercial Laundromat / Dry Cleaner Store Partner</option>
                  <option>Independent Delivery Captain / Fleet Partner</option>
                  <option>Shoe Spa & Leather Care Partner</option>
                  <option>Commercial Bulk Linen Partner</option>
                  <option>Corporate Retail / Enterprise Logistics</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Operating City
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Noida, Delhi-NCR"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="contact@yourbusiness.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full font-bold text-gray-950 text-sm shadow-md hover:scale-[1.02] transition-all cursor-pointer"
                  style={{ background: YELLOW }}
                >
                  Submit Partner Application →
                </button>
                <p className="text-[11px] text-gray-500 text-center mt-2.5">
                  Your information will be used to respond to your request. See our{" "}
                  <a href="#privacy" onClick={onClose} className="text-emerald-700 font-bold underline">
                    Privacy Policy
                  </a>{" "}
                  for more information.
                </p>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-yellow-100 text-yellow-900 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              ✓
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Application Received!</h3>
            <p className="text-sm text-gray-600 mb-6">
              Thank you for applying to join the QuickPress partner network. Our onboarding specialist will reach out to <strong>{email}</strong> within 24 hours.
            </p>
            <button
              onClick={handleResetAndClose}
              className="px-8 py-3 rounded-full font-bold text-gray-950 text-sm cursor-pointer shadow-md"
              style={{ background: YELLOW }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Universal Multi-Purpose Contact Center Modal ────────────────────────────
export function ContactModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg?: string) => void;
}) {
  const [inquiryType, setInquiryType] = useState<
    "partner" | "customer_help" | "captain" | "corporate" | "general"
  >("partner");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("Noida");
  const [pincode, setPincode] = useState("");
  const [details, setDetails] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const INQUIRY_TYPES = [
    { id: "partner", label: "Partner Store Onboarding", desc: "List your laundry, dry cleaner store or ironing shop" },
    { id: "captain", label: "Captain / Rider Fleet", desc: "Join as a delivery captain or fleet logistics partner" },
    { id: "customer_help", label: "Customer & Order Help", desc: "Order tracking, pickup rescheduling or fabric care inquiry" },
    { id: "corporate", label: "B2B & Hotel Logistics", desc: "Bulk laundry contracts for hotels, salons & corporate staff" },
    { id: "general", label: "General & Media", desc: "General queries, feedback, or business consultation" },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (onSuccess) {
      onSuccess(`Thank you ${name}! Your inquiry for ${inquiryType.toUpperCase()} has been submitted.`);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setName("");
    setPhone("");
    setEmail("");
    setMessage("");
    setPincode("");
    setDetails("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-9 shadow-2xl border border-gray-100 relative animate-slide-up max-h-[92vh] overflow-y-auto">
        <button
          onClick={handleReset}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
        >
          <IconClose className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black tracking-widest uppercase mb-2 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-live-dot" />
                QuickPress Help & Contact Center
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-950">
                How Can We Help You Today?
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-relaxed">
                Select your inquiry category below. Our dedicated specialist team in Noida HQ will respond within <strong>2 business hours</strong>.
              </p>
            </div>

            {/* Category Switcher Tabs */}
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-gray-700 mb-2">
                1. Select Inquiry Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INQUIRY_TYPES.map((t) => {
                  const isSelected = inquiryType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setInquiryType(t.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-white text-emerald-950 border-2 border-emerald-600 shadow-md ring-2 ring-emerald-500/20"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <span className={`text-xs font-black block ${isSelected ? "text-emerald-900" : "text-gray-900"}`}>
                        {t.label}
                      </span>
                      <span className={`text-[10px] mt-1 leading-tight block ${isSelected ? "text-emerald-700" : "text-gray-500"}`}>
                        {t.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Contact Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Himanshu Baghel / Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Phone / WhatsApp Number (+91) *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Operating City / State *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Noida / Delhi / Gurugram"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600 bg-white"
                  />
                </div>
              </div>

              {/* Dynamic Field Based on Selected Category */}
              {inquiryType === "partner" && (
                <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 uppercase mb-1">
                      Business Facility Type
                    </label>
                    <select
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs font-bold text-gray-900 bg-white focus:outline-none"
                    >
                      <option value="Laundromat / Wash & Fold Store">Laundromat / Wash & Fold Store</option>
                      <option value="Dry Cleaner & Steam Press Plant">Dry Cleaner & Steam Press Facility</option>
                      <option value="Shoe & Leather Care Spa">Shoe & Leather Care Spa</option>
                      <option value="Independent Logistics Fleet">Independent Logistics Fleet</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 uppercase mb-1">
                      Target Noida Sector / Pincode
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Sector 62 / 75 Noida (201301)"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs text-gray-900 bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {inquiryType === "customer_help" && (
                <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 uppercase mb-1">
                      Order ID (if applicable)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. QP-94820"
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs text-gray-900 bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-emerald-950 uppercase mb-1">
                      Delivery Address / Society
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Paras Tierea, Sector 137"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs text-gray-900 bg-white focus:outline-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Your Message / Requirement Details *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Please describe your query, location, or questions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600 bg-white"
                />
              </div>

              {/* Official Office Footer Stamp */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-gray-500 gap-2">
                <div>
                  <span className="font-black text-gray-900 block">QUICKPRESS HQ Noida</span>
                  <span>Unit 406 Tower B, Bhutani Alphathum, Sector 90, Noida</span>
                </div>
                <div className="text-right sm:text-right font-semibold text-emerald-800">
                  official.quickpress@gmail.com
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-4 rounded-full font-black text-white text-sm shadow-xl hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: GREEN }}
                >
                  <span>Submit Inquiry →</span>
                </button>
                <p className="text-[11px] text-gray-500 text-center mt-2.5">
                  Your information will be used to respond to your request. See our{" "}
                  <a href="#privacy" onClick={onClose} className="text-emerald-700 font-bold underline">
                    Privacy Policy
                  </a>{" "}
                  for more information.
                </p>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto text-2xl font-black">
              ✓
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-gray-950">
              Inquiry Successfully Dispatched!
            </h3>
            <p className="text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
              Thank you, <strong>{name}</strong>. Your inquiry for <strong>{inquiryType.toUpperCase()}</strong> has been routed directly to our Noida HQ operations desk. We will call you on <strong>{phone}</strong> and email <strong>{email}</strong> within 2 hours.
            </p>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 max-w-sm mx-auto text-xs text-emerald-900 font-semibold">
              Support Reference: #QP-INQ-{Math.floor(100000 + Math.random() * 900000)}
            </div>
            <div className="pt-4">
              <button
                onClick={handleReset}
                className="px-8 py-3 rounded-full font-black text-white text-sm cursor-pointer shadow-md hover:scale-105 transition-all"
                style={{ background: GREEN }}
              >
                Close & Return
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Job Application Modal ───────────────────────────────────────────────────
export function JobApplyModal({
  job,
  isOpen,
  onClose,
  onShowToast,
}: {
  job: JobPosition | null;
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    onShowToast(`Application submitted for ${job.title}!`);
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative animate-slide-up max-h-[90vh] overflow-y-auto">
        <button
          onClick={handleResetAndClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
        >
          <IconClose className="w-5 h-5" />
        </button>

        {!isSubmitted ? (
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mb-2">
              {job.dept} • {job.type}
            </span>
            <h3 className="text-2xl font-black text-gray-900 mb-1">Apply for {job.title}</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-5">
              {job.location} • {job.salary}
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Taylor Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="taylor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">LinkedIn / Portfolio URL</label>
                <input
                  type="url"
                  placeholder="https://linkedin.com/in/taylorsmith"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Why QuickPress? (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Tell us about your experience..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full font-bold text-white text-sm shadow-md hover:scale-[1.02] transition-all cursor-pointer"
                  style={{ background: GREEN }}
                >
                  Submit Application →
                </button>
                <p className="text-[11px] text-gray-500 text-center mt-2.5">
                  Your information will be used to process your application. See our{" "}
                  <a href="#privacy" onClick={onClose} className="text-emerald-700 font-bold underline">
                    Privacy Policy
                  </a>{" "}
                  for more information.
                </p>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              ✓
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Application Received!</h3>
            <p className="text-sm text-gray-600 mb-6">
              Thank you for applying to <strong>{job.title}</strong>. Our hiring team will review your profile and contact <strong>{email}</strong> within 3 business days.
            </p>
            <button
              onClick={handleResetAndClose}
              className="px-8 py-3 rounded-full font-bold text-white text-sm cursor-pointer shadow-md"
              style={{ background: GREEN }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Download App Modal ───────────────────────────────────────────────────────
export function DownloadAppModal({
  isOpen,
  onClose,
  onShowToast,
}: {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [linkSent, setLinkSent] = useState(false);

  if (!isOpen) return null;

  const handleSendLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setLinkSent(true);
    onShowToast(`App download link sent to ${phoneNumber}!`);
    setTimeout(() => {
      setLinkSent(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-10 shadow-2xl border border-gray-100 relative animate-slide-up max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <IconClose className="w-5 h-5" />
        </button>

        <div className="text-center space-y-3 mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-live-dot" />
            QuickPress Mobile App
          </span>
          <h3 className="text-2xl sm:text-4xl font-black text-gray-950">
            Download the QuickPress App
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
            Experience effortless laundry scheduling, instant package delivery, and live GPS driver tracking right from your pocket.
          </p>
        </div>

        {/* App Store & Play Store Download Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Apple App Store */}
          <a
            href="https://apps.apple.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onShowToast("Redirecting to Apple App Store...")}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-white text-gray-950 border-2 border-gray-200 hover:border-emerald-600 transition-all shadow-sm hover:shadow-md hover:scale-[1.02] cursor-pointer group"
          >
            <IconApple className="w-8 h-8 text-gray-950 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-semibold text-gray-500 block leading-tight">
                Download on the
              </span>
              <span className="text-sm font-black text-gray-950 block">
                Apple App Store
              </span>
            </div>
          </a>

          {/* Google Play Store */}
          <a
            href="https://play.google.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onShowToast("Redirecting to Google Play Store...")}
            className="flex items-center gap-3.5 p-4 rounded-2xl bg-white text-gray-950 border-2 border-gray-200 hover:border-emerald-600 transition-all shadow-sm hover:shadow-md hover:scale-[1.02] cursor-pointer group"
          >
            <IconGooglePlay className="w-8 h-8 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
            <div className="text-left">
              <span className="text-[10px] uppercase font-semibold text-gray-500 block leading-tight">
                GET IT ON
              </span>
              <span className="text-sm font-black text-gray-950 block">
                Google Play Store
              </span>
            </div>
          </a>
        </div>

        {/* QR Code & SMS Link Box */}
        <div className="bg-slate-50 text-gray-950 rounded-2xl p-6 border-2 border-emerald-100 grid sm:grid-cols-12 gap-6 items-center mb-6">
          <div className="sm:col-span-4 flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-xs border border-gray-200 text-center">
            {/* SVG Visual QR Code */}
            <svg className="w-24 h-24 text-gray-950" viewBox="0 0 100 100" fill="currentColor">
              {/* Corner 1 */}
              <rect x="5" y="5" width="30" height="30" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="13" y="13" width="14" height="14" rx="2" />
              {/* Corner 2 */}
              <rect x="65" y="5" width="30" height="30" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="73" y="13" width="14" height="14" rx="2" />
              {/* Corner 3 */}
              <rect x="5" y="65" width="30" height="30" rx="4" fill="none" stroke="currentColor" strokeWidth="6" />
              <rect x="13" y="73" width="14" height="14" rx="2" />
              {/* Data pattern squares */}
              <rect x="42" y="10" width="6" height="6" />
              <rect x="52" y="10" width="6" height="6" />
              <rect x="42" y="24" width="6" height="6" />
              <rect x="10" y="45" width="6" height="6" />
              <rect x="25" y="45" width="6" height="6" />
              <rect x="40" y="40" width="20" height="20" rx="3" fill="#1A7A3C" />
              <rect x="70" y="45" width="6" height="6" />
              <rect x="85" y="45" width="6" height="6" />
              <rect x="42" y="70" width="6" height="6" />
              <rect x="52" y="80" width="6" height="6" />
              <rect x="70" y="70" width="10" height="10" rx="2" />
              <rect x="85" y="85" width="10" height="10" rx="2" />
            </svg>
            <span className="text-[10px] font-bold text-gray-800 mt-1 uppercase tracking-wider">
              Scan with Camera
            </span>
          </div>

          <div className="sm:col-span-8 space-y-3">
            <h4 className="font-bold text-gray-950 text-sm">
              Scan QR code to install or get direct SMS link
            </h4>
            <form onSubmit={handleSendLink} className="flex gap-2">
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder:text-gray-400 text-xs focus:outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-black text-xs hover:bg-emerald-800 transition-all cursor-pointer shrink-0"
              >
                {linkSent ? "Link Sent ✓" : "Send Link"}
              </button>
            </form>
            <p className="text-[10px] text-emerald-300/60">
              Free download • Compatible with iOS 15.0+ and Android 9.0+
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-center text-xs">
          {[
            { title: "Live GPS Tracking", desc: "Watch courier in real-time" },
            { title: "1-Click Reorder", desc: "Saved care preferences" },
            { title: "Digital Receipts", desc: "Itemized garment counts" },
            { title: "Exclusive Offers", desc: "App-only promo codes" },
          ].map((item) => (
            <div key={item.title} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
              <p className="font-bold text-gray-900 text-[11px]">{item.title}</p>
              <p className="text-[9px] text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Service Detail Modal ─────────────────────────────────────────────────────
export function ServiceDetailModal({
  service,
  onClose,
  onBook,
}: {
  service: ServiceInfo | null;
  onClose: () => void;
  onBook: (serviceId: string) => void;
}) {
  if (!service) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
        >
          <IconClose className="w-5 h-5" />
        </button>

        <span
          className="text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-3"
          style={{ background: service.bgLight, color: service.accentColor }}
        >
          {service.category}
        </span>

        <h3 className="text-2xl font-black text-gray-900 mb-2">{service.title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">{service.tagline}</p>

        <div className="space-y-3 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">What's Included:</h4>
          <ul className="space-y-2 text-xs sm:text-sm text-gray-700">
            {service.features.map((f) => (
              <li key={f} className="flex items-center gap-2.5">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: service.accentColor }}
                >
                  <IconCheck className="w-2.5 h-2.5" />
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Service Speed</span>
            <span className="text-xs sm:text-sm font-black text-gray-900">
              {service.turnaround}
            </span>
          </div>

          <button
            onClick={() => {
              onClose();
              onBook(service.id);
            }}
            className="px-6 py-3 rounded-full font-bold text-white text-sm shadow-md hover:scale-105 transition-all cursor-pointer"
            style={{ background: service.accentColor }}
          >
            Get on App →
          </button>
        </div>
      </div>
    </div>
  );
}


