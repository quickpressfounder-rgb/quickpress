# QuickPress Security Architecture & Rules Reference

QuickPress implements multi-layer zero-trust security across the entire ecosystem:
1. **Database Row Level Security (RLS)** — Supabase PostgreSQL
2. **Backend Application Layer Authorization (RBAC)** — FastAPI 3.12
3. **Financial Ledger & Settlement Immutability** — Double-entry accounting
4. **Geo-Fencing & Fraud Protection** — Anti-fake GPS and Single-Trip Concurrency

---

## 1. Supabase PostgreSQL Row-Level Security (RLS)

All document records in `quickpress_documents` are guarded by PostgreSQL RLS policies defined in `supabase/security_rules.sql`:

| Policy Name | Target Role | Access Scope |
| :--- | :--- | :--- |
| **Service Role Full Access** | `service_role` | Trusted Python backend bypass for double-entry financial settlement & automated batch runs. |
| **Admin Full Console Access** | `authenticated` (admin claim) | Operations dashboard oversight and manual exception reviews. |
| **Public Catalog Discovery** | `anon`, `authenticated` | Read-only access to published laundry price lists, service categories, and operational cities. |
| **Customer Read Own Data** | `authenticated` (customer) | Customer can only read their own orders (`userId = auth.uid()`), addresses, and support tickets. |
| **Customer Create Own Orders** | `authenticated` (customer) | Customers can create orders linked strictly to their own verified identity. |
| **Partner Store Isolation** | `authenticated` (partner) | Partner store owners can only access orders assigned to their store (`partnerId = auth.uid()`). |
| **Rider Trip Isolation** | `authenticated` (captain) | Delivery captains can only read trips assigned to them or offered in their broadcast radius. |
| **Block Direct Wallet Edits** | `authenticated` | Direct frontend write access to `wallets`, `rider_wallets`, and `settlements` is strictly denied. |

---

## 2. API Authorization & RBAC Matrix (FastAPI)

| Rule Identifier | Endpoint Pattern | Authorized Caller | Enforcement Mechanism |
| :--- | :--- | :--- | :--- |
| `RULE-AUTH-01` | `/api/customer/*` | Customer JWT | `current_user` dependency verifying Supabase / Firebase token |
| `RULE-AUTH-02` | `/api/partner/*` | Verified Merchant | `_partner_id` resolver checking `partner_profiles.userId` |
| `RULE-AUTH-03` | `/api/rider/*` | On-Duty Captain | `_rider_id` resolver checking `rider_profiles.userId` |
| `RULE-AUTH-04` | `/api/admin/*` | SuperAdmin / Staff | `admin_required` checking `role == 'admin'` |
| `RULE-AUTH-05` | `/api/webhooks/razorpay` | Razorpay Webhook | Cryptographic HMAC-SHA256 signature verification |
| `RULE-AUTH-06` | `/api/webhooks/cashfree` | Cashfree Webhook | RSA public key signature verification |

---

## 3. Operational Integrity & Fraud Prevention Rules

1. **Anti-Hoarding Single Concurrency:** Captain cannot accept a second delivery trip while holding an active in-progress trip.
2. **COD Float Cap (₹3,000):** If cash collected on delivery exceeds ₹3,000, new COD dispatch offers are suppressed until hub deposit.
3. **Geo-Fencing Proximity Check:** Captain arrival status requires distance `< 500m` from coordinates to prevent spoofing.
4. **Mandatory 4-Digit Handover OTPs:**
   - *Customer Pickup Leg:* Customer Pickup OTP required.
   - *Partner Store Handover Leg:* Dispatch OTP required.
   - *Customer Doorstep Delivery:* Customer Delivery OTP required.
5. **Locked Bank Credentials:** Verified merchant bank details and captain UPI VPAs cannot be modified without Admin approval.

---

## 4. Financial & Double-Entry Ledger Rules

1. **Conservation of Balance:** `Platform Revenue + Partner Payout + Rider Payout == Customer Total`.
2. **Non-Negative Balance:** Payout withdrawals cannot exceed available wallet balance (`amount <= wallet.balance`).
3. **Idempotency Guarantee:** Duplicate order IDs cannot trigger multiple wallet credits.
4. **Statutory Withholding:** Automated 1% TDS (Sec 194-O / 194-C) and 1% TCS calculation prior to bank disbarment.
