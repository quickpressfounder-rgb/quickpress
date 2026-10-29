# QuickPress Repository File Map & Navigation Index

> **Verified Architecture & Functional Navigation Map**  
> *Last Updated: October 2026*  
> *Repository Type: Multi-Console Hyper-Local Marketplace Platform (Customer, Partner, Rider, Admin, Backend API, Website)*

---

## 1. System Architecture Overview

QuickPress is an on-demand garment care and dry-cleaning marketplace built as a unified monorepo. It connects four stakeholders:
1. **Customers:** Place orders, schedule pickups, track garment stages in real-time, inspect defects, manage wallets, and purchase memberships.
2. **Partners (Laundromats & Dry-Cleaners):** Accept incoming orders, log garment defects with photo proof, track processing stages, view earnings, and manage service catalogs.
3. **Delivery Captains (Riders):** Receive concentric-wave dispatch offers, navigate via in-app GPS HUD, manage pickup/drop verification codes, and track daily earnings.
4. **Operations & Finance HQ (Admins):** Double-entry general ledgers, 360-degree CRM lookup, dynamic fare/commission engines, live geospatial radar, and automated settlement engines.

```
                          ┌────────────────────────┐
                          │   Customer Frontend    │ (React 19 + TanStack Start/Router + Capacitor)
                          │   Port 8080 / Mobile   │
                          └───────────┬────────────┘
                                      │
                          ┌───────────┴────────────┐
                          │    Partner Frontend    │ (React 19 + TanStack Start/Router + Capacitor)
                          │   Port 8082 / Mobile   │
                          └───────────┬────────────┘
                                      │
                          ┌───────────┴────────────┐
                          │     Rider Frontend     │ (React 19 + TanStack Start/Router + Capacitor)
                          │   Port 8083 / Mobile   │
                          └───────────┬────────────┘
                                      │
                          ┌───────────┴────────────┐
                          │     Admin Frontend     │ (React 19 + TanStack Start/Router)
                          │   Port 8084 / Web      │
                          └───────────┬────────────┘
                                      │
                       REST / WebSocket / Server Events
                                      │
                                      ▼
                      ┌────────────────────────────────┐
                      │      FastAPI Backend Engine    │ (Python 3.12 + ASGI + Socket.IO)
                      │       app.main:app (8000)      │
                      └───────────────┬────────────────┘
                                      │
             ┌────────────────────────┼────────────────────────┐
             ▼                        ▼                        ▼
┌────────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
│  Supabase PostgreSQL   │ │ Firebase FCM / Push  │ │ Razorpay / Cashfree  │
│ (JSONB + GIN Indexing) │ │ (Data Alerts / Ring) │ │ (Payments & Payouts) │
└────────────────────────┘ └──────────────────────┘ └──────────────────────┘
```

---

## 2. Core Functional Modules

---

### 2.1 Authentication & Multi-Role Identity Guard

- **Functionality:** Authenticates users across all roles (Customer, Partner, Rider, Admin) using Phone OTP and Firebase Auth; issues custom JWT tokens with role-based identity claims and verifies permissions.
- **Entry Points:**
  - Backend: `backend-python/app/api/auth.py`
  - Customer: `customer-frontend/src/routes/login.tsx`
  - Partner: `partner-frontend/src/routes/auth.tsx`
  - Rider: `rider-frontend/src/routes/auth.tsx`
  - Admin: `admin-frontend/src/routes/auth.tsx`
- **Primary Files:**
  - `backend-python/app/api/auth.py`: Handles OTP generation, verification, user creation, and JWT issuance.
  - `backend-python/app/core/identity_guard.py`: Role enforcement dependency (`require_customer`, `require_partner`, `require_rider`, `require_admin`).
  - `backend-python/app/core/admin_security.py`: Super-admin seed, password hashing, and privileged authorization.
- **Supporting Files:**
  - `backend-python/app/core/security.py`: JWT token creation and decode utilities.
  - `backend-python/app/core/sms_service.py`: Multi-provider SMS gateway fallback for OTP delivery.
  - `customer-frontend/src/api/core/auth-service.ts`: Client-side auth storage and header injection.
  - `partner-frontend/src/lib/auth-guard.ts`: Immediate routing guard for verified vs. unverified merchants.
  - `rider-frontend/src/lib/auth-guard.ts`: Navigation guard for active vs. unverified captains.
- **Data Layer:**
  - `backend-python/app/db/repositories.py`: User repository (`users` collection).
  - `backend-python/app/models/auth.py` & `backend-python/app/models/user.py`: Schema definitions.
- **Confidence:** Verified from actual code imports and route definitions.

---

### 2.2 Order Lifecycle & Pre-Wash Garment Inspection

- **Functionality:** End-to-end garment processing pipeline: order creation, stage progressions (`placed` -> `accepted` -> `pickup_assigned` -> `picked_up` -> `in_processing` -> `out_for_delivery` -> `delivered`), garment defect logging with customer digital consent, and SLA enforcement.
- **Entry Points:**
  - Customer API: `backend-python/app/api/checkout.py`, `backend-python/app/api/orders.py`
  - Partner API: `backend-python/app/api/partner.py`
  - Frontend: `customer-frontend/src/routes/checkout.tsx`, `partner-frontend/src/screens/PartnerOrdersScreen.tsx`
- **Primary Files:**
  - `backend-python/app/services/order_lifecycle.py`: State transition state-machine, validation, and auto-cancellation logic.
  - `backend-python/app/services/order_timeline_engine.py`: Background SLA watcher (5-min partner acceptance SLA, 2-min rider claim SLA).
  - `backend-python/app/services/defect_service.py`: Pre-wash garment defect logging, customer approval tokens, and photo upload.
  - `backend-python/app/api/defects.py`: Defect inspection endpoints.
- **Supporting Files:**
  - `backend-python/app/db/order_repositories.py`: MongoDB/Supabase query abstractions for orders.
  - `backend-python/app/models/order.py` & `backend-python/app/models/defect.py`: Order and defect data structures.
  - `customer-frontend/src/routes/track.$orderId.tsx`: Real-time tracking screen for customers with timeline and live map.
  - `partner-frontend/src/screens/PartnerDashboardScreen.tsx`: Stage-partitioned order management screen.
- **Data Layer:**
  - Collections: `orders`, `order_stages`, `defects`, `order_timeline`.
- **Confidence:** Verified from actual lifecycle transitions and database collections.

---

### 2.3 Concentric Wave Rider Dispatch & Smart 2-Ride Engine

- **Functionality:** Zomato-style concentric wave dispatch engine. Computes rider proximity in micro-zones (Pods), evaluates priority scores (Distance + Idle Time Fairness + Rating), emits wave offers (Wave 1: 0–1.8km, Wave 2: 1.8–4.0km, Wave 3: Citywide), and cancels pending timers instantly upon acceptance. Batches dual rides (Pickup + Delivery) along the same corridor.
- **Entry Points:**
  - Background Task: Triggered from `order_lifecycle.py` on partner order ready or pickup scheduling.
  - WebSocket: `backend-python/app/services/socket_service.py` (`order.rider_offer`, `new_order_offer`).
  - Rider App: `rider-frontend/src/routes/orders.tsx` & `rider-frontend/src/components/dashboard/GoToPickupHUD.tsx`.
- **Primary Files:**
  - `backend-python/app/services/zomato_dispatch_engine.py`: Concentric wave timer engine, spatial filtering, and multi-factor ranking.
  - `backend-python/app/services/smart_2ride_engine.py`: Batching algorithm for pairing complementary pickup and drop legs.
  - `backend-python/app/services/rider_dispatch.py`: Ride state machine (`dispatching` -> `assigned` -> `picked_up` -> `delivered`).
- **Supporting Files:**
  - `backend-python/app/api/rider.py`: Captain endpoints (claim offer, update location, trigger SOS, complete ride).
  - `rider-frontend/src/lib/rider-socket.ts`: Socket.IO client handling realtime wave offers and cancellations.
  - `rider-frontend/src/components/dashboard/GoToPickupHUD.tsx`: Interactive navigation HUD with GPS tracking and OTP verification.
- **Data Layer:**
  - Collections: `rides`, `ride_assignments`, `rider_offers`, `rider_profiles`.
- **Confidence:** Verified from dispatch engine code and rider WebSocket event handlers.

---

### 2.4 Millisecond Background Push & Screen Wakeup Engine

- **Functionality:** Delivers real-time order alerts to sleeping or backgrounded mobile devices in milliseconds. Uses pure high-priority FCM data messages to bypass Android system-tray notification delays, wake the screen with `SCREEN_BRIGHT_WAKE_LOCK`, play looping `STREAM_ALARM` audio, and display full-screen lockscreen alerts.
- **Entry Points:**
  - Backend Trigger: `backend-python/app/core/fcm.py` (`send_fcm_push`)
  - Android Partner Receiver: `partner-frontend/android/app/src/main/java/com/quickpress/partner/QuickPressFirebaseService.java`
  - Android Rider Receiver: `rider-frontend/android/app/src/main/java/com/quickpress/rider/QuickPressFirebaseService.java`
- **Primary Files:**
  - `backend-python/app/core/fcm.py`: Sends pure data messages for urgent orders (`is_urgent=True`), omitting notification block so Android OS triggers `onMessageReceived()` natively.
  - `partner-frontend/android/app/src/main/java/com/quickpress/partner/MainActivity.java`: Native audio player, screen wake lock, and heads-up full-screen intent.
  - `rider-frontend/android/app/src/main/java/com/quickpress/rider/MainActivity.java`: Native audio player, screen wake lock, and captain overlay bridge.
- **Supporting Files:**
  - `rider-frontend/src/lib/captain-audio.ts`: Web Audio API synthesizer + native bridge silencer.
  - `partner-frontend/src/api/core/firebase-messaging.ts` & `rider-frontend/src/api/core/firebase-messaging.ts`: Native token synchronization with backend.
- **Confidence:** Verified through native Android services and backend FCM dispatchers.

---

### 2.5 Payments, Treasury, Double-Entry General Ledger & Settlements

- **Functionality:** Manages payment processing (Razorpay, Cashfree, UPI, Fleet COD Float), double-entry general ledgers, automated merchant settlements, captain per-drop payouts, surge fees, and GST tax invoice generation.
- **Entry Points:**
  - Webhooks: `backend-python/app/api/webhooks.py` (Razorpay HMAC verified)
  - Admin Treasury: `admin-frontend/src/routes/finance-engine.tsx`
  - API: `backend-python/app/api/finance_engine.py`, `backend-python/app/api/razorpay.py`
- **Primary Files:**
  - `backend-python/app/services/general_ledger_service.py`: Double-entry accounting engine (`debit`, `credit`, zero rounding loss).
  - `backend-python/app/services/settlement_engine.py`: Calculates net merchant payouts (Gross - Platform Commission - TDS).
  - `backend-python/app/services/distance_rate_engine.py`: Dynamic kilometer fare pricing matrix.
  - `backend-python/app/services/invoice_pdf_generator.py`: Generates GST-compliant customer invoices.
- **Supporting Files:**
  - `backend-python/app/services/razorpay_client.py`: Razorpay Orders, Payments, and Transfers API integration.
  - `backend-python/app/services/cashfree_client.py`: Cashfree PG & Payouts client.
  - `backend-python/app/db/general_ledger_repository.py`: Immutable ledger journal storage.
  - `backend-python/app/db/payment_repositories.py`: Payment transaction records.
- **Data Layer:**
  - Collections: `general_ledger`, `transactions`, `payouts`, `invoices`, `cod_float_ledger`.
- **Confidence:** Verified from financial service calculations and ledger database schemas.

---

### 2.6 Dynamic Promotions, Stories, CMS & Marketing Website

- **Functionality:** Dynamic banner management, Instagram-style interactive stories, coupon codes, service catalog management, and public static website.
- **Entry Points:**
  - Marketing Website: `website/src/App.tsx` (served on `withquickpress.com`)
  - Admin CMS: `admin-frontend/src/routes/promotions.tsx`
  - Backend API: `backend-python/app/api/promotions.py`, `backend-python/app/api/public.py`
- **Primary Files:**
  - `backend-python/app/api/promotions.py`: CRUD for home banners, story slides, and discount coupons.
  - `backend-python/app/db/cms_repositories.py`: Content management repository.
  - `customer-frontend/src/routes/home.tsx`: Customer home screen consuming dynamic banners and stories.
  - `website/src/App.tsx`: Marketing landing page with service pricing, story highlights, and partner onboarding links.
- **Data Layer:**
  - Collections: `promotions`, `stories`, `coupons`, `catalog_services`.
- **Confidence:** Verified from CMS endpoints and frontend components.

---

## 3. Critical Flow Traces

---

### Flow 1: Customer Order Placement & Payment

```
[Customer App: checkout.tsx]
      │
      ▼ (HTTP POST /api/checkout/create-order)
[checkout.py -> cart_repositories.py]
      │
      ▼ (Creates Razorpay Order / Generates order_id)
[razorpay_client.py / razorpay.py]
      │
      ▼ (Customer completes payment in Razorpay Checkout Sheet)
[Razorpay Webhook: POST /api/webhooks/razorpay]
      │
      ▼ (HMAC SHA-256 verification)
[order_lifecycle.py: on_payment_success()]
      │
      ├──────────────────────────────┬──────────────────────────────┐
      ▼                              ▼                              ▼
[general_ledger_service.py]   [order_notifications.py]    [zomato_dispatch_engine.py]
Record Double-Entry Journal    Socket.IO + FCM to Partner   Initiate Wave Dispatch
```

---

### Flow 2: Instant Background Wave Dispatch to Captains

```
[zomato_dispatch_engine.py: _notify_captain()]
      │
      ├────────────────────────────────────────┐
      ▼ (Real-time Socket.IO)                  ▼ (Urgent Background FCM Data)
[sio.emit("order.rider_offer", room=r_id)]   [fcm.py: send_fcm_push(role="rider", is_urgent=True)]
      │                                        │
[Rider App in Foreground]              [Android Device Locked / App Closed]
Display Order Modal                            │
                                       [QuickPressFirebaseService.java: onMessageReceived()]
                                               │
                                       [MainActivity.startOrderAlarmDirectly()]
                                               ├─ Acquire PowerManager SCREEN_BRIGHT_WAKE_LOCK
                                               ├─ MediaPlayer.start() looping STREAM_ALARM
                                               └─ FullScreenIntent Notification on Lockscreen
                                               │
                                       [Captain taps Notification / "OPEN OFFER"]
                                               │
                                       [rider-frontend: orders.tsx -> acceptOffer()]
                                               │
                                       [captain-audio.ts: stopOrderAlertSound()]
                                       Silences alarm & starts GPS Navigation HUD
```

---

### Flow 3: Partner Order Acceptance & Defect Logging

```
[Partner App: PartnerDashboardScreen.tsx]
      │
      ▼ (Tap "Accept Order" -> POST /api/partner/orders/{id}/accept)
[partner.py -> order_lifecycle.py: update_stage("accepted")]
      │
      ▼ (Customer drops garments / Rider delivers to partner store)
[Partner inspects garments -> PartnerDefectModal.tsx]
      │
      ▼ (POST /api/partner/orders/{id}/defects)
[defects.py -> defect_service.py: log_defect_with_photo()]
      │
      ├─ Upload photo to Cloudinary / Storage
      ├─ Generate customer digital consent token
      └─ Trigger push notification to Customer App
      │
[Customer opens Track Order screen -> Approves / Rejects Defect Claim]
      │
[order_lifecycle.py: update_stage("in_processing")]
```

---

### Flow 4: Double-Entry Payout & Merchant Settlement

```
[Order reaches "delivered" stage]
      │
      ▼
[settlement_engine.py: calculate_order_settlement()]
      │
      ├─ Gross Order Value
      ├─ Deduct Platform Commission % (commission_engine.py)
      ├─ Deduct Payment Gateway Processing Fee
      └─ Net Partner Payable Amount
      │
      ▼
[general_ledger_service.py: post_transaction()]
      ├─ Debit: Customer Accounts Receivable
      ├─ Credit: Merchant Payable Account
      └─ Credit: QuickPress Platform Revenue Account
      │
      ▼ (Weekly / On-Demand Payout)
[cashfree_client.py / razorpay_client.py: payout_transfer()]
      │
[general_ledger_service.py: record_payout_disbursement()]
```

---

## 4. File-to-Function Index by Subsystem

### Backend API (`backend-python/`)

| File / Module Path | Subsystem | Main Responsibility | Key References / Dependencies |
| :--- | :--- | :--- | :--- |
| `app/main.py` | Core Application | ASGI Root, Middleware Stack, Socket.IO Mounting, CORS | `fastapi`, `socketio`, `app.config`, all API routers |
| `app/config.py` | Configuration | Environment variables, database URIs, API keys, CORS origins | `pydantic_settings`, `.env` |
| `app/db/client.py` | Data Access | Database abstraction layer with in-memory fallback | `supabase_client`, `motor`, `asyncpg` |
| `app/db/supabase_client.py` | Data Access | Supabase PostgreSQL JSONB & relational query adapter | `asyncpg`, `app.config` |
| `app/core/identity_guard.py` | Security & Auth | Role-based dependency injection for FastAPI endpoints | `app.core.security`, `app.db.repositories` |
| `app/core/fcm.py` | Notifications | Real FCM push dispatcher (pure data & urgent alert modes) | `firebase_admin.messaging`, `app.db.client` |
| `app/services/order_lifecycle.py` | Business Logic | Central order state machine, SLA transitions & cancel rules | `app.db.order_repositories`, `socket_service` |
| `app/services/zomato_dispatch_engine.py` | Dispatching | Micro-zone spatial partitioning & concentric wave offers | `app.services.socket_service`, `app.core.fcm` |
| `app/services/general_ledger_service.py` | Treasury | Double-entry journal entries, balance checks & trial balances | `app.db.general_ledger_repository` |
| `app/services/settlement_engine.py` | Treasury | Merchant settlement calculator (commission, fees, net payout)| `app.services.commission_engine` |
| `app/services/distance_rate_engine.py` | Pricing | Dynamic per-km delivery fare calculation matrix | `app.db.client` |
| `app/api/auth.py` | Routing / Auth | Phone OTP request, verification, login, and registration | `app.core.sms_service`, `app.core.security` |
| `app/api/orders.py` | Routing / Orders | Customer order history, tracking details, and cancel requests | `app.services.order_lifecycle` |
| `app/api/partner.py` | Routing / Merchant | Partner dashboard stats, stage updates, services, and profile| `app.services.order_lifecycle` |
| `app/api/rider.py` | Routing / Captain | Captain profile, wave claims, ride progress, and SOS alerts | `app.services.zomato_dispatch_engine` |
| `app/api/admin.py` | Routing / Admin | Administrative control endpoints for all marketplace entities | `app.db.admin_repositories` |
| `app/api/finance_engine.py` | Routing / Finance | Financial ledgers, reports, payouts, and unit economics | `app.services.unified_finance_service` |

---

### Customer Web & Android App (`customer-frontend/`)

| File / Module Path | Subsystem | Main Responsibility | Key References / Dependencies |
| :--- | :--- | :--- | :--- |
| `src/routes/__root.tsx` | App Shell | Global layout, TanStack router root, Sonner toaster, modals | `@tanstack/react-router`, `lucide-react` |
| `src/routes/home.tsx` | Home View | Service categories, dynamic promotion banners, stories, search | `src/api/customer/home-api.ts` |
| `src/routes/checkout.tsx` | Checkout Flow | Address selection, delivery slot, coupon, payment initiation | `src/api/customer/order-api.ts`, Razorpay SDK |
| `src/routes/track.$orderId.tsx` | Live Tracking | Visual stage timeline, captain tracking map, defect consent | `src/api/customer/order-api.ts` |
| `src/routes/login.tsx` | Authentication | Phone input, 6-digit OTP entry, profile completion | `src/api/core/auth-service.ts` |
| `src/api/core/auth-service.ts` | Auth Client | JWT token storage, refresh, and HTTP Authorization header | `localStorage`, `fetch` |
| `src/api/customer/cart-store.ts` | State Management | In-memory & persisted smart cart items and add-ons | `zustand` / React state |

---

### Partner Web & Android App (`partner-frontend/`)

| File / Module Path | Subsystem | Main Responsibility | Key References / Dependencies |
| :--- | :--- | :--- | :--- |
| `src/routes/index.tsx` | Entry / Routing | Computes target route (dashboard for verified vs. register) | `src/lib/auth-guard.ts` |
| `src/lib/auth-guard.ts` | Route Guard | Prevents verified partners from seeing submission screens | `src/api/partner/partner-auth-api.ts` |
| `src/screens/PartnerDashboardScreen.tsx` | Merchant Console | Stage tabs (New, Processing, Ready, Dispatched, Cancelled) | `src/context/PartnerOrdersContext.tsx` |
| `src/context/PartnerOrdersContext.tsx` | Real-time Context | Socket.IO listener for new orders, sound alerts & stage sync | `socket.io-client`, `src/lib/partner-audio` |
| `android/.../QuickPressFirebaseService.java` | Native Android | Wakes screen on urgent FCM, plays loud looping STREAM_ALARM | Android `PowerManager`, `MediaPlayer` |
| `android/.../MainActivity.java` | Android Bridge | FullScreenIntent lockscreen notification & alarm lifecycle | Android `NotificationCompat` |

---

### Rider / Captain Web & Android App (`rider-frontend/`)

| File / Module Path | Subsystem | Main Responsibility | Key References / Dependencies |
| :--- | :--- | :--- | :--- |
| `src/screens/RiderDashboardScreen.tsx` | Captain Console | Duty online toggle, floating bubble trigger, active ride card| `src/api/rider/rider-dashboard-api.ts` |
| `src/components/dashboard/GoToPickupHUD.tsx` | Navigation HUD | Turn-by-turn guidance, destination details, OTP confirmation | Leaflet / Mapbox, `rider-socket.ts` |
| `src/screens/RiderHistoryScreen.tsx` | Trip History | Completed, In-Process, Cancelled, and Missed ride receipts | `src/api/rider/rider-orders-api.ts` |
| `src/lib/captain-audio.ts` | Audio Alerts | Web Audio siren synthesis + Native Android alarm silencer | Web Audio API, `QuickPressRiderBridge` |
| `android/.../QuickPressFirebaseService.java` | Native Android | Immediate background wakeup on captain wave offers | Android `PowerManager`, `MediaPlayer` |
| `android/.../MainActivity.java` | Android Bridge | Floating overlay bubble service & lockscreen alarm alerts | Android `NotificationManager`, BridgeActivity |

---

### Admin & Operations HQ (`admin-frontend/`)

| File / Module Path | Subsystem | Main Responsibility | Key References / Dependencies |
| :--- | :--- | :--- | :--- |
| `src/routes/dashboard.tsx` | HQ Overview | High-level GMV, active rides, SLA health, and active hubs | `src/api/dashboard.ts` |
| `src/routes/finance-engine.tsx` | Treasury & Ledger | Real-time general ledger, reconciliation, and payout audit | `src/api/finance-api.ts` |
| `src/routes/crm.tsx` | Customer CRM | 360-degree customer lookup, wallet balances, order history | `src/api/crm.ts` |
| `src/routes/orders.tsx` | Master Dispatch | All marketplace orders, manual reassignment, cancel override| `src/api/orders.ts` |
| `src/routes/partners.tsx` | Merchant Ops | Store verification, commission overrides, bank verification | `src/api/partners.ts` |
| `src/routes/riders.tsx` | Fleet Ops | Captain onboarding KYC, vehicle documents, float management | `src/api/riders.ts` |

---

### Marketing Website & Infrastructure

| File / Module Path | Subsystem | Main Responsibility | Key References / Dependencies |
| :--- | :--- | :--- | :--- |
| `website/src/App.tsx` | Marketing Website | Public marketing landing page (`withquickpress.com`) | React, Vite, Tailwind CSS |
| `build_all_apks.py` | DevOps / Build | Automated script building, signing & syncing all 3 mobile APKs| Android SDK, Gradle, Capacitor CLI |
| `supabase/security_rules.sql` | Database Security | Supabase Row-Level Security (RLS) policies and GIN indexes | PostgreSQL / Supabase |

---

## 5. Verification Confidence Reference

| Level | Criteria |
| :--- | :--- |
| **Verified** | Directly traced from active code, import statements, route tables, and build outputs. |
| **Likely** | Inferred from standard framework patterns and naming conventions where dynamic dispatch occurs. |
| **Unknown** | Undetermined or unreferenced scratch code. |

*All mappings in this document have been **Verified** against the live codebase.*
