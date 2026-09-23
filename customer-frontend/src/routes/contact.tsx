import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  HelpCircle,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  Globe,
} from "lucide-react";
import { useState } from "react";

import { submitPublicContact, type ContactFormPayload } from "@/api/customer/public-api";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & Corporate Support — QuickPress" },
      {
        name: "description",
        content: "Get in touch with QuickPress support for doorstep laundry inquiries, franchise partnerships, or customer assistance.",
      },
    ],
  }),
  component: ContactScreen,
});

function ContactScreen() {
  const [form, setForm] = useState<ContactFormPayload>({
    name: "",
    email: "",
    phone: "",
    subject: "Order Inquiry",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitPublicContact(form);
      setSuccess(true);
      setForm({ name: "", email: "", phone: "", subject: "Order Inquiry", message: "" });
    } catch (err: any) {
      setError(err.message || "Failed to submit inquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-none bg-white/90 backdrop-blur-md rounded-b-2xl sm:rounded-b-3xl shadow-[0_3px_12px_-2px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/home"
              className="inline-flex size-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-xs transition hover:bg-slate-50"
              aria-label="Back to home"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <span className="text-base font-black tracking-tight text-slate-900">
                Quick<span className="text-emerald-600">Press</span>
              </span>
              <span className="ml-2 text-xs font-semibold text-slate-400">Help & Support</span>
            </div>
          </div>

          <Link
            to="/faqs"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <HelpCircle className="size-3.5 text-emerald-600" /> FAQs
          </Link>
        </div>
      </header>

      {/* Hero Header */}
      <section className="bg-white border-b border-slate-200 py-10 sm:py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <MessageSquare className="size-3.5" /> 24/7 Grievance & Customer Help
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              We're here to help you.
            </h1>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              Have a question about an active laundry order, partner inquiries, or need assistance? Reach out to us directly.
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Direct channels & address */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Direct Support Channels</h2>

              <div className="space-y-4 text-xs">
                <a
                  href="tel:+919997874502"
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/50"
                >
                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                    <Phone className="size-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">+91 99978 74502</p>
                    <p className="text-slate-500 mt-0.5">Quickpress Helpdesk (Mon–Sun, 7:00 AM – 10:00 PM IST)</p>
                  </div>
                </a>

                <a
                  href="tel:+919258730561"
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/50"
                >
                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                    <Phone className="size-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">+91 92587 30561</p>
                    <p className="text-slate-500 mt-0.5">Company MD Contact / Direct Desk</p>
                  </div>
                </a>

                <a
                  href="mailto:official.quickpress@gmail.com"
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/50"
                >
                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                    <Mail className="size-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">official.quickpress@gmail.com</p>
                    <p className="text-slate-500 mt-0.5">Central Support Desk</p>
                  </div>
                </a>

                <a
                  href="https://with.quickpress.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/50"
                >
                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
                    <Globe className="size-4" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">with.quickpress.com</p>
                    <p className="text-slate-500 mt-0.5">Official Brand & Company Website</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Corporate Details */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Building2 className="size-4 text-emerald-600" />
                Corporate & Registered Office
              </h2>

              <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <MapPin className="size-4 text-slate-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Shree Krishna EVs</strong><br />
                    0, JAIL ROAD, NAGLA BENI, NEAR GADDA FACTORY, KALIYANPUR, Kasganj, Kasganj, Uttar Pradesh, 207123, India
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <MapPin className="size-4 text-slate-400 shrink-0 mt-0.5" />
                  <p>
                    <strong>Central Operations Hub:</strong><br />
                    Bilram Gate & Station Road Corridor, Kasganj, Uttar Pradesh 207123, India
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 space-y-1 text-[11px] text-slate-500">
                  <p><strong>GSTIN:</strong> 09KQCPK2468E1ZM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Contact Inquiry Form */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 mb-1">Send Us a Message</h2>
              <p className="text-xs text-slate-500 mb-6">
                Fill out the form below. Your request will be directly routed to our support team.
              </p>

              {success ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-900 space-y-3">
                  <CheckCircle2 className="size-12 mx-auto text-emerald-600" />
                  <h3 className="text-lg font-bold">Inquiry Sent Successfully!</h3>
                  <p className="text-xs text-emerald-700 max-w-sm mx-auto leading-relaxed">
                    Thank you for reaching out. Our support representative will contact you via email or phone within 2 hours.
                  </p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="mt-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                        Inquiry Topic
                      </label>
                      <select
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-white focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      >
                        <option value="Order Inquiry">Order Inquiry</option>
                        <option value="Billing & Refund">Billing & Refund</option>
                        <option value="Franchise / Partner Tie-up">Franchise / Partner Tie-up</option>
                        <option value="Rider Recruitment">Rider Recruitment</option>
                        <option value="Corporate / Bulk Order">Corporate / Bulk Order</option>
                        <option value="Other Feedback">Other Feedback</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
                      Message Details *
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Please describe how we can assist you..."
                      className="w-full rounded-xl border border-slate-200 p-3.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    <Send className="size-4" />
                    {submitting ? "Sending inquiry..." : "Submit Message"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
