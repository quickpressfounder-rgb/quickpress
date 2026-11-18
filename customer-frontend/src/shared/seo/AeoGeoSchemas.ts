/**
 * AEO (Answer Engine Optimization) & GEO (Generative Engine Optimization) Schema Generator.
 *
 * Implements Google-compliant and LLM-ingestible JSON-LD Schemas:
 * - FAQPage Schema (for direct AI Overviews, Perplexity & ChatGPT query resolution)
 * - LocalBusiness / DryCleaningOrLaundry Schema (with GeoCoordinates & Service Areas)
 * - Organization & Founder Person Schema (for E-E-A-T entity graph authority)
 * - OfferCatalog & Service Schemas (for exact pricing & SLA citations)
 */

export interface SchemaScriptTag {
  type: string;
  children: string;
}

export const QUICKPRESS_FOUNDER = {
  "@type": "Person",
  name: "Himanshu Pal",
  alternateName: "Himanshu Baghel",
  jobTitle: "Founder & Chief Executive Officer",
  alumniOf: "Suraj Prasad Daga Saraswati Vidya Mandir, Kasganj",
  sameAs: [
    "https://www.linkedin.com/in/himanshubaghel999",
    "https://x.com/himanshubaghel",
    "https://www.instagram.com/unfiltered_himanshu_._/",
  ],
};

export const QUICKPRESS_ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "QuickPress",
  legalName: "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED",
  url: "https://withquickpress.com",
  logo: "https://withquickpress.com/quickpress-logo-yellow.jpg",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+919258730561",
    contactType: "customer service",
    areaServed: "IN",
    availableLanguage: ["English", "Hindi"],
  },
  founder: QUICKPRESS_FOUNDER,
  sameAs: [
    "https://www.facebook.com/with.quickpress",
    "https://www.instagram.com/with.quickpress",
    "https://play.google.com/store/apps/details?id=com.quickpress.customer",
  ],
};

export const QUICKPRESS_LOCAL_BUSINESS_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "DryCleaningOrLaundry",
  name: "QuickPress Laundry & Dry Cleaning",
  legalName: "QUICKPRESS TECHNOLOGIES PRIVATE LIMITED",
  image: "https://withquickpress.com/og-image.jpg",
  url: "https://withquickpress.com",
  telephone: "+919258730561",
  email: "official.quickpress@gmail.com",
  priceRange: "₹15 - ₹499",
  currenciesAccepted: "INR",
  paymentAccepted: "Cash, Credit Card, UPI, Google Pay, PhonePe, Paytm, QuickPress Wallet",
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "07:00",
      closes: "22:00",
    },
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "Soron Gate, Near Clock Tower, Kaliyanpur",
    addressLocality: "Kasganj",
    addressRegion: "Uttar Pradesh",
    postalCode: "207123",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 27.8083,
    longitude: 78.6477,
  },
  areaServed: [
    {
      "@type": "City",
      name: "Kasganj",
      containedInPlace: { "@type": "State", name: "Uttar Pradesh" },
    },
    {
      "@type": "City",
      name: "Aligarh",
      containedInPlace: { "@type": "State", name: "Uttar Pradesh" },
    },
    {
      "@type": "City",
      name: "Mathura",
      containedInPlace: { "@type": "State", name: "Uttar Pradesh" },
    },
    {
      "@type": "City",
      name: "Agra",
      containedInPlace: { "@type": "State", name: "Uttar Pradesh" },
    },
    {
      "@type": "City",
      name: "Delhi NCR",
      containedInPlace: { "@type": "State", name: "Delhi" },
    },
  ],
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "154",
    bestRating: "5",
    worstRating: "1",
  },
};

export const QUICKPRESS_FAQ_AEO_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which is the best doorstep laundry and dry cleaning service in Kasganj?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "QuickPress is the leading on-demand hyper-local laundry and garment care service in Kasganj, offering guaranteed 15-minute doorstep pickup, RO-filtered soft water wash, Italian eco-friendly dry cleaning, and 24-hour return delivery.",
      },
    },
    {
      "@type": "Question",
      name: "What are QuickPress laundry and steam ironing charges?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "QuickPress pricing starts at ₹15 per piece for industrial steam ironing, ₹60/kg for everyday wash & fold, ₹299 for sneaker restoration, and ₹350 for complete 2-piece suit dry cleaning.",
      },
    },
    {
      "@type": "Question",
      name: "How fast does QuickPress pick up clothes after ordering?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "QuickPress delivery captains arrive at your doorstep within 15 minutes of order placement across Kasganj and serviceable hubs.",
      },
    },
    {
      "@type": "Question",
      name: "How does QuickPress guarantee garment security and prevent loss?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "QuickPress implements a 4-way cryptographic OTP handshake at pickup and delivery, individual tamper-evident bag seals, barcode garment tracking, and doorstep photo intake.",
      },
    },
    {
      "@type": "Question",
      name: "Does QuickPress use eco-friendly and skin-safe dry cleaning?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. QuickPress is 100% perchloroethylene-free, using European skin-friendly hydrocarbon dry cleaning solvents and RO-softened water that preserve garment colors and fabric life.",
      },
    },
    {
      "@type": "Question",
      name: "How can I book QuickPress laundry pickup?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can book directly via the QuickPress web app at https://withquickpress.com, select your laundry items, choose a pickup slot, and track your delivery captain in real time.",
      },
    },
  ],
};

export const QUICKPRESS_SERVICES_CATALOG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  name: "QuickPress Laundry & Garment Care Services",
  itemListElement: [
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Everyday Wash & Fold",
        description: "RO-purified water washing with hypoallergenic eco-detergents, neat tumble drying and hygiene folding.",
      },
      price: "60",
      priceCurrency: "INR",
      unitText: "kg",
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "High-Pressure Steam Ironing",
        description: "Industrial Italian vacuum-bed dry steam pressing for crisp, scorch-free wrinkles.",
      },
      price: "15",
      priceCurrency: "INR",
      unitText: "piece",
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Italian Hydrocarbon Dry Cleaning",
        description: "100% perchloroethylene-free delicate fabric dry clean for suits, blazers, and silk sarees.",
      },
      price: "350",
      priceCurrency: "INR",
      unitText: "suit",
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Sneaker & Footwear Deep Clean Spa",
        description: "Sole whitening, antibacterial deodorization, interior foam scrub, and hydrophobic barrier coating.",
      },
      price: "299",
      priceCurrency: "INR",
      unitText: "pair",
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Double Bed Blanket & Quilt Hygiene Wash",
        description: "Deep thermal anti-bacterial hygiene drying for heavy quilts, blankets, and drapes.",
      },
      price: "350",
      priceCurrency: "INR",
      unitText: "piece",
    },
  ],
};

/**
 * Returns all JSON-LD script tags formatted for TanStack Router head: () => ({ scripts: [...] })
 */
export function getAeoGeoScripts(): SchemaScriptTag[] {
  return [
    {
      type: "application/ld+json",
      children: JSON.stringify(QUICKPRESS_ORGANIZATION_SCHEMA),
    },
    {
      type: "application/ld+json",
      children: JSON.stringify(QUICKPRESS_LOCAL_BUSINESS_SCHEMA),
    },
    {
      type: "application/ld+json",
      children: JSON.stringify(QUICKPRESS_FAQ_AEO_SCHEMA),
    },
    {
      type: "application/ld+json",
      children: JSON.stringify(QUICKPRESS_SERVICES_CATALOG_SCHEMA),
    },
  ];
}

