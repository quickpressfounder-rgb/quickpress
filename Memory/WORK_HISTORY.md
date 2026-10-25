¬# QuickPress Development Memory & Historical Work Log

> **MANDATORY FOR ALL AGENTS & DEVELOPERS:**
> After completing any task, feature, bug fix, or deployment, you **MUST** update this file (`Memory/WORK_HISTORY.md`).
> Keep this log up-to-date with dates, files modified, architectural decisions, live URLs, build verification statuses, and commit hashes.

---

## Architecture & Live Endpoints Quick Reference

| Component | Public Domain / URL | Deployment Type / Location |
| :--- | :--- | :--- |
| **Website (Official)** | `https://withquickpress.com` | Static Vite build served by Nginx (`/var/www/quickpress/website/`) |
| **Partner Console** | `https://quickpress.online` | TanStack Start SSR Node server on port `8082` (managed via PM2) |
| **Backend API** | `https://api.withquickpress.com` | Docker Container (`quickpress-backend`) / FastAPI on port `8000` |
| **Customer App** | APK / AAB / Web | React 19 + TanStack Router (`customer-frontend`) |
| **Captain App (Rider)** | APK / AAB / Web | React 19 + TanStack Router (`rider-frontend`) |
| **Admin Console** | Internal / Web | React + Vite (`admin-frontend`) |

### Official Statutory Legal URLs
- **Privacy Policy:** `https://withquickpress.com/#privacy`
- **Terms & Conditions:** `https://withquickpress.com/#terms`
- **Grievance / Contact:** `https://withquickpress.com/#contact`
- **About Us:** `https://withquickpress.com/#about`

### Official Contact Info
- **Support Email:** `official.quickpress@gmail.com`
- **Corporate Email:** `info@withquickpress.com`
- **Legal / Nodal:** `legal@withquickpress.com`
- **Official Brand Name:** **QuickPress** *(No suffixes like "Technologies Inc" or "Tech Pvt Ltd" in customer/partner/rider facing UI)*

---

## Detailed Log of Work Done Today (24 October 2026)

### 6. Mobile Responsiveness, Pure White Classic UI Theme, & Help / Review Access Everywhere
- **User Requests & Visual Alignment:**
  1. **Mobile Order Details Rebuild (`OrderDetailsScreen.tsx` < md):**
     - Completely removed the old cartoonish elements shown in user screenshot (giant green `OrderFlowCard`, blue Arrived pill, amber boxes, and the bottom blue `SWIPE TO VIEW REASON` bar).
     - Built a pure-white, black-text, high-density Zomato mobile order slip layout:
       - Header: Order #, Status pill, Placed time, Call Customer, Print Bill, Quick Order Help button (`/help?orderCode=...`).
       - Cancelled Alert: Pure white card with subtle rose border explaining cancellation reasons clearly without clutter.
       - Booked Items & Services: Elevated to the very top with item counts, rate cards, subtotal, and tax invoice download button.
       - Customer Information: Verified customer badge, direct phone relay, doorstep pickup location, and slot.
       - Delivery Fleet Captain: Real captain avatar/photo, vehicle plate, verified badge, direct call button, live GPS tracking, and 4-digit Dispatch OTP verification.
       - Order Help & Reviews Strip: 2 clean 1-tap buttons for "Order Help" (`/help`) and "Rate Order" (review modal).
       - Order Timeline: Minimal vertical stepper.
       - Bottom action bar: Renders clean tactile buttons only for active orders; no giant swipe buttons for cancelled orders.
  2. **Analytics Screen Pure White Theme (`AnalyticsScreen.tsx`):**
     - Replaced the large solid blue gradient `STORE NET PAYOUT ₹0` card with a pure white card (`bg-white border border-zinc-200 text-zinc-950`).
     - Replaced all metric card borders with neutral `border-zinc-200` and pure black text.
  3. **Help Centre & Reviews Accessible Everywhere:**
     - **Profile Screen (`PartnerProfileScreen.tsx`):** Added prominent "Customer Reviews & Ratings" (`/reviews`) and "Help Centre & Support Tickets" (`/help`) cards.
     - **Desktop Top Bar (`PartnerDesktopTopBar.tsx`):** Added Customer Reviews and Help Centre & Tickets in the profile dropdown menu.
     - **Bottom Navigation (`ZomatoBottomNav.tsx`):** Linked Reviews directly in the mobile navigation.
     - **Order Details (`OrderDetailsScreen.tsx`):** Added "Need Help with this Order?" button linking directly to `/help?orderCode=...` on both mobile and desktop.
  4. **Backend Tickets API 404 Fix:**
     - Added `@public_router.get("/tickets")` and `@public_router.post("/tickets")` with `optional_user` fallback in `backend-python/app/api/partner.py`.
     - Mounted `partner_public_router` and `partner_router` in `backend-python/app/main.py` both with and without `/api` prefix to prevent any proxy routing 404s.
- **Modified Files:**
  - `partner-frontend/src/screens/OrderDetailsScreen.tsx`
  - `partner-frontend/src/screens/AnalyticsScreen.tsx`
  - `partner-frontend/src/screens/PartnerProfileScreen.tsx`
  - `partner-frontend/src/components/layout/PartnerDesktopTopBar.tsx`
  - `partner-frontend/src/components/layout/ZomatoBottomNav.tsx`
  - `partner-frontend/src/components/orders/OrderCard.tsx`
  - `backend-python/app/api/partner.py`
  - `backend-python/app/main.py`
  - `Memory/WORK_HISTORY.md`
- **Build Verification:**
  - `npm run build:partner` -> Exit code 0 (Success)
  - `npm run build:customer` -> Exit code 0 (Success)

### 5. Full Real Help Centre, Review & Store Reply System, and Earnings Box Cleanup
- **User Requests & Visual Alignment:**
  1. **Removed Partner Net Earnings Box ("YE HATANA HAI"):** Completely removed the green `Partner Net Earnings (Net 84%): ₹249` container from the financial settlement breakdown in `partner-frontend/src/screens/OrderDetailsScreen.tsx`.
  2. **Full Real Help Centre in Classic Pure White Theme (`PartnerHelpScreen.tsx` & `/help`):**
     - **Header Helpline Strip:** Direct clickable calling to toll-free partner helpline (`1800-889-QUICK`), WhatsApp Merchant desk (`+91 98765 43210`), and official operations email (`official.quickpress@gmail.com`).
     - **Order-Wise Assistance ("Order wise helping"):** Order picker to select active/recent orders (`#PRT-XXXX`), order summary preview, and 5 instant SOP resolution tiles:
       - Customer Not Reachable at Doorstep (10-min wait SOP, secure call relay)
       - Delivery Captain Delayed / No-Show (SLA breach & priority reassignment)
       - Garment Count / Item Discrepancy (halt washing & bag verification)
       - Pre-existing Fabric Stain / Damage Warning (customer consent logging)
       - Order Settlement Discrepancy (ledger reconciliation)
     - **General Store & Operational Help ("Other help etc etc"):**
       - Payouts & Finance (daily 06:00 AM auto-settlement, updating bank IFSC, GST invoices)
       - Delivery Fleet & Logistics (4-digit Dispatch OTP verification SOP, standby captains)
       - Garment Care & Quality SOPs (standard finishing, ordering official QuickPress packaging bags)
       - Store Operations & Capacity (rush capacity pause, holiday & off-day schedules)
     - **Support Ticket System ("Full Real Help System"):**
       - Modal form to raise formal support tickets with Category, Order code, Priority (Normal, High, Urgent), Subject, and Description.
       - Ticket feed with status badges (`Open`, `In Review`, `Resolved`), Ticket reference `#TKT-XXXX`, and official support team resolutions.
       - Backend API endpoints `GET /api/partner/tickets` and `POST /api/partner/tickets`.
     - **Merchant FAQs & Guidelines:** Interactive accordion knowledge base with search filtering.
  3. **Complete Customer Review & Store Reply System (`PartnerReviewsScreen.tsx`, `/reviews` & Customer Profile):**
     - **Reviews Analytics:** Overall store rating (e.g. `4.9 ★`), 5-star to 1-star breakdown progress bars, response rate %, and customer sentiment badges (`Crisp Creases`, `Sealed Packaging`, `On-Time Delivery`).
     - **Filters:** By star rating (All, 5★, 4★, 3★, 2★, 1★) and reply status ("All", "Needs Reply", "Replied").
     - **Customer Reviews Feed:** Customer name, rating, linked order code `#PRT-XXXX` (with direct link to order), service category, customer review comment, and customer tags.
     - **Store Reply Feature ("reply de sake"):**
       - Inline reply composer with 1-click smart reply templates ("Thank you for trusting QuickPress!...", etc.).
       - Instant optimistic UI update, localStorage persistence, and backend sync via `POST /api/partner/reviews/{review_id}/reply`.
     - **Customer Profile Integration ("bo customer penal me partner profile me review show kare"):**
       - In `customer-frontend/src/routes/partner.$partnerId.tsx`, customer reviews now render the store response bubble (`Response from store: ...`) with store icon and formatted timestamp.
- **Verification:** Verified with `npm run build:partner` (exit code 0) and `npm run build:customer` (exit code 0).

### 4. Partner Console Streamlining, Transparent Logo & Zomato Order Ticket Redesign
- **User Requests & Visual Alignment:**
  1. **Menu Cleanup:** Removed non-essential promotional and peripheral menu options (`Ads`, `Offers`, `Customer complaints`, `Learning centre`, `Expansion hub`) from `PartnerSidebar.tsx` to keep partner focus strictly on core store operations (`Orders`, `Menu`, `Order history`, `Reporting`, `Finance`, `Outlet info`, `Reviews`, `Help centre`).
  2. **Top Bar Header Logo:** Processed the uploaded onboarding logo (`media_1792855994880.png`) using Pillow RGBA alpha-masking to completely remove the solid white background and tightly crop it (`quickpress-partner-transparent-logo.png`). Positioned the transparent image logo in `PartnerDesktopTopBar.tsx`.
  3. **Order Sound Buttons Removal:** Removed test sound buttons from `PartnerDesktopTopBar.tsx` (top circular spark/buzzer), `PartnerDashboardScreen.tsx` top ribbon (`Test Sound`), and empty queue state (`Test Order Sound`).
  4. **Unwanted Lines & Links Removed:**
     - Removed the bottom `Daily Settlement Status...` strip from `PartnerDashboardScreen.tsx`.
     - Removed the `Share feedback` text link from `PartnerDesktopTopBar.tsx`.
  5. **Order Details Screen Desktop Redesign (`OrderDetailsScreen.tsx`):**
     - Transformed the desktop order details view into a high-density, pure-white Zomato Merchant order ticket.
     - **Top Order Header:** Back to Orders button, large `#PRT-XXXX` order code with copy button, clean status badge, placed time, total bill amount, direct `Call Customer` button, and `Print Slip / Bill` button.
     - **Left Column (Primary Business Data - Immediate Visibility):**
       - **Booked Garments & Services Table:** Top-of-page tabular breakdown with garment name, SKU #, service chip, quantity, unit rate, and total line amount.
       - **Customer Special Instructions:** Clean highlighted quote block for partner garment handling instructions.
       - **Financial Settlement Slip:** Transparent subtotal, logistics fee, taxes, discount, total customer bill, and net 84% store payout calculation.
       - **Customer & Doorstep Address Card:** Clean customer card with rating, phone, verified customer badge, doorstep pickup address, and scheduled pickup slot.
       - **Logistics Delivery Captain Card:** Clean neutral styling showing assigned captain name, photo/avatar, rating, vehicle number, direct `Call Captain` button, and `Track Live GPS` button. Embedded inline physical Handshake Dispatch OTP verification input.
     - **Right Column (Operations & Progression):**
       - **Order Action Panel:** Clear plain-English stage summary, solid merchant action buttons (`size="compact"`), print bill CTA, and customer review button.
       - **Order Progression Stepper:** Clean vertical milestone audit trail.
     - **Modal Fix:** Moved `showRiderLocationModal` to root level so live GPS tracking works on both desktop and mobile.
- **Verification:** Verified with `npm run build:partner` (exit code 0, Nitro SSR build generated).

### 3. Zomato Partner Console Exact UI Match & Classic Monochrome Theme
- **Objective:** Replaced cartoonish multicolor cards and heavy banners with the **exact Zomato Restaurant Partner Panel layout** (`zomato.com/partners/onlineordering/orders/`):
  - **Full-Width Top Bar (`PartnerDesktopTopBar.tsx`):**
    - Left: `quickpress` clean bold lowercase brand wordmark matching `zomato` in Image 1.
    - Right: Blue AI assistance circle button, notification bell with red badge counter (`1`), settings gear icon `⚙️`, "Share feedback" text link, Store Status pill (`Offline ▾` with red indicator / `Online ▾` with green indicator), and Profile pill with avatar and user name (`Himanshu... ▾`).
  - **Sidebar (`PartnerSidebar.tsx`):**
    - Flush minimalist sidebar below top bar with floating collapse circle button (`‹` / `›`).
    - Clean menu items with outline icons: `Orders` (selected with subtle grey rounded rectangle `bg-zinc-100 font-bold text-zinc-950`), `Menu`, `Order history`, `Reporting`, `Offers`, `Ads`, `Finance ▾`, `Outlet info`, `Customer complaints`, `Reviews`, `Help centre`, `Learning centre`, `Expansion hub`.
    - Zero cartoon cards or badges inside sidebar.
  - **Offline View (`PartnerDashboardScreen.tsx` - `ZomatoOfflineView`):**
    - Exactly reproduced the hanging "CLOSED" signboard illustration from Image 1 with red mounting pin, ropes, and tilted board with "CLOSED" typography.
    - Centered "You are offline" heading and "Visit help centre for more details" subtitle with dotted underline.
    - "Go Online & Accept Orders" 1-click CTA button.
  - **Eliminated Multicolor Cards (`DashboardCards.tsx`):**
    - Removed cartoon yellow, cyan, purple, lime cards.
    - Converted all 4 Operational Overview cards to classic pure white cards with thin zinc borders (`border-zinc-200/90 bg-white`), neutral zinc icons, and bold black numbers.
    - Converted Revenue and Order Status Flow cards to clean neutral zinc styling.
  - **Layout Architecture (`PartnerLayout.tsx`):**
    - Top Bar now spans full-width across top; sidebar and main content sit cleanly below it.

### 2. Partner Console Desktop Redesign: Pure White Theme & Zomato Merchant UI/UX
- **Objective:** Upgrade the entire **Partner Panel Desktop View** (`https://quickpress.online`) to a **Pure White Theme** inspired by the **Zomato Merchant Partner Panel**, featuring smooth micro-animations, pure white backgrounds (`#ffffff`/`#fafafa`), soft emerald indicators (`emerald-600`/`emerald-50`), zero dark/black containers or buttons, and crisp typography (`text-zinc-950`).
- **1. Sidebar Navigation (`partner-frontend/src/components/layout/PartnerSidebar.tsx`):**
  - Converted sidebar to pure white merchant style with subtle borders (`border-r border-zinc-200/80 bg-white`).
  - Added transparent QuickPress Partner branding header (`/quickpress-partner-onboarding-transparent.png`).
  - Added live store acceptance toggle switch with glowing emerald beacon (`Accepting Orders 🟢` / `Store Paused 🔴`).
  - Active navigation pill styled with soft emerald badge (`bg-emerald-50 text-emerald-950 border border-emerald-200 font-extrabold`).
  - Styled sign-out button with soft rose hover rather than dark styling.
- **2. Top Header (`partner-frontend/src/components/layout/PartnerDesktopTopBar.tsx`):**
  - Pure white sticky header (`bg-white/95 backdrop-blur-md border-b border-zinc-200/80`).
  - Added 1-click **"Test Alert" (🔊)** sound test button calling `playPartnerOrderChime()`.
  - Replaced black notification badge with pulsing rose-500 badge (`bg-rose-500 text-white`).
  - Store status pill with live emerald indicator and pure white profile dropdown menu.
- **3. Order Table Layout vs. Order Cards (`PartnerDashboardScreen.tsx` & `OrdersScreen.tsx`):**
  - Added desktop **Cards vs. Table Layout Switcher** (`orderViewMode`: `"cards"` | `"table"`) with `<LayoutGrid />` and `<LayoutList />` toggle buttons.
  - Implemented high-density **Pure White Zomato Table Layout** with columns: Order ID, Customer Name & Phone, Services/Items chips, Pickup Time slot, Amount, Stage/Status pill, and 1-click action buttons (Accept, View Details).
  - Upgraded `OrderCard.tsx` and `OrderActionBar.tsx` to pure white cards with subtle zinc borders, micro-elevation hover lifts, and emerald action buttons.
  - Upgraded `ZomatoHubView.tsx` by replacing all black buttons/chips with emerald action buttons and zinc-100 chips.
- **4. Services / Rate Card Management (`ManageServicesScreen.tsx` & `ServiceCard.tsx`):**
  - Added Zomato-style horizontal category filter carousel (Wash & Fold, Steam Iron, Dry Clean, Shoe Care, Offers, Paused).
  - Upgraded `ServiceCard.tsx` to pure white menu card with instant availability switch toggle (`bg-emerald-600` for Live 🟢, `bg-zinc-300` for Paused ⏸️).
  - Eliminated dark buttons in catalog creation and custom service modals.
- **5. Shop Profile & Settings (`ShopManagementScreen.tsx`, `ShopProfileHeader.tsx`, `ShopEditSheet.tsx`, `BusinessSettingsScreen.tsx`, `PartnerProfileScreen.tsx`):**
  - Upgraded shop cover banner placeholder to pure white/emerald dashed container with zero dark gradients.
  - Replaced all black action buttons ("Edit Store Info", "Upload Cover", "New Change Request", "Save Changes") with vibrant emerald and pure white buttons.
  - Added buzzer sound test chime button in `BusinessSettingsScreen.tsx`.
- **Verification:**
  - `npm run build:partner` passed with 0 errors across client, server, and SSR environments.
  - `npm run build:rider` passed with 0 errors.

### 1. Legal Pages & Cross-App Statutory Integration
- **Objective:** Connect all legal, grievance, and policy screens across Customer, Partner, and Rider apps directly to the official live website (`https://withquickpress.com`), eliminating broken dummy URLs and detached copies.
- **Website Mobile Bypass (`website/src/utils/mobileAppRedirect.ts` & `website/src/App.tsx`):**
  - Updated `shouldBypassRedirect()` and router listeners to exempt `#privacy`, `#terms`, `#contact`, `#about`, `/privacy`, `/terms`, `/about`, `/contact`.
  - When mobile users tap legal links inside apps, the mobile redirect no longer prompts APK download; it cleanly displays the legal documents directly.
- **Customer Frontend:**
  - `customer-frontend/src/routes/legal.$docSlug.tsx`: Added `getWebsiteLegalUrl` pointing to `https://withquickpress.com/${targetHash}` and updated website button.
  - `customer-frontend/src/components/profile/AboutPage.tsx`: Connected Privacy, Terms, Refund Policy, and Grievance redressal to live website.
  - `customer-frontend/src/routes/login.tsx`: Clickwrap checkboxes open official website `#terms` and `#privacy`.
  - `customer-frontend/src/routes/checkout.tsx`: Pre-order legal disclosure opens official website policies.
  - `customer-frontend/src/routes/track.$orderId.tsx`: Order location tracking privacy disclosure linked to `#privacy`.
  - `customer-frontend/src/routes/profile.tsx`: Account deletion privacy notice linked to `#privacy`.
  - `customer-frontend/src/api/customer/referral-api.ts`: Replaced non-existent `quickpress.app/invite` with `https://withquickpress.com/invite`.
- **Partner Frontend:**
  - `partner-frontend/src/screens/PartnerAuthScreen.tsx`: Clickwrap and footer links point to `https://withquickpress.com/#terms`, `#privacy`, and `#contact`.
  - `partner-frontend/src/screens/BusinessSettingsScreen.tsx`: Fixed typo `with.quickpress.com` (extra dot) to `https://withquickpress.com/#privacy` and `#terms`.
  - `partner-frontend/src/routes/legal.$docSlug.tsx`: Pointed `handleOpenWebsite` and share link to `https://withquickpress.com/${targetHash}`.
  - `partner-frontend/src/screens/BusinessRegistrationScreen.tsx`: Standardized platform name to `QuickPress`.
  - `partner-frontend/src/components/onboarding/PartnerAgreementSignaturePad.tsx`: Standardized agreement header to `QUICKPRESS`.
- **Rider (Captain) Frontend:**
  - `rider-frontend/src/routes/legal.$docSlug.tsx`: Replaced dummy `quickpress.app` with `https://withquickpress.com/${targetHash}` in `handleOpenWebsite`, `handleShare`, and footer button.
  - `rider-frontend/src/screens/RiderAuthScreen.tsx`: Clickwrap Privacy & Terms linked to `https://withquickpress.com/#privacy` and `#terms`.
  - `rider-frontend/src/screens/RiderRegistrationScreen.tsx`: Agreement and privacy links connected to `https://withquickpress.com/#terms` and `#privacy`.
  - `rider-frontend/src/screens/CaptainGuidelinesScreen.tsx`: Web link pointed to `https://withquickpress.com/#privacy`.
  - `rider-frontend/src/components/CaptainLocationPermissionModal.tsx`: Fixed `with.quickpress.com` typo to `https://withquickpress.com/#privacy`.
  - `rider-frontend/src/api/rider/rider-support-api.ts` & `CaptainSupportModal.tsx`: Replaced `support@quickpress.app` with `official.quickpress@gmail.com`.
- **Backend & Admin:**
  - `backend-python/app/services/invoice_pdf_generator.py`: Changed `QuickPress Tech` to `QuickPress` and terms link to `https://withquickpress.com/#terms`.
  - `backend-python/app/services/rider_agreement_pdf_generator.py`: Changed header to `QUICKPRESS`.
  - `backend-python/app/db/referral_repositories.py`: Changed share URL base to `https://withquickpress.com/invite`.
  - `admin-frontend/src/lib/crm-pdf-export.ts`: Changed `QuickPress Technologies Private Limited` to `QuickPress`.
  - `admin-frontend/src/api/settings.ts`: Standardized platform support email to `official.quickpress@gmail.com`.

---

### 2. Brand Name Standardization Across Codebase
- **Removed Artificial Variations:**
  - Scrubbed "QuickPress Technologies Inc", "QuickPress Tech", "QuickPress Technologies", "Technologies Inc", "QuickPress Tech Pvt Ltd" across all customer, partner, rider frontends, PDFs, and legal headers.
  - Unified everything under the clean, official brand name: **QuickPress**.
- **Copyright Notices:** Standardized to:
  `© 2026 QuickPress. All rights reserved.`

---

### 3. Website Hero & UI Enhancements
- **Full Viewport Hero (`100vh`):**
  - Updated `website/src/pages/HomePage.tsx` hero section to take full viewport height (`min-h-screen` / `h-screen`).
  - Added vertical centering so the hero title, search bar, and app download strip sit cleanly on screen.
  - Cards below the hero ("Ultra-Fast Turnaround", "Hyper-Local Laundromats", etc.) are placed below the fold and only reveal when the user scrolls down.
- **Zomato-Style App Store & Play Store Strip:**
  - Implemented transparent glassmorphic download pill strip right beneath the search bar.
  - Added direct links to download Android APK / App Store.
  - Added bouncing "Scroll to explore" chevron micro-animation.
- **Permanent DPIIT Badge Removal:**
  - Removed DPIIT Startup India badge permanently from the homepage as per user directive.

---

### 4. Server & Multi-Site Infrastructure Setup
- **Automated EC2 Deployment Script (`scripts/deploy_production.sh`):**
  - Automates system dependencies (Node.js 20, Python 3.12, Nginx, Certbot, PM2).
  - Builds `website` and copies to `/var/www/quickpress/website/`.
  - Builds `partner-frontend` and runs it with PM2 on port `8082`.
  - Configures systemd for FastAPI backend on port `8000`.
- **Nginx Configuration (`scripts/nginx_quickpress.conf`):**
  - Handles SSL termination via Let's Encrypt for `withquickpress.com`, `quickpress.online`, and `api.withquickpress.com`.
- **Automated GitHub Actions CI/CD (`.github/workflows/deploy.yml`):**
  - Triggers automatically on push to `main` branch to update the live EC2 instance.

---

### 5. Android APK & AAB Production Builds
- Generated release Android binaries for all 3 applications configured against live API `https://api.withquickpress.com`:
  - `QuickPress-Customer.apk` & `QuickPress-Customer.aab`
  - `QuickPress-Partner.apk` & `QuickPress-Partner.aab`
  - `QuickPress-Captain.apk` & `QuickPress-Captain.aab`

---

### 6. Production Secrets Security & Docker Backend Launch (EC2: 65.0.127.43)
- **Secrets Inventory:** Documented all 24 production secrets across Database, Auth, Payments (Razorpay/Cashfree), SMS/WhatsApp (Fast2SMS/MSG91/Twilio), Media (Cloudinary), Email (SMTP/Resend), Push Notifications (OneSignal), and Maps.
- **Server `.env` Configuration:** Set up secure environment credentials in `~/quickpress/backend-python/.env` and mirrored to root `.env`.
- **Docker Containerization:**
  - Resolved invalid `.env` whitespace error in Docker caused by accidental bash command inside `.env`.
  - Built fresh production Docker image `quickpress-api:latest` from `Dockerfile`.
  - Launched live container `quickpress-backend` on port `8000` with automated restart policy (`--restart always`).

---

## Git Commit History for Today (24 Oct 2026)

| Commit Hash | Commit Message | Key Changes |
| :--- | :--- | :--- |
| `b553a6c` | `docs(memory): add workspace Memory/WORK_HISTORY.md and rule to update after every task` | Created permanent workspace Memory folder and added Rule 5 to AGENTS.md. |
| `f858450` | `feat(legal): connect all 3 apps legal documents to website and standardize brand to QuickPress` | Connected legal routes in all 3 apps to `withquickpress.com`, standardized brand to QuickPress, updated support emails. |
| `be70c6e` | `feat(website): permanently remove DPIIT recognition badge from website` | Removed DPIIT Startup India badge from HomePage. |
| `aefbdc0` | `feat(website): make hero full viewport so cards only reveal on scroll with transparent download strip` | Made hero 100vh full viewport so cards show only after scrolling down. |
| `4728601` | `ci(actions): add automated EC2 deployment workflow on git push to main` | Created `.github/workflows/deploy.yml` for automated SSH deployment to EC2. |
| `4f80d4f` | `feat(website): add Zomato-style Google Play & App Store strip with scroll indicator in hero...` | Added transparent download pill with bouncing scroll arrow. |
| `18bad73` | `fix(script): ensure partner-frontend npm dependencies are installed before build` | Added `npm install` check in deployment automation. |
| `b297b88` | `feat(partner): add ecosystem.config.cjs and start_partner.sh for bulletproof port 8082 startup` | PM2 configuration for Partner portal SSR server. |
| `15f1d62` | `feat(partner): run partner app as persistent Node server on port 8082 and configure Nginx proxy` | Nginx reverse proxy configuration for `quickpress.online`. |
| `1aa8b93` | `build(apks): point all APK builds to live AWS API https://api.withquickpress.com` | Re-built APK and AAB release binaries for Customer, Partner, and Captain. |
| `98c7866` | `feat(nginx): configure withquickpress.com for website and quickpress.online for partner portal` | Multi-domain Nginx virtual host configurations. |
| `001d0de` | `feat(deploy): add turnkey automated EC2 deployment script and nginx configuration` | Created `scripts/deploy_production.sh`. |

| `4ff4116` | `feat(partner): exact Zomato merchant panel layout, classic monochrome cards, and closed sign offline view` | Converted Partner desktop console to exact Zomato restaurant partner panel aesthetics: pure white sidebar, classic header with sound/bell/settings/profile, hanging CLOSED signboard offline view, and removed all cartoon multicolor cards. |
| `dcdac7a` | `fix(build): use npx vite build in package.json for ec2 compatibility` | Resolved `sh: 1: vite: not found` on Linux EC2 by wrapping subshell vite build commands with `npx`. |
| `38f5b2b` | `fix(partner): configure node-server nitro preset and explicit cwd to prevent 502 bad gateway` | Fixed 502 Bad Gateway by ensuring Nitro builds as `node-server` (not Cloudflare worker) and adding `cwd: __dirname` in `ecosystem.config.cjs`. |
| `7ccb850` | `feat(partner): exact Zomato online order station layout with canonical stage tabs, search and clean order cards` | Converted Online dashboard into dedicated Zomato Order Station: removed all cartoon operational cards and multi-column widgets; added canonical Zomato status tabs, search filter, order card grid / table layout, loud alert sound tester, and pure white empty state. |
| `a256336` | `feat(deploy): add turnkey update_server.sh for 1-click EC2 deploy` | One-command deployment script to pull code, build partner frontend, build docker backend, and reload Nginx. |
| `49200bf` | `feat(partner): clean white permissions screen without 0/5 clutter, rename menu to services, and itemized weekly order payout breakdown` | Redesigned permissions screen to pure white theme with instant status updates and unblocked continuation; removed 0/5 count, setup progress, and aggressive boxes; changed Menu to Services with laundry/layers icon in sidebar and bottom nav; expanded weekly payout modal with itemized commission, GST, and TCS breakdown per order. |
| `eae5eb0` | `feat(partner): convert settlement modal to full in-page view, remove instant payout & bank cards, add 7-day revenue bar chart & order filter table` | Converted popup settlement modal to a seamless full in-page view eliminating bottom cutoff; removed Instant Payout button & Verified Bank cards; added interactive 7-day Weekly Revenue & Payout Bar Chart; added real order-level ledger table with status/search filters; connected live admin commission rates and cache invalidation. |
| `7e2b19d` | `feat(partner): remove mock reviews & tickets, live ticket creation, clean mobile help center, and blue zomato splash` | Purged all mock reviews (DEFAULT_REVIEWS) and mock tickets (DEFAULT_TICKETS) from storage and API; added live MongoDB support ticket creation and resolution in backend; replaced mock order resolution cards and fake daily 6 AM settlement boxes in Help Centre with real escalation pathways and 7-day weekly guidance; redesigned splash screen to bold Zomato-style solid blue (#0055ff) with pure white quickpress wordmark, removing 'Partner Onboarding' subtitle. |
| `695c27f` | `feat(partner): clean mobile reviews scorecard and sticky top bar` | Replaced 3 stacked giant review analytics cards with a single compact Merchant Scorecard on mobile, added sticky mobile top bar, and horizontal scrolling pill filters. |
| `c94f4e9` | `feat(universal-links): connect store qr standee to withquickpress.com with smart mobile apk launch and desktop website storefront` | Connected Store QR Standee on Partner Console to official live domain `https://withquickpress.com/store/:partnerId`; configured device-smart redirection: launches Customer APK via Android Intent & iOS custom scheme on mobile, or renders rich desktop storefront with rate card and standee QR on PC/Mac; added intent filters and Capacitor deep link listener in Customer app; made Partner Help Centre mobile-responsive with compact 3-column contact strip; relaxed backend rate limiter and keyed authenticated users by token to eliminate 429 Too Many Requests errors. |

---

## How to Pull Updates on the Live EC2 Server

Run this single command in the EC2 terminal (`ubuntu@ip-172-31-2-28:~/quickpress`):

```bash
cd ~/quickpress && git pull origin main && bash scripts/update_server.sh
```

This single command will automatically:
1. Pull the latest code from GitHub `main`.
2. Rebuild `partner-frontend` with the new white theme & restart PM2 on port 8082.
3. Rebuild the FastAPI Docker image & restart the `quickpress-backend` container on port 8000 (fixing the `/partner/tickets` route).
4. Test and reload Nginx.

