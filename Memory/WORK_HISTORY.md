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

---

## How to Pull Updates on the Live EC2 Server

Run this command in the terminal on the server:

```bash
cd ~/quickpress && git pull origin main && (cd website && npm run build && sudo cp -r dist/* /var/www/quickpress/website/)
```

If partner portal or backend files changed, run:
```bash
# Restart partner portal SSR server:
pm2 restart quickpress-partner

# Restart backend Docker container:
sudo docker restart quickpress-backend
```

