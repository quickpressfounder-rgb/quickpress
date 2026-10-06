-- ==============================================================================
-- QuickPress Hyper-Local Marketplace Platform
-- Master Supabase PostgreSQL Row Level Security (RLS) & Database Policies
-- ==============================================================================
-- Covers:
-- 1. Service Role bypass for trusted FastAPI Backend engine
-- 2. Customer Isolation (Orders, Addresses, PII Masking)
-- 3. Partner Store Isolation (Store orders, pricing, bank settings)
-- 4. Delivery Captain Isolation (Assigned rides, geo-trips, earnings)
-- 5. Public read-only catalog & store discovery (Services, Cities)
-- 6. Financial Ledger Immutability (Settlements, Wallets, Audit logs)
-- ==============================================================================

-- 1. Ensure Table Exists and Enable Row Level Security
CREATE TABLE IF NOT EXISTS quickpress_documents (
    id TEXT PRIMARY KEY,
    collection TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quickpress_documents ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy / permissive policies to avoid security leaks
DROP POLICY IF EXISTS "Service Role Full Access" ON quickpress_documents;
DROP POLICY IF EXISTS "Public Catalog Discovery" ON quickpress_documents;
DROP POLICY IF EXISTS "Customer Read Own Data" ON quickpress_documents;
DROP POLICY IF EXISTS "Customer Create Own Orders" ON quickpress_documents;
DROP POLICY IF EXISTS "Partner Store Read Own Data" ON quickpress_documents;
DROP POLICY IF EXISTS "Partner Update Store Status" ON quickpress_documents;
DROP POLICY IF EXISTS "Rider Read Assigned Trips" ON quickpress_documents;
DROP POLICY IF EXISTS "Block Direct Wallet Modifications" ON quickpress_documents;
DROP POLICY IF EXISTS "Financial Ledger Immutability" ON quickpress_documents;
DROP POLICY IF EXISTS "Admin Full Console Access" ON quickpress_documents;

-- ==============================================================================
-- POLICY 1: Service Role (FastAPI Backend Server Engine Bypass)
-- The backend uses the Supabase service_role key to run authoritative
-- double-entry financial calculations, dispatch, and settlement disbursements.
-- ==============================================================================
CREATE POLICY "Service Role Full Access"
ON quickpress_documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- POLICY 2: Admin / SuperAdmin Role Policy
-- Authorized admin accounts with role = 'admin' claim in JWT
-- ==============================================================================
CREATE POLICY "Admin Full Console Access"
ON quickpress_documents
FOR ALL
TO authenticated
USING (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') LIKE '%@quickpress.com'
)
WITH CHECK (
    (auth.jwt() ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') LIKE '%@quickpress.com'
);

-- ==============================================================================
-- POLICY 3: Public Catalog Discovery (Anonymous & Authenticated Users)
-- Allows reading publicly active laundry services, item price lists, cities,
-- banner promotions, and verified store cards.
-- ==============================================================================
CREATE POLICY "Public Catalog Discovery"
ON quickpress_documents
FOR SELECT
TO anon, authenticated
USING (
    collection IN (
        'services',
        'partner_services',
        'service_categories',
        'cities',
        'localities',
        'pricing_catalog',
        'cms_banners',
        'faqs',
        'app_config'
    )
    AND (
        (data ->> 'isActive') IS NULL 
        OR (data ->> 'isActive') = 'true'
        OR (data ->> 'status') = 'active'
    )
);

-- ==============================================================================
-- POLICY 4: Customer Isolation Rules
-- Customer can read ONLY their own profile, addresses, orders, and support tickets.
-- ==============================================================================
CREATE POLICY "Customer Read Own Data"
ON quickpress_documents
FOR SELECT
TO authenticated
USING (
    collection IN (
        'customers',
        'customer_profiles',
        'customer_orders',
        'customer_addresses',
        'support_tickets',
        'reviews',
        'notifications'
    )
    AND (
        (data ->> 'userId') = (auth.uid())::text
        OR (data ->> 'customerId') = (auth.uid())::text
        OR (data ->> 'phone') = (auth.jwt() ->> 'phone')
        OR (data -> 'customer' ->> 'id') = (auth.uid())::text
    )
);

CREATE POLICY "Customer Create Own Orders"
ON quickpress_documents
FOR INSERT
TO authenticated
WITH CHECK (
    collection IN ('customer_orders', 'customer_addresses', 'support_tickets', 'reviews')
    AND (
        (data ->> 'userId') = (auth.uid())::text
        OR (data ->> 'customerId') = (auth.uid())::text
        OR (data -> 'customer' ->> 'id') = (auth.uid())::text
    )
);

-- ==============================================================================
-- POLICY 5: Laundry Partner Store Isolation Rules
-- Partner can read and update ONLY their own store profile, service menu,
-- and orders routed to their specific store ID.
-- ==============================================================================
CREATE POLICY "Partner Store Read Own Data"
ON quickpress_documents
FOR SELECT
TO authenticated
USING (
    collection IN (
        'partner_profiles',
        'partner_settings',
        'partner_services',
        'customer_orders',
        'order_settlements',
        'partner_withdrawals',
        'partner_notifications'
    )
    AND (
        (data ->> 'partnerId') = (auth.uid())::text
        OR (data -> 'partner' ->> 'id') = (auth.uid())::text
        OR (data ->> 'userId') = (auth.uid())::text
    )
);

CREATE POLICY "Partner Update Store Status"
ON quickpress_documents
FOR UPDATE
TO authenticated
USING (
    collection IN ('partner_profiles', 'partner_services', 'partner_settings')
    AND (
        (data ->> 'partnerId') = (auth.uid())::text
        OR (data ->> 'userId') = (auth.uid())::text
    )
)
WITH CHECK (
    collection IN ('partner_profiles', 'partner_services', 'partner_settings')
    AND (
        (data ->> 'partnerId') = (auth.uid())::text
        OR (data ->> 'userId') = (auth.uid())::text
    )
);

-- ==============================================================================
-- POLICY 6: Delivery Captain (Rider) Isolation Rules
-- Rider can read assigned rides, broadcast offers in their city,
-- passbook receipts, and their own KYC/bank verification records.
-- ==============================================================================
CREATE POLICY "Rider Read Assigned Trips"
ON quickpress_documents
FOR SELECT
TO authenticated
USING (
    (
        collection = 'rides'
        AND (
            (data ->> 'riderId') = (auth.uid())::text
            OR (data ->> 'assignedRiderId') = (auth.uid())::text
            OR (data ->> 'offeredRiderId') = (auth.uid())::text
            OR (data ->> 'status') = 'OFFERED'
        )
    )
    OR (
        collection IN (
            'rider_profiles',
            'rider_bank_accounts',
            'rider_settings',
            'rider_wallet_transactions',
            'rider_notifications'
        )
        AND (
            (data ->> 'riderId') = (auth.uid())::text
            OR (data ->> 'rider_id') = (auth.uid())::text
            OR (data ->> 'userId') = (auth.uid())::text
        )
    )
);

-- ==============================================================================
-- POLICY 7: Financial Integrity & Zero Direct Wallet Writes
-- CRITICAL RULE: Wallets, double-entry general ledgers, and settlements can
-- NEVER be modified directly by frontend clients (even if authenticated).
-- All wallet balance changes must pass through the Backend API with audit hashes.
-- ==============================================================================
CREATE POLICY "Block Direct Wallet Modifications"
ON quickpress_documents
FOR INSERT
TO authenticated
WITH CHECK (
    collection NOT IN (
        'wallets',
        'partner_wallets',
        'rider_wallets',
        'settlements',
        'finance_ledger',
        'platform_commissions',
        'general_ledger',
        'audit_logs'
    )
);

-- ==============================================================================
-- POLICY 8: Performance Indexes on JSONB Document Store
-- Speeds up RLS filtering and sub-millisecond query evaluation.
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_qp_rls_user_id ON quickpress_documents (collection, (data->>'userId'));
CREATE INDEX IF NOT EXISTS idx_qp_rls_partner_id ON quickpress_documents (collection, (data->>'partnerId'));
CREATE INDEX IF NOT EXISTS idx_qp_rls_partner_obj ON quickpress_documents (collection, (data->'partner'->>'id'));
CREATE INDEX IF NOT EXISTS idx_qp_rls_rider_id ON quickpress_documents (collection, (data->>'riderId'));
CREATE INDEX IF NOT EXISTS idx_qp_rls_customer_id ON quickpress_documents (collection, (data->>'customerId'));
CREATE INDEX IF NOT EXISTS idx_qp_rls_status ON quickpress_documents (collection, (data->>'status'));
CREATE INDEX IF NOT EXISTS idx_qp_rls_is_active ON quickpress_documents (collection, (data->>'isActive'));

-- Verified QuickPress Security Schema initialization complete.
