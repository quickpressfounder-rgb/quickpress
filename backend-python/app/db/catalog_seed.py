"""Catalog seed documents for the Customer Home screen.

Loaded into MongoDB on first startup (idempotent). The same documents back the
in-memory store when Atlas is unavailable, so `/api/home` always answers.
"""

from __future__ import annotations

from typing import Any, Dict, List

BANNERS: List[Dict[str, Any]] = [
    {
        "_id": "b1",
        "eyebrow": "Limited period",
        "title": "30% OFF",
        "subtitle": "On your first three laundry pickups",
        "cta": "Claim offer",
        "tone": "primary",
        "redirectUrl": "/offers",
        "priority": 1,
    },
    {
        "_id": "b2",
        "eyebrow": "Free pickup",
        "title": "Doorstep pickup",
        "subtitle": "Zero pickup charges on every order above ₹299",
        "cta": "Book now",
        "tone": "green",
        "redirectUrl": "/services",
        "priority": 2,
    },
    {
        "_id": "b3",
        "eyebrow": "Premium care",
        "title": "Hand finished",
        "subtitle": "Fabric-safe cleaning with a 3-step quality check",
        "cta": "Explore",
        "tone": "dark",
        "redirectUrl": "/services",
        "priority": 3,
    },
]

CATEGORIES: List[Dict[str, Any]] = [
    {"_id": "c1", "title": "Wash & Fold", "description": "Everyday laundry", "icon": "washing-machine", "image": "/images/services/wash-fold.jpg", "sortOrder": 1},
    {"_id": "c2", "title": "Dry Cleaning", "description": "Delicate fabrics", "icon": "shirt", "image": "/images/services/dry-cleaning.jpg", "sortOrder": 2},
    {"_id": "c3", "title": "Steam Iron", "description": "Crisp finish", "icon": "flame", "image": "/images/services/steam-iron.jpg", "sortOrder": 3},
    {"_id": "c4", "title": "Premium Laundry", "description": "Hand finished", "icon": "sparkles", "image": "/images/services/premium-laundry.jpg", "sortOrder": 4},
    {"_id": "c5", "title": "Shoe Cleaning", "description": "Deep restore", "icon": "footprints", "image": "/images/services/shoe-cleaning.jpg", "sortOrder": 5},
    {"_id": "c6", "title": "Curtain Cleaning", "description": "Home fabrics", "icon": "blinds", "image": "/images/services/curtain-cleaning.jpg", "sortOrder": 6},
    {"_id": "c7", "title": "Blanket Cleaning", "description": "Bulky care", "icon": "bed-double", "image": "/images/services/blanket-cleaning.jpg", "sortOrder": 7},
    {"_id": "c8", "title": "Carpet Cleaning", "description": "Fibre deep wash", "icon": "layout-grid", "image": "/images/services/carpet-cleaning.jpg", "sortOrder": 8},
    {"_id": "c9", "title": "Bag & Leather Cleaning", "description": "Handbags, jackets & leather care", "icon": "briefcase", "image": "/images/services/bag-leather-cleaning.jpg", "sortOrder": 9},
]

SERVICES: List[Dict[str, Any]] = [
    # ⚡ 1. Steam Ironing (Pressing by Piece)
    {"_id": "s-iron-shirt", "name": "Shirt Steam Iron", "categoryId": "c3", "unit": "per piece", "price": 15, "image": "/images/services/steam-iron.jpg", "description": "Crisp wrinkle-free hanger finish for formal and casual shirts.", "badge": "Popular", "popular": True, "discountPercent": 0, "processingTime": "12 hrs"},
    {"_id": "s-iron-tshirt", "name": "T-Shirt Steam Iron", "categoryId": "c3", "unit": "per piece", "price": 12, "image": "/images/services/steam-iron.jpg", "description": "Gentle temperature-controlled steam press for cotton and polo tees.", "badge": "Daily Essential", "popular": True, "discountPercent": 0, "processingTime": "12 hrs"},
    {"_id": "s-iron-trouser", "name": "Trouser / Jeans Steam Iron", "categoryId": "c3", "unit": "per piece", "price": 15, "image": "/images/services/steam-iron.jpg", "description": "Sharp razor creases and flat line press for pants and denim.", "badge": "Popular", "popular": True, "discountPercent": 0, "processingTime": "12 hrs"},
    {"_id": "s-iron-kurta", "name": "Kurta / Pyjama Steam Iron", "categoryId": "c3", "unit": "per piece", "price": 25, "image": "/images/services/steam-iron.jpg", "description": "Traditional ethnic wear wrinkle-free steam pressing.", "badge": None, "popular": False, "discountPercent": 0, "processingTime": "12 hrs"},
    {"_id": "s-iron-saree", "name": "Saree Steam Press", "categoryId": "c3", "unit": "per piece", "price": 59, "image": "/images/services/steam-iron.jpg", "description": "Delicate temperature steam finish with roller packaging.", "badge": None, "popular": False, "discountPercent": 0, "processingTime": "12 hrs"},
    {"_id": "s-iron-blazer", "name": "Blazer / Coat Steam Iron", "categoryId": "c3", "unit": "per piece", "price": 69, "image": "/images/services/steam-iron.jpg", "description": "Form-retaining 3D vertical steam pressing for coats.", "badge": None, "popular": False, "discountPercent": 0, "processingTime": "12 hrs"},
    {"_id": "s-iron-bedsheet", "name": "Bedsheet Steam Iron", "categoryId": "c3", "unit": "per piece", "price": 29, "image": "/images/services/steam-iron.jpg", "description": "Large flat linen steam press and crisp hotel-fold.", "badge": None, "popular": False, "discountPercent": 0, "processingTime": "12 hrs"},

    # 👔 2. Dry Cleaning (Special Care by Piece)
    {"_id": "s-dc-shirt", "name": "Shirt Dry Clean", "categoryId": "c2", "unit": "per piece", "price": 79, "image": "/images/services/dry-cleaning.jpg", "description": "Eco-friendly solvent stain removal and crisp collar finish.", "badge": "Best Seller", "popular": True, "discountPercent": 15, "processingTime": "36 hrs"},
    {"_id": "s-dc-trouser", "name": "Trouser / Jeans Dry Clean", "categoryId": "c2", "unit": "per piece", "price": 79, "image": "/images/services/dry-cleaning.jpg", "description": "Deep solvent cleaning, spot treatment and sharp creasing.", "badge": "Popular", "popular": True, "discountPercent": 15, "processingTime": "36 hrs"},
    {"_id": "s-dc-suit2", "name": "2-Piece Suit Dry Clean", "categoryId": "c2", "unit": "per set", "price": 249, "image": "/images/services/dry-cleaning.jpg", "description": "Blazer + Trouser tailored luxury solvent care and hanger pack.", "badge": "Trending", "popular": True, "discountPercent": 20, "processingTime": "48 hrs"},
    {"_id": "s-dc-suit3", "name": "3-Piece Suit Dry Clean", "categoryId": "c2", "unit": "per set", "price": 349, "image": "/images/services/dry-cleaning.jpg", "description": "Jacket + Waistcoat + Trouser complete executive dry clean.", "badge": None, "popular": False, "discountPercent": 20, "processingTime": "48 hrs"},
    {"_id": "s-dc-blazer", "name": "Blazer / Coat Dry Clean", "categoryId": "c2", "unit": "per piece", "price": 149, "image": "/images/services/dry-cleaning.jpg", "description": "Solvent stain removal and shape preservation for suits.", "badge": None, "popular": True, "discountPercent": 10, "processingTime": "48 hrs"},
    {"_id": "s-dc-jacket", "name": "Winter Jacket / Bomber Dry Clean", "categoryId": "c2", "unit": "per piece", "price": 199, "image": "/images/services/dry-cleaning.jpg", "description": "Padded and down jacket deep soil and grime extraction.", "badge": None, "popular": False, "discountPercent": 10, "processingTime": "48 hrs"},
    {"_id": "s-dc-woolen", "name": "Woolen Sweater / Cardigan Dry Clean", "categoryId": "c2", "unit": "per piece", "price": 119, "image": "/images/services/dry-cleaning.jpg", "description": "Anti-shrink pure wool cleaning and de-pilling treatment.", "badge": None, "popular": False, "discountPercent": 0, "processingTime": "36 hrs"},
    {"_id": "s-dc-sherwani", "name": "Sherwani / Indo-Western Dry Clean", "categoryId": "c2", "unit": "per piece", "price": 399, "image": "/images/services/dry-cleaning.jpg", "description": "Heavy bridal and wedding wear solvent spa with bead care.", "badge": "Premium", "popular": False, "discountPercent": 0, "processingTime": "48 hrs"},

    # 🧺 3. Wash & Fold / Laundry (Per Kg & Daily Wear)
    {"_id": "s-wf-kg", "name": "Wash & Fold (Per Kg)", "categoryId": "c1", "unit": "per kg", "price": 79, "image": "/images/services/wash-fold.jpg", "description": "Daily wear clothes washed, dried & neatly folded.", "badge": "Best Value", "popular": True, "discountPercent": 20, "processingTime": "24 hrs"},
    {"_id": "s-wi-kg", "name": "Wash & Steam Iron (Per Kg)", "categoryId": "c1", "unit": "per kg", "price": 99, "image": "/images/services/wash-fold.jpg", "description": "Wash with fabric conditioner & professional steam ironing.", "badge": "Top Rated", "popular": True, "discountPercent": 20, "processingTime": "24 hrs"},
    {"_id": "s-wf-bedsheet", "name": "Bed Sheet Wash & Fold", "categoryId": "c1", "unit": "per piece", "price": 59, "image": "/images/services/wash-fold.jpg", "description": "Hygienic warm water sanitization and neat folding.", "badge": None, "popular": False, "discountPercent": 0, "processingTime": "24 hrs"},
    {"_id": "s-wf-towel", "name": "Towel & Bath Linen Wash", "categoryId": "c1", "unit": "per piece", "price": 29, "image": "/images/services/wash-fold.jpg", "description": "Deep disinfectant wash and extra fluff drying.", "badge": None, "popular": False, "discountPercent": 0, "processingTime": "24 hrs"},

    # ✨ 4. Premium Saree & Silk Care
    {"_id": "s-prem-saree", "name": "Silk Saree Dry Clean & Roll Polish", "categoryId": "c4", "unit": "per piece", "price": 249, "image": "/images/services/premium-laundry.jpg", "description": "Delicate pure silk wash, stain removal and roll polish finish.", "badge": "Heritage Care", "popular": True, "discountPercent": 10, "processingTime": "48 hrs"},
    {"_id": "s-prem-lehenga", "name": "Heavy Zari / Bridal Lehenga Spa", "categoryId": "c4", "unit": "per piece", "price": 499, "image": "/images/services/premium-laundry.jpg", "description": "Delicate stone and zari embroidery protection with hand finishing.", "badge": "Luxury", "popular": False, "discountPercent": 0, "processingTime": "72 hrs"},
    {"_id": "s-prem-gown", "name": "Designer Gown / Anarkali Dry Clean", "categoryId": "c4", "unit": "per piece", "price": 299, "image": "/images/services/premium-laundry.jpg", "description": "Multi-layer delicate fabric solvent extraction.", "badge": None, "popular": False, "discountPercent": 0, "processingTime": "48 hrs"},

    # 👟 5. Footwear & Bag Spa
    {"_id": "s-shoe-sneaker", "name": "Sneakers & Sports Shoes Deep Clean", "categoryId": "c5", "unit": "per pair", "price": 249, "image": "/images/services/shoe-cleaning.jpg", "description": "Deep sonic foam scrubbing, deodorizing and sole whitening.", "badge": "Trending", "popular": True, "discountPercent": 25, "processingTime": "48 hrs"},
    {"_id": "s-shoe-leather", "name": "Leather Shoes Cleaning & Polish", "categoryId": "c5", "unit": "per pair", "price": 299, "image": "/images/services/shoe-cleaning.jpg", "description": "Wax buffing, leather cream nourishment and mirror shine.", "badge": None, "popular": False, "discountPercent": 0, "processingTime": "48 hrs"},
    {"_id": "s-shoe-bag", "name": "Backpack & Handbag Cleaning", "categoryId": "c5", "unit": "per piece", "price": 199, "image": "/images/services/shoe-cleaning.jpg", "description": "Deep soil extraction, zipper conditioning and fabric sanitization.", "badge": None, "popular": False, "discountPercent": 0, "processingTime": "48 hrs"},

    # 🪟 6. Home Care, Blankets & Curtains
    {"_id": "s-home-blanket-single", "name": "Single Blanket / Quilt Wash", "categoryId": "c7", "unit": "per piece", "price": 249, "image": "/images/services/blanket-cleaning.jpg", "description": "Winter comforter sanitized, washed & sun fluff-dried.", "badge": "Winter Special", "popular": True, "discountPercent": 0, "processingTime": "48 hrs"},
    {"_id": "s-home-blanket-double", "name": "Double Blanket / Heavy Rajai Wash", "categoryId": "c7", "unit": "per piece", "price": 349, "image": "/images/services/blanket-cleaning.jpg", "description": "Heavy double winter quilt deep allergen extraction.", "badge": "Essential", "popular": True, "discountPercent": 0, "processingTime": "48 hrs"},
    {"_id": "s-home-curtain", "name": "Curtain Cleaning (Per Panel)", "categoryId": "c6", "unit": "per panel", "price": 199, "image": "/images/services/curtain-cleaning.jpg", "description": "Dust-free steam extraction and anti-shrink washing.", "badge": None, "popular": False, "discountPercent": 10, "processingTime": "36 hrs"},
    {"_id": "s-home-carpet", "name": "Carpet / Rug Deep Shampoo", "categoryId": "c8", "unit": "per carpet", "price": 449, "image": "/images/services/carpet-cleaning.jpg", "description": "Industrial fibre deep shampoo wash and stain extraction.", "badge": None, "popular": False, "discountPercent": 0, "processingTime": "48 hrs"},

    # 👜 7. Bag & Leather Cleaning
    {"_id": "s-exp-laundry", "name": "Leather Jacket & Coat Spa", "categoryId": "c9", "unit": "per piece", "price": 499, "image": "/images/services/bag-leather-cleaning.jpg", "description": "Deep conditioning, stain removal and leather nourishment.", "badge": "Special Care", "popular": True, "discountPercent": 10, "processingTime": "72 hrs"},
    {"_id": "s-exp-iron", "name": "Luxury Handbag & Purse Spa", "categoryId": "c9", "unit": "per piece", "price": 399, "image": "/images/services/bag-leather-cleaning.jpg", "description": "Interior sanitization, strap conditioning and hardware polish.", "badge": "Popular", "popular": False, "discountPercent": 0, "processingTime": "48 hrs"},
]

OFFERS: List[Dict[str, Any]] = [
    {"_id": "o1", "code": "CASH50", "title": "₹50 Cashback", "description": "On orders above ₹499 paid via wallet", "kind": "cashback", "discountLabel": "₹50 back", "expiresAt": None, "banner": None},
    {"_id": "o2", "code": "FEST25", "title": "25% Festive OFF", "description": "Flat 25% off on dry cleaning this week", "kind": "festival", "discountLabel": "25% OFF", "expiresAt": None, "banner": None},
    {"_id": "o3", "code": "REFER100", "title": "Refer & Earn ₹100", "description": "Both you and your friend get ₹100 credit", "kind": "referral", "discountLabel": "₹100", "expiresAt": None, "banner": None},
]

SEED: Dict[str, List[Dict[str, Any]]] = {
    "banners": BANNERS,
    "categories": CATEGORIES,
    "services": SERVICES,
    "offers": OFFERS,
}
