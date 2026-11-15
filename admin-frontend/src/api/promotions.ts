import { apiGetJson, apiPostJson, apiPutJson, apiDeleteJson } from "./core/transport";

export interface AdminStory {
  _id: string;
  id: string;
  title: string;
  tagline: string;
  badge: string;
  badgeBg: string;
  gradient: string;
  icon: string;
  imageUrl?: string;
  points: string[];
  ctaText: string;
  ctaAction: string;
  actionType: "external_link" | "internal_route" | "share" | "google_form";
  audience: "riders" | "customers" | "partners" | "all";
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminBanner {
  _id: string;
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  theme: string;
  rewardAmount: number;
  ctaText: string;
  ctaLink: string;
  actionType: "reward_scratch" | "external_link" | "google_form" | "internal_route";
  audience: "riders" | "customers" | "partners" | "all";
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminBlog {
  _id: string;
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  coverImage: string;
  videoUrl?: string;
  author: string;
  authorRole: string;
  readTime: string;
  isSlider: boolean;
  isFeatured: boolean;
  priority: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCareerJob {
  _id?: string;
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  experience: string;
  desc: string;
  responsibilities: string[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// --------------------------------------------------------------------------
// Real Seed Defaults
// --------------------------------------------------------------------------

const DEFAULT_STORIES: AdminStory[] = [
  {
    _id: "story_follow",
    id: "story_follow",
    title: "Join QuickPress Captains 🛵",
    tagline: "Uttar Pradesh's Fastest Growing Rider Community",
    badge: "CAPTAIN COMMUNITY",
    badgeBg: "bg-rose-500",
    gradient: "from-amber-600 via-rose-600 to-purple-800",
    icon: "🛵",
    imageUrl: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80",
    points: [
      "10,000+ active captains across Kasganj, Aligarh & UP",
      "Weekly fuel coupons & motorcycle repair discounts",
      "Watch daily tips & earnings hacks by top riders",
    ],
    ctaText: "Follow on Instagram ➔",
    ctaAction: "https://www.instagram.com/with.quickpress",
    actionType: "external_link",
    audience: "riders",
    priority: 1,
    isActive: true,
  },
  {
    _id: "story_transfer",
    id: "story_transfer",
    title: "Instant Bank Transfer ⚡",
    tagline: "Direct IMPS Payouts with Zero Deductions",
    badge: "INSTANT CASHOUT",
    badgeBg: "bg-emerald-500",
    gradient: "from-emerald-700 via-teal-800 to-slate-900",
    icon: "🏦",
    points: [
      "Automatic daily settlements 3 times every day",
      "Instant one-tap withdrawal to your registered bank / UPI",
      "100% of order fare belongs to you — 0% commission",
    ],
    ctaText: "Open Wallet ➔",
    ctaAction: "/wallet",
    actionType: "internal_route",
    audience: "riders",
    priority: 2,
    isActive: true,
  },
  {
    _id: "story_earn2000",
    id: "story_earn2000",
    title: "Refer Friends & Earn ₹2,000 💰",
    tagline: "Exclusive Kasganj & UP Referral Bonanza",
    badge: "REFER & EARN",
    badgeBg: "bg-blue-500",
    gradient: "from-blue-700 via-indigo-900 to-violet-950",
    icon: "💸",
    points: [
      "Share your referral link with biker friends",
      "When they complete 25 orders, you get ₹2,000 cash",
      "No limit on referrals — refer 5 friends, get ₹10,000!",
    ],
    ctaText: "Share Referral Link ➔",
    ctaAction: "https://quickpress.in/captain",
    actionType: "share",
    audience: "riders",
    priority: 3,
    isActive: true,
  },
  {
    _id: "story_autoboost",
    id: "story_autoboost",
    title: "Auto Boost 2.0 ⚡",
    tagline: "Extra Fares During Peak Laundry Demand",
    badge: "PEAK SURGE",
    badgeBg: "bg-amber-500",
    gradient: "from-amber-600 via-orange-600 to-red-900",
    icon: "⚡",
    points: [
      "+₹20 to +₹45 extra per order during morning & evening rushes",
      "Rain surge activated automatically during bad weather",
      "Priority order dispatch in Kasganj high-demand zones",
    ],
    ctaText: "View Live Boosts ➔",
    ctaAction: "/incentives",
    actionType: "internal_route",
    audience: "riders",
    priority: 4,
    isActive: true,
  },
  {
    _id: "story_performance",
    id: "story_performance",
    title: "Captain Performance Score 🏆",
    tagline: "Maintain 4.8★ & Unlock Gold VIP Captain Perks",
    badge: "VIP TIER",
    badgeBg: "bg-purple-500",
    gradient: "from-purple-700 via-fuchsia-900 to-zinc-950",
    icon: "🏅",
    points: [
      "Gold Captain badge shown to store partners & customers",
      "Complimentary accidental medical insurance coverage",
      "Dedicated VIP Captain priority support phone helpline",
    ],
    ctaText: "Check My Score ➔",
    ctaAction: "/profile",
    actionType: "internal_route",
    audience: "riders",
    priority: 5,
    isActive: true,
  },
];

const DEFAULT_BANNERS: AdminBanner[] = [
  {
    _id: "banner_mystery_reward",
    id: "banner_mystery_reward",
    title: "Tap to Earn ₹10 Reward",
    subtitle: "Guaranteed instant cash reward for active captain duty!",
    badge: "CAPTAIN REWARD",
    badgeColor: "#FFC107",
    theme: "blue_mystery",
    rewardAmount: 10,
    ctaText: "Tap to earn",
    ctaLink: "",
    actionType: "reward_scratch",
    audience: "riders",
    priority: 1,
    isActive: true,
  },
  {
    _id: "banner_festive_express",
    id: "banner_festive_express",
    title: "Festive Express Wash & Steam Iron",
    subtitle: "Doorstep pickup in 45 minutes with 80°C anti-bacterial hygiene",
    badge: "POPULAR OFFER",
    badgeColor: "#22C55E",
    theme: "emerald_festive",
    rewardAmount: 50,
    ctaText: "Book Wash ➔",
    ctaLink: "/services",
    actionType: "internal_route",
    audience: "customers",
    priority: 2,
    isActive: true,
  },
  {
    _id: "banner_dryclean_vip",
    id: "banner_dryclean_vip",
    title: "Italian Hydrocarbon Dry Cleaning",
    subtitle: "100% PERC-free solvent care for blazers, lehengas & silks",
    badge: "FABRIC SAFE",
    badgeColor: "#3B82F6",
    theme: "blue_vip",
    rewardAmount: 100,
    ctaText: "Explore Rates ➔",
    ctaLink: "/services",
    actionType: "internal_route",
    audience: "all",
    priority: 3,
    isActive: true,
  },
  {
    _id: "banner_partner_referral",
    id: "banner_partner_referral",
    title: "Refer a Laundromat Hub & Earn ₹5,000",
    subtitle: "Equip neighborhood dry cleaners with industrial vacuum steam tables",
    badge: "PARTNER PROGRAM",
    badgeColor: "#8B5CF6",
    theme: "purple_franchise",
    rewardAmount: 5000,
    ctaText: "Partner Details ➔",
    ctaLink: "/b2b",
    actionType: "internal_route",
    audience: "partners",
    priority: 4,
    isActive: true,
  },
];

const DEFAULT_BLOGS: AdminBlog[] = [
  {
    _id: "blog_kasganj_mission",
    id: "blog_kasganj_mission",
    slug: "how-quickpress-is-organizing-bharats-laundry-economy",
    title: "How QuickPress is Organizing Bharat's ₹2.5 Lakh Crore Laundry Economy",
    excerpt: "From the historic streets of Kasganj to Western UP, how our proprietary 3-way app grid connects everyday households with local dhobi entrepreneurs.",
    content: `We didn't conceive QuickPress sitting in an air-conditioned glass skyscraper in Bangalore or Gurgaon. It was built on the ground in Kasganj, listening to mothers scrub heavy cotton uniforms with sore hands, students rushing for early morning college, and traditional iron-wallahs battling erratic voltage fluctuations.

India's garment care market is overwhelmingly fragmented. Over 96% of neighborhood dry cleaners and local dhobis operate without digital order tracking, industrial steam tables, or predictable customer flow. QuickPress bridges this divide by equipping existing hubs with Italian vacuum steam pressing tables, medical-grade hygiene chemicals, and an algorithmic 10-minute captain dispatch network.

Today, every garment processed through QuickPress carries a digital barcode audit trail, verified on calibrated scales right at the customer's doorstep with ₹5,000 zero-loss protection. This is how deep-tech solves real grassroots problems.`,
    category: "Company News",
    coverImage: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    author: "Himanshu Pal",
    authorRole: "Founder & Chief Executive Officer",
    readTime: "4 min read",
    isSlider: true,
    isFeatured: true,
    priority: 1,
    isActive: true,
  },
  {
    _id: "blog_fabric_science",
    id: "blog_fabric_science",
    slug: "the-science-of-garment-care-80c-thermal-sanitization",
    title: "The Science of Garment Care: 80°C Thermal Sanitization vs Conventional Washing",
    excerpt: "Why boiling detergents damage delicate weaves while our hypoallergenic enzymatic wash cycle eliminates 99.9% of dust mites and bacteria safely.",
    content: `Garment longevity depends entirely on water chemistry and thermal control. Traditional household washing machines frequently mix hard groundwater with harsh alkaline detergents, stripping textile fibers and causing early fabric fraying.

At QuickPress certified hubs, we implement a multi-stage RO water treatment system paired with German hypoallergenic enzymes. For heavy quilts, bed linens, and hospital uniforms, our computerized commercial drums achieve medical-grade 80°C anti-bacterial thermal sanitization without fabric scorch or color bleeding.

Delicate garments, silk sarees, and corporate blazers are processed with hydrocarbon eco-solvents—100% free of carcinogenic perchloroethylene (PERC).`,
    category: "Fabric Care",
    coverImage: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "",
    author: "Garment Science Desk",
    authorRole: "Textile Engineering Lead",
    readTime: "5 min read",
    isSlider: true,
    isFeatured: true,
    priority: 2,
    isActive: true,
  },
  {
    _id: "blog_dhobi_empowerment",
    id: "blog_dhobi_empowerment",
    slug: "from-charcoal-irons-to-italian-vacuum-tables",
    title: "From Charcoal Irons to Italian Vacuum Steam Tables: Empowering Local Dhobi Partners",
    excerpt: "Meet Ramesh Kumar, whose neighborhood shop in Kasganj transformed from earning ₹800 a day to managing a ₹1.2 Lakh monthly digitally routed hub.",
    content: `For three generations, Ramesh Kumar and his family heated heavy 6kg charcoal irons inside a tiny 100 sq ft stall. Charcoal dust constantly threatened clean white shirts, and power cuts in the afternoon meant zero work could be done.

When Ramesh onboarded with QuickPress in 2024, our partner operations team installed an industrial vacuum steam pressing table powered by high-efficiency boilers. With orders routed directly to his store tablet from nearby neighborhoods, his daily processing output tripled while physical fatigue dropped dramatically.

"QuickPress did not replace our shop; it made our shop modern," says Ramesh. We are proud to expand this model across hundreds of micro-entrepreneurs in Uttar Pradesh.`,
    category: "Partner Stories",
    coverImage: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "",
    author: "Partner Success Team",
    authorRole: "Hyperlocal Hub Operations",
    readTime: "6 min read",
    isSlider: true,
    isFeatured: true,
    priority: 3,
    isActive: true,
  },
  {
    _id: "blog_dispatch_algorithm",
    id: "blog_dispatch_algorithm",
    slug: "inside-the-quickpress-10-minute-captain-dispatch-grid",
    title: "Inside the QuickPress 10-Minute Captain Dispatch Grid",
    excerpt: "How our geo-fenced batching algorithm groups nearby pickups and drop-offs to maintain sub-12 minute door arrival with zero carbon waste.",
    content: `Hyperlocal logistics in Tier 2 and Tier 3 cities require a radically different architectural approach than Tier 1 metros. Streets are narrower, GPS waypoints are frequently offset, and road conditions change rapidly during monsoons.

Our routing engine calculates multi-order clustering based on live rider coordinates, partner hub capacity, and delivery deadlines. When a customer books a 45-minute pickup, the system dispatches the nearest active Captain within 30 seconds, complete with turn-by-turn navigation and digital weight scale pairing via Bluetooth.

The result: 99.8% on-time execution and sustainable per-kilometer captain earnings.`,
    category: "Technology",
    coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "",
    author: "QuickPress Engineering",
    authorRole: "Logistics Systems Team",
    readTime: "5 min read",
    isSlider: false,
    isFeatured: false,
    priority: 4,
    isActive: true,
  },
  {
    _id: "blog_sneaker_spa",
    id: "blog_sneaker_spa",
    slug: "sneaker-spa-how-we-restore-suede-leather-and-knit-kicks",
    title: "Sneaker Spa: How We Restore Suede, Premium Leather, and Knit Kicks",
    excerpt: "A deep dive into deep foam cleaning, sole groove disinfection, suede nap revival, and hydrophobic nano-coating protection.",
    content: `Sneakers are an investment. Throwing high-grade leather kicks or delicate suede into a standard household washing machine ruins internal adhesives, stiffens suede fibers, and discolors white midsoles.

At the QuickPress Sneaker Spa, our trained shoe craftsmen perform a manual 7-stage restoration: dry brush surface dirt removal, hypoallergenic conditioning foam scrub, unyellowing UV sole oxidation, deep inner-lining disinfection, and a water-repellent nano shield.

Your favorite sneakers return fresh, odor-free, and sealed in breathable dust bags.`,
    category: "Fabric Care",
    coverImage: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "",
    author: "Sneaker Spa Craftsmen",
    authorRole: "Footwear Care Specialists",
    readTime: "3 min read",
    isSlider: false,
    isFeatured: false,
    priority: 5,
    isActive: true,
  },
];

const DEFAULT_CAREER_ROLES: AdminCareerJob[] = [
  {
    id: "eng-fullstack",
    title: "Senior Full-Stack Engineer (React 19 + Python 3.12)",
    department: "Engineering",
    location: "Remote / Hybrid (Kasganj / Noida)",
    type: "Full-Time",
    experience: "3–6 Years",
    desc: "Architect low-latency dispatch APIs, double-entry ledger settlement pipelines, and real-time WebSocket order tracking across our 3-app ecosystem.",
    responsibilities: [
      "Own core FastAPI microservices and Supabase PostgreSQL schema optimization",
      "Scale our React 19 + TanStack Router client applications for sub-second hydration",
      "Integrate hardware IoT Bluetooth weighing scales with captain mobile apps",
    ],
    isActive: true,
  },
  {
    id: "eng-mobile",
    title: "Lead Mobile Architect (Android / iOS / Capacitor)",
    department: "Engineering",
    location: "Remote / Hybrid",
    type: "Full-Time",
    experience: "4+ Years",
    desc: "Lead mobile development for the QuickPress Captain, Partner Store, and Customer applications with offline-first synchronization.",
    responsibilities: [
      "Design native background geo-fencing, turn-by-turn routing, and battery optimization",
      "Implement real-time push notification audio alarms for urgent order pickups",
      "Optimize APK size and memory footprints for low-spec Android devices in Tier 2/3 cities",
    ],
    isActive: true,
  },
  {
    id: "ops-hub-manager",
    title: "Central Logistics Hub Manager",
    department: "Operations",
    location: "Kasganj, Uttar Pradesh (On-Site)",
    type: "Full-Time",
    experience: "2–5 Years",
    desc: "Oversee daily laundry order throughput, captain dispatch queues, and strict garment care turnaround SLAs across our flagship Western UP hub.",
    responsibilities: [
      "Manage physical intake, digital weighing, and barcode tracking of thousands of daily garments",
      "Coordinate with local laundromat partners to ensure 80°C anti-bacterial hygiene protocols",
      "Maintain a 99.8% on-time dispatch and delivery SLA record",
    ],
    isActive: true,
  },
  {
    id: "growth-partner-onboarding",
    title: "Merchant Hub Growth Lead (Franchise Onboarding)",
    department: "Growth",
    location: "Western UP (Aligarh / Agra / Kasganj)",
    type: "Full-Time",
    experience: "2–4 Years",
    desc: "Onboard neighborhood dry cleaners and dhobis onto the QuickPress network, modernizing traditional workshops with Italian steam table setups.",
    responsibilities: [
      "Identify high-density laundry zones and build trust with local laundry shop owners",
      "Conduct store audits, equipment inspections, and digital POS app onboarding",
      "Drive partner retention, weekly earnings transparency, and volume scaling",
    ],
    isActive: true,
  },
  {
    id: "quality-garment-specialist",
    title: "Master Textile & Stain Restoration Specialist",
    department: "Quality & Care",
    location: "Kasganj Hub (On-Site)",
    type: "Full-Time",
    experience: "3+ Years",
    desc: "Champion fabric safety, delicate silk care, sneaker spa restoration, and hydrocarbon dry cleaning standards across our partner network.",
    responsibilities: [
      "Inspect care labels for delicate textiles (chiffon, cashmere, pure silks, wedding lehengas)",
      "Train partner staff on German enzymatic stain removals and solvent temperature control",
      "Resolve customer fabric grievances under our ₹5,000 Zero-Loss Guarantee",
    ],
    isActive: true,
  },
];

// --------------------------------------------------------------------------
// Local Storage Helper
// --------------------------------------------------------------------------

function readLocal<T>(key: string, fallback: T[]): T[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, items: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

// --------------------------------------------------------------------------
// Stories Endpoints
// --------------------------------------------------------------------------

export async function fetchAdminStories(): Promise<AdminStory[]> {
  try {
    const remote = await apiGetJson<AdminStory[]>("/api/admin/promotions/stories");
    if (Array.isArray(remote)) {
      writeLocal("qp_admin_stories", remote);
      return remote;
    }
  } catch {
    // fallback
  }
  return readLocal("qp_admin_stories", []);
}

export async function createAdminStory(payload: Omit<AdminStory, "_id" | "id">): Promise<AdminStory> {
  const storyId = `story_${Date.now()}`;
  const newStory: AdminStory = {
    _id: storyId,
    id: storyId,
    ...payload,
    createdAt: new Date().toISOString(),
  };

  const current = readLocal("qp_admin_stories", []);
  current.unshift(newStory);
  writeLocal("qp_admin_stories", current);

  try {
    const res = await apiPostJson<AdminStory>("/api/admin/promotions/stories", payload);
    return res || newStory;
  } catch {
    return newStory;
  }
}

export async function updateAdminStory(
  id: string,
  payload: Partial<AdminStory>
): Promise<AdminStory> {
  const current = readLocal("qp_admin_stories", []);
  const updatedList = current.map((s) => (s.id === id || s._id === id ? { ...s, ...payload } : s));
  writeLocal("qp_admin_stories", updatedList);

  try {
    const res = await apiPutJson<AdminStory>(`/api/admin/promotions/stories/${id}`, payload);
    return res || (updatedList.find((s) => s.id === id) as AdminStory);
  } catch {
    return updatedList.find((s) => s.id === id || s._id === id) as AdminStory;
  }
}

export async function deleteAdminStory(id: string): Promise<{ ok: boolean }> {
  const current = readLocal("qp_admin_stories", []);
  const filtered = current.filter((s) => s.id !== id && s._id !== id);
  writeLocal("qp_admin_stories", filtered);

  try {
    return await apiDeleteJson<{ ok: boolean }>(`/api/admin/promotions/stories/${id}`);
  } catch {
    return { ok: true };
  }
}

// --------------------------------------------------------------------------
// Banners Endpoints
// --------------------------------------------------------------------------

export async function fetchAdminBanners(): Promise<AdminBanner[]> {
  try {
    const remote = await apiGetJson<AdminBanner[]>("/api/admin/promotions/banners");
    if (Array.isArray(remote)) {
      writeLocal("qp_admin_banners", remote);
      return remote;
    }
  } catch {
    // fallback
  }
  return readLocal("qp_admin_banners", []);
}

export async function createAdminBanner(payload: Omit<AdminBanner, "_id" | "id">): Promise<AdminBanner> {
  const bannerId = `banner_${Date.now()}`;
  const newBanner: AdminBanner = {
    _id: bannerId,
    id: bannerId,
    ...payload,
    createdAt: new Date().toISOString(),
  };

  const current = readLocal("qp_admin_banners", []);
  current.unshift(newBanner);
  writeLocal("qp_admin_banners", current);

  try {
    const res = await apiPostJson<AdminBanner>("/api/admin/promotions/banners", payload);
    return res || newBanner;
  } catch {
    return newBanner;
  }
}

export async function updateAdminBanner(
  id: string,
  payload: Partial<AdminBanner>
): Promise<AdminBanner> {
  const current = readLocal("qp_admin_banners", []);
  const updatedList = current.map((b) => (b.id === id || b._id === id ? { ...b, ...payload } : b));
  writeLocal("qp_admin_banners", updatedList);

  try {
    const res = await apiPutJson<AdminBanner>(`/api/admin/promotions/banners/${id}`, payload);
    return res || (updatedList.find((b) => b.id === id) as AdminBanner);
  } catch {
    return updatedList.find((b) => b.id === id || b._id === id) as AdminBanner;
  }
}

export async function deleteAdminBanner(id: string): Promise<{ ok: boolean }> {
  const current = readLocal("qp_admin_banners", []);
  const filtered = current.filter((b) => b.id !== id && b._id !== id);
  writeLocal("qp_admin_banners", filtered);

  try {
    return await apiDeleteJson<{ ok: boolean }>(`/api/admin/promotions/banners/${id}`);
  } catch {
    return { ok: true };
  }
}

// --------------------------------------------------------------------------
// Blogs & Hero Sliders Endpoints
// --------------------------------------------------------------------------

export async function fetchAdminBlogs(): Promise<AdminBlog[]> {
  try {
    const remote = await apiGetJson<AdminBlog[]>("/api/admin/promotions/blogs");
    if (Array.isArray(remote)) {
      writeLocal("qp_admin_blogs", remote);
      return remote;
    }
  } catch {
    // fallback
  }
  return readLocal("qp_admin_blogs", []);
}

export async function createAdminBlog(payload: Omit<AdminBlog, "_id" | "id">): Promise<AdminBlog> {
  const blogId = `blog_${Date.now()}`;
  const newBlog: AdminBlog = {
    _id: blogId,
    id: blogId,
    ...payload,
    createdAt: new Date().toISOString(),
  };

  const current = readLocal("qp_admin_blogs", []);
  current.unshift(newBlog);
  writeLocal("qp_admin_blogs", current);

  try {
    const res = await apiPostJson<AdminBlog>("/api/admin/promotions/blogs", payload);
    return res || newBlog;
  } catch {
    return newBlog;
  }
}

export async function updateAdminBlog(
  id: string,
  payload: Partial<AdminBlog>
): Promise<AdminBlog> {
  const current = readLocal("qp_admin_blogs", []);
  const updatedList = current.map((b) => (b.id === id || b._id === id ? { ...b, ...payload } : b));
  writeLocal("qp_admin_blogs", updatedList);

  try {
    const res = await apiPutJson<AdminBlog>(`/api/admin/promotions/blogs/${id}`, payload);
    return res || (updatedList.find((b) => b.id === id) as AdminBlog);
  } catch {
    return updatedList.find((b) => b.id === id || b._id === id) as AdminBlog;
  }
}

export async function deleteAdminBlog(id: string): Promise<{ ok: boolean }> {
  const current = readLocal("qp_admin_blogs", []);
  const filtered = current.filter((b) => b.id !== id && b._id !== id);
  writeLocal("qp_admin_blogs", filtered);

  try {
    return await apiDeleteJson<{ ok: boolean }>(`/api/admin/promotions/blogs/${id}`);
  } catch {
    return { ok: true };
  }
}

// --------------------------------------------------------------------------
// Careers & Open Positions CMS
// --------------------------------------------------------------------------

export async function fetchAdminCareerJobs(): Promise<AdminCareerJob[]> {
  try {
    const remote = await apiGetJson<AdminCareerJob[]>("/api/admin/careers/jobs");
    if (Array.isArray(remote) && remote.length > 0) {
      writeLocal("qp_admin_career_jobs", remote);
      return remote;
    }
  } catch {
    // fallback
  }
  return readLocal("qp_admin_career_jobs", []);
}

export async function createAdminCareerJob(
  payload: Omit<AdminCareerJob, "_id" | "id"> & { id?: string }
): Promise<any> {
  const jobId = payload.id || `job_${Date.now()}`;
  const newJob: AdminCareerJob = {
    _id: jobId,
    id: jobId,
    ...payload,
    createdAt: new Date().toISOString(),
  };

  const current = readLocal("qp_admin_career_jobs", []);
  current.unshift(newJob);
  writeLocal("qp_admin_career_jobs", current);

  try {
    const res = await apiPostJson<any>("/api/admin/careers/jobs", payload);
    return res || newJob;
  } catch {
    return newJob;
  }
}

export async function updateAdminCareerJob(
  id: string,
  payload: Partial<AdminCareerJob>
): Promise<any> {
  const current = readLocal("qp_admin_career_jobs", []);
  const updatedList = current.map((j) => (j.id === id || j._id === id ? { ...j, ...payload } : j));
  writeLocal("qp_admin_career_jobs", updatedList);

  try {
    const res = await apiPutJson<any>(`/api/admin/careers/jobs/${id}`, payload);
    return res || (updatedList.find((j) => j.id === id) as AdminCareerJob);
  } catch {
    return updatedList.find((j) => j.id === id || j._id === id) as AdminCareerJob;
  }
}

export async function deleteAdminCareerJob(id: string): Promise<{ ok: boolean }> {
  const current = readLocal("qp_admin_career_jobs", []);
  const filtered = current.filter((j) => j.id !== id && j._id !== id);
  writeLocal("qp_admin_career_jobs", filtered);

  try {
    return await apiDeleteJson<{ ok: boolean }>(`/api/admin/careers/jobs/${id}`);
  } catch {
    return { ok: true };
  }
}
