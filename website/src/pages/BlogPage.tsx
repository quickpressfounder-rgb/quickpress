import React, { useState, useEffect } from "react";
import { PageType, ModalType, BlogPost } from "@/types";

const SEED_BLOGS: BlogPost[] = [
  {
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
    createdAt: "2026-11-14T10:00:00Z",
  },
  {
    id: "blog_fabric_science",
    slug: "the-science-of-garment-care-80c-thermal-sanitization",
    title: "The Science of Garment Care: 80°C Thermal Sanitization vs Conventional Washing",
    excerpt: "Why boiling detergents damage delicate weaves while our hypoallergenic enzymatic wash cycle eliminates 99.9% of dust mites and bacteria safely.",
    content: `Garment longevity depends entirely on water chemistry and thermal control. Traditional household washing machines frequently mix hard groundwater with harsh alkaline detergents, stripping textile fibers and causing early fabric fraying.

At QuickPress certified hubs, we implement a multi-stage RO water treatment system paired with German hypoallergenic enzymes. For heavy quilts, bed linens, and hospital uniforms, our computerized commercial drums achieve medical-grade 80°C anti-bacterial thermal sanitization without fabric scorch or color bleeding.

Delicate garments, silk sarees, and corporate blazers are processed with hydrocarbon eco-solvents—100% free of carcinogenic perchloroethylene (PERC).`,
    category: "Fabric Care",
    coverImage: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=1200&q=80",
    author: "Garment Science Desk",
    authorRole: "Textile Engineering Lead",
    readTime: "5 min read",
    isSlider: true,
    isFeatured: true,
    priority: 2,
    createdAt: "2026-11-12T14:30:00Z",
  },
  {
    id: "blog_dhobi_empowerment",
    slug: "from-charcoal-irons-to-italian-vacuum-tables",
    title: "From Charcoal Irons to Italian Vacuum Steam Tables: Empowering Local Dhobi Partners",
    excerpt: "Meet Ramesh Kumar, whose neighborhood shop in Kasganj transformed from earning ₹800 a day to managing a ₹1.2 Lakh monthly digitally routed hub.",
    content: `For three generations, Ramesh Kumar and his family heated heavy 6kg charcoal irons inside a tiny 100 sq ft stall. Charcoal dust constantly threatened clean white shirts, and power cuts in the afternoon meant zero work could be done.

When Ramesh onboarded with QuickPress in 2024, our partner operations team installed an industrial vacuum steam pressing table powered by high-efficiency boilers. With orders routed directly to his store tablet from nearby neighborhoods, his daily processing output tripled while physical fatigue dropped dramatically.

'QuickPress did not replace our shop; it made our shop modern,' says Ramesh. We are proud to expand this model across hundreds of micro-entrepreneurs in Uttar Pradesh.`,
    category: "Partner Stories",
    coverImage: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1200&q=80",
    author: "Partner Success Team",
    authorRole: "Hyperlocal Hub Operations",
    readTime: "6 min read",
    isSlider: true,
    isFeatured: true,
    priority: 3,
    createdAt: "2026-11-10T09:00:00Z",
  },
  {
    id: "blog_dispatch_algorithm",
    slug: "inside-the-quickpress-10-minute-captain-dispatch-grid",
    title: "Inside the QuickPress 10-Minute Captain Dispatch Grid",
    excerpt: "How our geo-fenced batching algorithm groups nearby pickups and drop-offs to maintain sub-12 minute door arrival with zero carbon waste.",
    content: `Hyperlocal logistics in Tier 2 and Tier 3 cities require a radically different architectural approach than Tier 1 metros. Streets are narrower, GPS waypoints are frequently offset, and road conditions change rapidly during monsoons.

Our routing engine calculates multi-order clustering based on live rider coordinates, partner hub capacity, and delivery deadlines. When a customer books a 45-minute pickup, the system dispatches the nearest active Captain within 30 seconds, complete with turn-by-turn navigation and digital weight scale pairing via Bluetooth.

The result: 99.8% on-time execution and sustainable per-kilometer captain earnings.`,
    category: "Technology",
    coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80",
    author: "QuickPress Engineering",
    authorRole: "Logistics Systems Team",
    readTime: "5 min read",
    isSlider: false,
    isFeatured: false,
    priority: 4,
    createdAt: "2026-11-08T16:00:00Z",
  },
  {
    id: "blog_sneaker_spa",
    slug: "sneaker-spa-how-we-restore-suede-leather-and-knit-kicks",
    title: "Sneaker Spa: How We Restore Suede, Premium Leather, and Knit Kicks",
    excerpt: "A deep dive into deep foam cleaning, sole groove disinfection, suede nap revival, and hydrophobic nano-coating protection.",
    content: `Sneakers are an investment. Throwing high-grade leather kicks or delicate suede into a standard household washing machine ruins internal adhesives, stiffens suede fibers, and discolors white midsoles.

At the QuickPress Sneaker Spa, our trained shoe craftsmen perform a manual 7-stage restoration: dry brush surface dirt removal, hypoallergenic conditioning foam scrub, unyellowing UV sole oxidation, deep inner-lining disinfection, and a water-repellent nano shield.

Your favorite sneakers return fresh, odor-free, and sealed in breathable dust bags.`,
    category: "Fabric Care",
    coverImage: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1200&q=80",
    author: "Sneaker Spa Craftsmen",
    authorRole: "Footwear Care Specialists",
    readTime: "3 min read",
    isSlider: false,
    isFeatured: false,
    priority: 5,
    createdAt: "2026-11-05T12:00:00Z",
  },
  {
    id: "blog_sustainability",
    slug: "saving-1-million-liters-of-clean-water-our-green-pledge",
    title: "Saving 1 Million Liters of Clean Water: Our Green Eco-Care Pledge",
    excerpt: "How water recycling filtration, low-temp bio detergents, and reusable waterproof laundry bags cut single-use plastic by 100%.",
    content: `Garment care cannot come at the expense of our planet. Traditional home washing consumes upwards of 60 liters of water per 5kg load, often discharging unfiltered chemical residue into local waterways.

QuickPress partner hubs employ closed-loop water treatment units that filter and recirculate rinse water, cutting net consumption by 45%. Moreover, we have eliminated single-use polythene wrapping across all daily orders, replacing them with multi-use waterproof nylon bags that customers keep and exchange on every order.

Clean clothes, clean consciousness.`,
    category: "Sustainability",
    coverImage: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
    author: "Eco-Care Initiative",
    authorRole: "Sustainability & ESG Desk",
    readTime: "4 min read",
    isSlider: false,
    isFeatured: false,
    priority: 6,
    createdAt: "2026-11-01T11:00:00Z",
  },
];

export function BlogPage({
  onNavigate,
  onOpenModal,
}: {
  onNavigate: (page: PageType) => void;
  onOpenModal: (type: ModalType) => void;
}) {
  const [blogs, setBlogs] = useState<BlogPost[]>(SEED_BLOGS);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSliderIndex, setActiveSliderIndex] = useState<number>(0);
  const [readingBlog, setReadingBlog] = useState<BlogPost | null>(null);

  // Fetch live blogs from Backend API with seamless fallback
  useEffect(() => {
    fetch("/api/promotions/blogs")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("API fallback");
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setBlogs(data);
        }
      })
      .catch(() => {
        // Retain seed data
      });
  }, []);

  // Slider items: blogs with isSlider === true
  const sliderBlogs = blogs.filter((b) => b.isSlider) || blogs.slice(0, 3);

  // Auto-advance slider every 6 seconds
  useEffect(() => {
    if (sliderBlogs.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSliderIndex((prev) => (prev + 1) % sliderBlogs.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [sliderBlogs.length]);

  const categories = ["All", "Company News", "Fabric Care", "Partner Stories", "Technology", "Sustainability"];

  const filteredBlogs = blogs.filter((b) => {
    const matchesCat = selectedCategory === "All" || b.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      !searchQuery.trim() ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const activeSlide = sliderBlogs[activeSliderIndex] || sliderBlogs[0];

  return (
    <div className="pt-20 pb-24 bg-white text-zinc-950 font-sans selection:bg-[#22c55e] selection:text-black overflow-hidden space-y-16">
      {/* ─── Page Title Header ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-mono font-bold text-zinc-900 shadow-xs mb-4">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-ping" />
          <span>QUICKPRESS BLOG &amp; STORIES</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black text-black tracking-tight">
          Stories, Science &amp; <span className="text-[#16a34a]">The Ground Reality.</span>
        </h1>
        <p className="text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto mt-3 font-medium">
          Insights into India's garment care revolution, engineering hyperlocal dispatch, and fabric restoration science.
        </p>
      </section>

      {/* ─── Hero Slider / Carousel (Zomato-Style Featured Story) ─────────── */}
      {activeSlide && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden border-2 border-zinc-200 hover:border-black transition-all duration-300 shadow-2xl bg-zinc-950 group">
            {/* Background Image with Gradient Overlay */}
            <div className="relative h-[380px] sm:h-[480px] w-full overflow-hidden">
              <img
                src={activeSlide.coverImage}
                alt={activeSlide.title}
                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

              {/* Slider Controls */}
              <div className="absolute top-6 right-6 flex items-center gap-2 z-20">
                <button
                  type="button"
                  onClick={() => setActiveSliderIndex((prev) => (prev - 1 + sliderBlogs.length) % sliderBlogs.length)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Previous story"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSliderIndex((prev) => (prev + 1) % sliderBlogs.length)}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
                  aria-label="Next story"
                >
                  →
                </button>
              </div>

              {/* Slide Content Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-12 z-10 space-y-4 max-w-3xl">
                <div className="flex items-center gap-3">
                  <span className="px-3.5 py-1 rounded-full bg-[#22c55e] text-black font-mono font-black text-xs uppercase tracking-wider">
                    {activeSlide.category}
                  </span>
                  {activeSlide.videoUrl && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-md text-xs font-mono font-bold">
                      <svg className="w-3.5 h-3.5 fill-current text-[#22c55e]" viewBox="0 0 24 24">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      <span>Video Story</span>
                    </span>
                  )}
                  <span className="text-xs font-mono text-zinc-300">
                    {activeSlide.readTime}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  {activeSlide.title}
                </h2>

                <p className="text-xs sm:text-sm text-zinc-300 line-clamp-2 leading-relaxed font-medium">
                  {activeSlide.excerpt}
                </p>

                <div className="pt-2 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
                    <span className="font-bold text-white">{activeSlide.author}</span>
                    <span>•</span>
                    <span>{activeSlide.authorRole}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReadingBlog(activeSlide)}
                    className="px-6 py-3 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black text-xs font-mono uppercase tracking-wider transition-all shadow-lg hover:scale-105 cursor-pointer"
                  >
                    Read Full Story ➔
                  </button>
                </div>
              </div>
            </div>

            {/* Slider Dots */}
            <div className="absolute bottom-3 right-6 flex items-center gap-1.5 z-20">
              {sliderBlogs.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSliderIndex(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    activeSliderIndex === idx ? "w-8 bg-[#22c55e]" : "w-2 bg-white/40 hover:bg-white"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Search & Category Filter Bar ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl font-bold transition-all border-2 cursor-pointer ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? "bg-[#22c55e] text-black border-black shadow-md font-black"
                    : "bg-white text-zinc-700 border-zinc-200 hover:border-black"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search articles, care tips..."
              className="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-200 text-xs text-black focus:outline-none focus:border-black focus:ring-2 focus:ring-black/10 bg-white font-medium transition-colors"
            />
          </div>
        </div>

        {/* ─── Blog Articles Grid ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
          {filteredBlogs.map((blog) => (
            <article
              key={blog.id}
              onClick={() => setReadingBlog(blog)}
              className="group rounded-3xl border-2 border-zinc-200 hover:border-black bg-white overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1.5 cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Article Cover Image with Zoom */}
                <div className="relative h-52 w-full overflow-hidden bg-zinc-100">
                  <img
                    src={blog.coverImage}
                    alt={blog.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-white/90 backdrop-blur-md text-black font-mono font-bold text-[11px] shadow-xs">
                      {blog.category}
                    </span>
                    {blog.videoUrl && (
                      <span className="w-7 h-7 rounded-full bg-black/80 text-white flex items-center justify-center shadow-xs">
                        <svg className="w-3.5 h-3.5 fill-current text-[#22c55e]" viewBox="0 0 24 24">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </span>
                    )}
                  </div>
                </div>

                {/* Article Info */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span>{blog.readTime}</span>
                    <span>{new Date(blog.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>

                  <h3 className="text-lg font-black text-black tracking-tight leading-snug group-hover:text-[#16a34a] transition-colors">
                    {blog.title}
                  </h3>

                  <p className="text-xs text-zinc-600 line-clamp-3 leading-relaxed font-medium">
                    {blog.excerpt}
                  </p>
                </div>
              </div>

              {/* Author Footer */}
              <div className="p-6 pt-0 border-t border-zinc-100 flex items-center justify-between text-xs font-mono">
                <div>
                  <div className="font-bold text-black">{blog.author}</div>
                  <div className="text-[10px] text-zinc-500">{blog.authorRole}</div>
                </div>
                <span className="font-black text-black group-hover:translate-x-1 transition-transform">
                  ➔
                </span>
              </div>
            </article>
          ))}
        </div>

        {filteredBlogs.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <div className="text-4xl">🔍</div>
            <h3 className="text-lg font-black text-black">No articles match your search</h3>
            <p className="text-xs text-zinc-500">Try searching for different keywords or clear the category filter.</p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("All");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-xl bg-black text-white text-xs font-mono font-bold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* ─── Full Article Reader Modal ────────────────────────────────────── */}
      {readingBlog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border-2 border-black shadow-2xl relative">
            {/* Header Cover */}
            <div className="relative h-64 sm:h-80 w-full overflow-hidden">
              <img
                src={readingBlog.coverImage}
                alt={readingBlog.title}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setReadingBlog(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/80 hover:bg-black text-white flex items-center justify-center transition-all cursor-pointer font-mono font-bold text-lg shadow-lg z-20"
                aria-label="Close reader"
              >
                ✕
              </button>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                <span className="px-3 py-1 rounded-full bg-[#22c55e] text-black font-mono font-black text-xs uppercase">
                  {readingBlog.category}
                </span>
                <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
                  {readingBlog.title}
                </h2>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 sm:p-10 space-y-6">
              {/* Meta bar */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200 text-xs font-mono">
                <div>
                  <div className="font-black text-black">{readingBlog.author}</div>
                  <div className="text-zinc-500">{readingBlog.authorRole}</div>
                </div>
                <div className="text-right text-zinc-500">
                  <div>{readingBlog.readTime}</div>
                  <div>{new Date(readingBlog.createdAt).toLocaleDateString("en-IN", { month: "long", day: "numeric", year: "numeric" })}</div>
                </div>
              </div>

              {/* Video embed if present */}
              {readingBlog.videoUrl && (
                <div className="p-4 rounded-2xl bg-zinc-100 border border-zinc-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-black uppercase">
                    <svg className="w-4 h-4 text-[#16a34a]" fill="currentColor" viewBox="0 0 24 24">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Featured Video Attachment</span>
                  </div>
                  <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
                    <iframe
                      src={readingBlog.videoUrl.replace("watch?v=", "embed/")}
                      title={readingBlog.title}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}

              {/* Formatted Content */}
              <div className="text-sm sm:text-base text-zinc-800 leading-relaxed font-sans space-y-4 font-normal whitespace-pre-line">
                {readingBlog.content}
              </div>

              {/* Share & Actions */}
              <div className="pt-6 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs font-mono font-bold text-zinc-500">
                  Share this story:
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${readingBlog.title} - Read more on QuickPress: https://withquickpress.com/#blog`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-black hover:text-white transition-all font-bold"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(readingBlog.title)}&url=https://withquickpress.com/#blog`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-black hover:text-white transition-all font-bold"
                  >
                    X (Twitter)
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert("Article link copied to clipboard!");
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#22c55e] hover:bg-[#16a34a] text-black font-black"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

