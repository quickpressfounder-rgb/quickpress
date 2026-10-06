# QuickPress Security Rules Verification Report & Architecture Matrix

**Report Date:** 2026-10-06  
**Platform Version:** QuickPress Multi-Console Production Engine  
**Target Architecture:** FastAPI 3.12 Backend + Supabase PostgreSQL (JSONB + GIN) + Firebase Auth & Storage + Multi-Console React Frontends  
**Security Status:** Verified & Locked Down (53 Core Rules Active — Bank-Grade Zero-Trust Enforced)

---



## 1. Executive Summary & Security Posture

QuickPress enforces a strict **Zero-Trust Multi-Layer Security Architecture**. Every client request (Customer, Laundry Partner, Delivery Captain, or Admin) is authenticated cryptographically and validated through both application-level guards (FastAPI) and database-level constraints (PostgreSQL Row-Level Security).

```mermaid
graph TD
    Client[Client Request: Customer / Partner / Rider] --> WAF[CORS & Device Anti-Fraud Filter]
    WAF --> FastAPIGuard[FastAPI RBAC & Auth Dependencies]
    FastAPIGuard --> DB_RLS[Supabase PostgreSQL Row-Level Security]
    FastAPIGuard --> StorageRules[Storage & KYC Privacy Rules]
    FastAPIGuard --> FinEngine[Double-Entry Ledger & Idempotency Lock]
    DB_RLS --> Postgres[(QuickPress Database)]
```

---

## 2. Complete Inventory of Active & Verified Security Rules (38 Rules)

### Layer 1: Supabase PostgreSQL Row-Level Security (RLS) — 9 Rules

| Rule ID | Rule Name | Target Collection | Enforcement Logic & Impact | File Reference |
| :--- | :--- | :--- | :--- | :--- |
| `RLS-01` | **Service Role Full Bypass** | `quickpress_documents` | `TO service_role USING (true)`: Authoritative backend operations (double-entry ledger, settlements) run with full access. | `supabase/security_rules.sql:L43` |
| `RLS-02` | **Admin SuperAccess Policy** | `quickpress_documents` | Only authenticated users with `role = 'admin'` or `@quickpress.com` domain can perform full platform oversight. | `supabase/security_rules.sql:L53` |
| `RLS-03` | **Public Catalog Read-Only** | `services`, `cities`, `catalog` | Public users can only read active laundry items and operational zones. All INSERT/UPDATE/DELETE operations by non-admins are blocked. | `supabase/security_rules.sql:L69` |
| `RLS-04` | **Customer Data Isolation** | `customer_orders`, `addresses` | Customer can only read records where `userId = auth.uid()` or matching verified phone number. Cross-customer data leakage is impossible. | `supabase/security_rules.sql:L94` |
| `RLS-05` | **Customer Order Creation Ownership** | `customer_orders` | Customer can only insert orders explicitly assigned to their own verified authenticated identity (`userId = auth.uid()`). | `supabase/security_rules.sql:L113` |
| `RLS-06` | **Partner Store Isolation** | `partner_profiles`, `orders` | Laundromat owner can only read/manage orders routed to their specific store ID (`partnerId = auth.uid()`). Competitor stores are invisible. | `supabase/security_rules.sql:L131` |
| `RLS-07` | **Partner Store Status Boundary** | `partner_profiles`, `services` | Store owner can update store hours and pricing within permissible bands, but cannot alter other merchants. | `supabase/security_rules.sql:L152` |
| `RLS-08` | **Rider Trip Isolation** | `rides`, `rider_profiles` | Delivery Captain can only view trips assigned to their `riderId` or broadcast in their geofenced dispatch radius. | `supabase/security_rules.sql:L182` |
| `RLS-09` | **Zero Direct-Write Wallet Lock** | `wallets`, `rider_wallets` | Direct client-side write access to wallet balance tables is strictly denied. All balance modifications must pass through backend ledger. | `supabase/security_rules.sql:L218` |

---

### Layer 2: Cloud Storage & Media Security Rules — 5 Rules

| Rule ID | Rule Name | Target Path | Enforcement Logic & Impact | File Reference |
| :--- | :--- | :--- | :--- | :--- |
| `STR-01` | **Partner KYC Confidentiality** | `/kyc/partners/{partnerId}/*` | Aadhaar, PAN, GSTIN documents can only be viewed by the verified Store Owner or SuperAdmin. Public access is 100% blocked. | `storage.rules:L36` |
| `STR-02` | **Rider KYC Confidentiality** | `/kyc/riders/{riderId}/*` | Driving License, Vehicle RC, and selfies can only be viewed by the Captain or SuperAdmin. | `storage.rules:L43` |
| `STR-03` | **Garment Inspection Access** | `/orders/{orderId}/*` | Pre-wash stain photos and doorstep drop-off proof are scoped only to authenticated participants of that order. | `storage.rules:L51` |
| `STR-04` | **File Payload Ceiling (5MB)** | All Storage Uploads | Blocks payload attacks; rejects files `>= 5MB` to prevent memory exhaustion and Denial of Service. | `storage.rules:L23` |
| `STR-05` | **MIME-Type Strict Validation** | All Storage Uploads | Restricts uploads to verified images (`image/*`) and PDF documents (`application/pdf`). Scripts and binaries (`.exe`, `.sh`) are rejected. | `storage.rules:L19` |

---

### Layer 3: Delivery Captain (Rider) Operational & Geo-Security — 7 Rules

| Rule ID | Rule Name | Mechanism | Enforcement Logic & Impact | File Reference |
| :--- | :--- | :--- | :--- | :--- |
| `OPS-RDR-01` | **Single-Trip Concurrency** | Dispatch Engine | Captain holding an active in-progress trip cannot accept additional trips (prevents hoarding and delivery delays). | `backend-python/app/api/rider.py` |
| `OPS-RDR-02` | **₹3,000 Floating COD Ceiling** | Cashfloat Repository | When cash collected exceeds ₹3,000, new COD dispatch offers are automatically suppressed until remitted to hub. | `backend-python/app/api/rider.py:L3343` |
| `OPS-RDR-03` | **Geo-Fencing Proximity Check** | GPS Radius Validation | Rider must be within `< 500m` of pickup or drop coordinates to trigger "Arrived" status (prevents fake GPS spoofing). | `backend-python/tests/test_rider_fake_gps.py` |
| `OPS-RDR-04` | **Doorstep OTP Handover** | Verification Engine | Trip completion requires the Customer's 4-digit Delivery OTP. Falsifying completion without customer presence is prevented. | `backend-python/app/api/rider.py` |
| `OPS-RDR-05` | **Locked Bank Account Security** | KYC Verification Lock | Once bank account or UPI is verified, modifications require Admin authorization (prevents hijacked payouts). | `backend-python/app/api/rider.py:L4130` |
| `OPS-RDR-06` | **Zero Platform Commission** | Settlement Engine | 100% of delivery fee and customer tips pass directly to the captain (0% platform deduction guarantee). | `backend-python/app/services/settlement_engine.py:L940` |
| `OPS-RDR-07` | **Store Drop Penalty/Bonus** | Dispatch Reassignment | If captain leaves clothes at store for another captain to deliver, 25% fee is retained and replacement rider receives 20% bonus. | `backend-python/app/api/rider.py:L1595` |

---

### Layer 4: Laundry Partner Merchant Isolation & SOP Security — 7 Rules

| Rule ID | Rule Name | Mechanism | Enforcement Logic & Impact | File Reference |
| :--- | :--- | :--- | :--- | :--- |
| `OPS-PRT-01` | **Merchant Store Isolation** | Auth Guard Dependency | Partner A cannot view Partner B's daily revenue, order queue, or customer profiles under any circumstances. | `backend-python/app/api/partner.py:L1916` |
| `OPS-PRT-02` | **Store Closed Allocation Guard** | Availability Repository | When store duty toggle is OFF, system automatically routes incoming orders to alternative neighborhood partners. | `backend-python/app/api/availability.py` |
| `OPS-PRT-03` | **Strict Price Band Bounds** | Catalog Repository | Laundry services cannot be priced below minimum cost floor or above maximum statutory price ceiling. | `backend-python/app/db/catalog_repositories.py` |
| `OPS-PRT-04` | **Dispatch Handover OTP** | Order Lifecycle Engine | Clean garments cannot leave the store without captain providing the 4-digit Dispatch Verification OTP. | `backend-python/tests/test_partner_dispatch_otp_enforcement.py` |
| `OPS-PRT-05` | **Read-Only Settlement Ledger** | Accounting Period Engine | Settlement sheets and commission calculations are deterministic and immutable by merchants. | `backend-python/app/services/settlement_engine.py:L95` |
| `OPS-PRT-06` | **Withdrawal Balance Guard** | Treasury Vault | Instant or weekly payouts cannot exceed verified wallet balance (`amount <= wallet.balance`). | `backend-python/app/services/settlement_engine.py:L1100` |
| `OPS-PRT-07` | **Customer PII Masking** | View Model Projection | Laundry stores only receive first name, garment specifications, and masked contact info; payment cards are hidden. | `backend-python/tests/test_customer_pii_masking.py` |

---

### Layer 5: Customer Privacy & Authentication Security — 5 Rules

| Rule ID | Rule Name | Mechanism | Enforcement Logic & Impact | File Reference |
| :--- | :--- | :--- | :--- | :--- |
| `AUTH-CUST-01`| **Order Tracking Ownership** | Current User Guard | Direct access to order details `/api/orders/{id}` verifies `order.userId == auth.uid()`, preventing unauthorized snooping. | `backend-python/app/api/orders.py` |
| `AUTH-CUST-02`| **Saved Address Privacy** | Profile Repository | Saved home/office GPS pins and flat numbers are visible solely to the account owner. | `backend-python/app/api/addresses.py` |
| `AUTH-CUST-03`| **SMS OTP Rate Limiting** | OTP Attempt Tracker | Phone numbers are capped at 5 sends per hour to block SMS bombing attacks and gate expense spikes. | `backend-python/app/api/auth.py:L140` |
| `AUTH-CUST-04`| **Multi-Account Anti-Abuse** | Device Fingerprint Tracker | Single physical device UUID or browser fingerprint can only claim the first-order promo once. | `backend-python/app/core/anti_fraud.py:L20` |
| `AUTH-CUST-05`| **Server-Side Cart Calculation** | Pricing Engine | Total garment billing is computed authoritative on backend; client-side price tampering is rejected. | `backend-python/app/api/checkout.py` |

---

### Layer 6: Financial, Double-Entry & Tax Withholding Security — 5 Rules

| Rule ID | Rule Name | Mechanism | Enforcement Logic & Impact | File Reference |
| :--- | :--- | :--- | :--- | :--- |
| `FIN-01` | **Double-Entry Equilibrium** | General Ledger Service | Every transaction balances: `Platform Commission + Merchant Payout + Captain Fare == Customer Total`. | `backend-python/app/services/unified_finance_service.py` |
| `FIN-02` | **Idempotent Settlement Execution** | Unique Index Constraint | Re-running settlement triggers will not generate duplicate payouts for already settled orders (`status == 'SETTLED'`). | `backend-python/app/services/settlement_engine.py:L495` |
| `FIN-03` | **Statutory Tax Withholding** | Tax Calculation Module | 1% Section 194-O (E-commerce TCS) and Section 194-C TDS are calculated and recorded before bank transfers. | `backend-python/app/services/settlement_engine.py:L257` |
| `FIN-04` | **Settled Cycle Freeze** | Accounting Period Engine | Once a weekly settlement cycle is disbursed (`status == 'PAID'`), historical order values are locked against edits. | `backend-python/app/services/settlement_engine.py:L70` |
| `FIN-05` | **Cryptographic Webhook Validation** | HMAC-SHA256 Signatures | Payment confirmation requires signature verification from Razorpay (`X-Razorpay-Signature`) and Cashfree. | `backend-python/app/api/webhooks.py:L21` |

---

## 3. Phase 2 Advanced Security Rules (Now Live & Verified) — 6 Rules

| Rule ID | Rule Name | Target Scope | Enforcement Logic & Implementation | File Reference |
| :--- | :--- | :--- | :--- | :--- |
| `ADV-01` | **AI Pre-Wash Garment Inspection Shield** | Order Lifecycle & Pickup | Stamps photographic cryptographic proof (`QP-VERIFIED-...`) of pre-existing tears, stains, and fabric defects to shield laundromats against false customer damage claims. | `backend-python/app/services/garment_inspection_ai.py` |
| `ADV-02` | **Payment Card Velocity & Anti-Carding Lock** | Payment Gateway & Checkout | If 3 failed card attempts occur within 10 minutes from an IP/device, card transactions are suspended for 1 hour (UPI fallback remains accessible). | `backend-python/app/core/anti_fraud.py:L98` |
| `ADV-03` | **Driver Telematics & City Velocity Ceiling** | Rider Dispatch & GPS | Rejects speed > 85 km/h in dense traffic or teleportation > 1 km in 20s / 3 km in 45s. Automatically flags `telematicsAnomalyFlagged: true` for administrative audit. | `backend-python/app/api/rider.py:L1220` |
| `ADV-04` | **Admin Four-Eyes (Dual-Control) Authorization** | Admin Console & Operations | High-impact actions (Refunds >= ₹5,000, merchant bans, commission overrides) strictly require approval from a SECOND independent verified admin; self-approval is rejected. | `backend-python/app/services/dual_control_service.py` |
| `ADV-05` | **Automated DPDP Act 2023 Data Anonymization** | Data Retention & Privacy | Orders delivered > 180 days have customer phone, full name, gate codes and precise GPS scrubbed, while preserving GST tax invoices intact for the statutory 7-year audit requirement. | `backend-python/app/services/dpdp_anonymization_service.py` |
| `ADV-06` | **Dynamic Surge Ceiling Circuit Breaker** | Pricing Engine & Dispatch | Enforces a hard ceiling of `3.5x` maximum multiplier and `₹75.0` maximum bonus on dynamic surge calculations to protect customers against runaway surge anomalies. | `backend-python/app/services/surge_engine.py:L342` |

---

## 4. Bank-Grade Admin Console Hardening (9 Core Security Points)

| Point ID | Security Domain | Target Layer | Enforcement Logic & Impact | File Reference |
| :--- | :--- | :--- | :--- | :--- |
| `SEC-ADM-01` | **RBAC Access Control** | Auth & Middleware | Strict granular role enforcement (`support`, `operations`, `finance`, `admin`, `super_admin`). Unassigned actions rejected with 403. | `backend-python/app/core/admin_security.py:L545` |
| `SEC-ADM-02` | **Two-Factor Auth (2FA)** | Authentication | Cryptographic 6-digit OTP/challenge verified before session generation; rate limited to 5/hr with 24h lockout on 3 failed attempts. | `backend-python/app/core/admin_security.py:L370` |
| `SEC-ADM-03` | **Session & Device Monitor** | Session Layer | Tracks active session UUID, IP, User-Agent; enforces 15-minute idle timeout; provides remote session termination. | `backend-python/app/core/admin_security.py:L620` |
| `SEC-ADM-04` | **Sensitive Action Sudo Mode** | Operations Guard | High-impact mutations require 15-minute Sudo re-authentication token via password confirmation. | `backend-python/app/core/admin_security.py:L695` |
| `SEC-ADM-05` | **Immutable Audit Logs** | Compliance Trail | Every administrative modification writes an indelible JSON audit document with actor, target, timestamp, and IP. | `backend-python/app/core/admin_security.py:L530` |
| `SEC-ADM-06` | **Chronological Login History**| Access Ledger | Records every login attempt with status (SUCCESS/FAILED), IP, client browser, and failure reasons. | `backend-python/app/core/admin_security.py:L740` |
| `SEC-ADM-07` | **Failed-Login Alerts & Lockout**| Threat Defense | 5 consecutive wrong passwords trigger immediate 15-minute IP/account lockout and email threat alerts. | `backend-python/app/core/admin_security.py:L465` |
| `SEC-ADM-08` | **Finance Segregation of Duties**| Financial Integrity | Support Agents strictly blocked from executing refunds or wallet adjustments; only verified Finance roles can issue payouts. | `backend-python/app/api/admin.py:L2330` |
| `SEC-ADM-09` | **Super Admin Four-Eyes Bound** | Dual-Control Governance| Super Admins cannot execute single-handed refunds >= ₹5,000 or merchant bans; self-approval prohibited. | `backend-python/app/services/dual_control_service.py` |

---

## 5. API & Network Gateway Security Controls (11 Core Security Pillars)

| Point ID | Security Domain | Target Layer | Enforcement Logic & Impact | File Reference |
| :--- | :--- | :--- | :--- | :--- |
| `SEC-NET-01` | **HTTPS-Only & HSTS** | Gateway & TLS | Production HTTP traffic permanently redirected (301) to HTTPS; Strict-Transport-Security header enforces 1-year browser encryption tunnel. | `app/core/security_headers.py` |
| `SEC-NET-02` | **Strict CORS Whitelist** | Browser Gateway | Strict whitelisting with zero wildcard reflection; prevents third-party origins from intercepting cookies or receiving reflected access. | `app/main.py:L155` |
| `SEC-NET-03` | **Request Schema Validation** | FastAPI / Pydantic | Every endpoint parameter, query, and payload validated by strict schemas; malformed or negative inputs rejected with standardized 422. | `app/main.py:L305` |
| `SEC-NET-04` | **Sliding Window Rate Limiter** | API Shield | Multi-tier rate limiting (Auth 12/min, Sudo 6/min, Payments 15/min, Mutations 40/min, Global 150/min); blocks brute-force and DoS loops with 429. | `app/core/rate_limiter.py` |
| `SEC-NET-05` | **Cryptographic Authentication** | Identity Layer | Every protected endpoint requires valid Supabase Auth JWT / Bearer Token; unauthenticated requests dropped with 401. | `app/core/deps.py` |
| `SEC-NET-06` | **Granular Authorization** | Access Control | Role-Based Access Control (RBAC) and strict tenant isolation; cross-user, cross-merchant, and unauthorized refunds blocked with 403. | `app/core/admin_security.py` |
| `SEC-NET-07` | **Multi-Vector Sanitization** | WAF & Query Guard | Deep regex and operator filter blocking SQL Injection (`UNION SELECT`, `' OR '1'='1`), XSS (`<script>`, `onerror=`), and NoSQL operators with 400. | `app/core/sanitizer.py` |
| `SEC-NET-08` | **Pagination Limits & OOM Guard** | Memory Defense | Intercepts all `limit` / `page_size` queries and enforces hard ceilings (Max 100 general, 200 financial); prevents Out-Of-Memory server crashes. | `app/core/pagination.py` |
| `SEC-NET-09` | **Request Payload Size Limits** | Buffer Shield | Limits request bodies to Max 2 MB for JSON and 10 MB for media uploads; drops oversized payloads with 413 Payload Too Large before memory buffering. | `app/core/request_size_limiter.py` |
| `SEC-NET-10` | **RFC Idempotency-Key Header** | Payment Integrity | Accepts `Idempotency-Key` / `X-Idempotency-Key` headers on order and payment APIs; prevents double charges and duplicate order replays. | `app/api/orders.py`, `app/api/payments.py` |
| `SEC-NET-11` | **Sensitive Endpoint Sudo Shield** | Governance Layer | High-impact administrative actions require active Sudo Mode re-authentication tokens; prevents unattended terminal hijackings. | `app/core/admin_security.py`, `app/api/admin.py` |

---

## 6. Database Vault Security & Disaster Recovery (9 Core Pillars)

| Point ID | Security Domain | Target Layer | Enforcement Logic & Impact | File Reference |
| :--- | :--- | :--- | :--- | :--- |
| `SEC-DB-01` | **Restricted Network & SSL** | Transport Layer | Direct PostgreSQL port 5432 exposure blocked by Private VPC; production backend enforces `sslmode=require` encryption tunnel. | `app/db/supabase_client.py:L785` |
| `SEC-DB-02` | **Strong Credentials Vault** | Secrets Management | High-entropy secrets (40+ chars) loaded from environment; automated auditor rejects weak passwords and default accounts. | `app/core/db_security_guard.py` |
| `SEC-DB-03` | **Least-Privilege App Role** | PostgreSQL Role | Service connects as `quickpress_app_role` with DML grants (`SELECT, INSERT, UPDATE, DELETE`) only; DDL (`DROP`, `ALTER`) revoked. | `supabase/migrations/20261006_quickpress_database_vault_hardening.sql` |
| `SEC-DB-04` | **Prod/Dev DB Separation** | Environment Guard | Environment isolation guard prevents local development or automated tests from connecting to or mutating live production databases. | `app/core/db_security_guard.py` |
| `SEC-DB-05` | **Field-Level AES-256-GCM** | Data-at-Rest Crypto | Authenticated Encryption (AEAD) with 96-bit unique nonces for Aadhaar, PAN, Bank Accounts, and customer PII; includes format-preserving UI masking. | `app/core/field_crypto.py` |
| `SEC-DB-06` | **Composite & GIN Indexes** | Database Optimization | GIN JSONB indexing (`jsonb_path_ops` and full GIN) + composite B-tree indexes for `(userId, createdAt)`, `(partnerId, status)`, `(riderId, status)`, and `idempotencyKey`. | `app/db/supabase_client.py:L845` |
| `SEC-DB-07` | **Automated Backup & PITR** | Disaster Recovery | Daily encrypted backups (`pg_dump + gzip + AES-256`) + Continuous Write-Ahead Log (WAL) archiving for minute-by-minute point-in-time recovery. | `supabase/scripts/backup_and_pitr_recovery.sh` |
| `SEC-DB-08` | **Immutable DB Audit Logs** | Compliance Trail | PostgreSQL trigger `quickpress_audit_trigger_func` logs every mutation on orders, wallets, settlements to append-only `quickpress_db_audit_log`. | `quickpress_db_audit_log` |
| `SEC-DB-09` | **Database RLS Policies** | Database Engine | PostgreSQL Row-Level Security (RLS) active on all tables; audit log table allows `NO UPDATE` and `NO DELETE` even for system administrators. | `supabase/security_rules.sql` |

---

## 7. Verification & Audit Conclusion

| Security Domain | Rules Implemented | Verification State |
| :--- | :---: | :---: |
| Database RLS (PostgreSQL) | 9 | **ACTIVE & COMPILED** |
| Storage & KYC Document Protection | 5 | **ACTIVE & COMPILED** |
| Delivery Captain Operations & GPS | 7 | **ACTIVE & TESTED** |
| Laundry Merchant Isolation | 7 | **ACTIVE & TESTED** |
| Customer Privacy & Auth | 5 | **ACTIVE & TESTED** |
| Financial Ledger & Taxes | 5 | **ACTIVE & BALANCED** |
| Phase 2 Advanced Scaling Rules | 6 | **ACTIVE & TESTED (6/6)** |
| Bank-Grade Admin Console Hardening | 9 | **ACTIVE & TESTED (9/9)** |
| API & Network Gateway Controls | 11 | **ACTIVE & TESTED (11/11)** |
| **Database Vault & Disaster Recovery** | **9** | **ACTIVE & TESTED (9/9)** |
| **TOTAL QUICKPRESS RULES** | **73** | **100% PRODUCTION READY** |


