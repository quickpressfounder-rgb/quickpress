-- QuickPress Supabase Migration: 20261006_quickpress_security_rules.sql
-- Enables RLS and sets strict access policies across QuickPress document collections.

ALTER TABLE IF EXISTS quickpress_documents ENABLE ROW LEVEL SECURITY;

-- 1. Service Role Bypass for FastAPI Backend Server
DROP POLICY IF EXISTS "Service Role Full Access" ON quickpress_documents;
CREATE POLICY "Service Role Full Access"
ON quickpress_documents
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Admin / SuperAdmin Access
DROP POLICY IF EXISTS "Admin Full Console Access" ON quickpress_documents;
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

-- 3. Public Discovery (Services, Cities, Catalogs)
DROP POLICY IF EXISTS "Public Catalog Discovery" ON quickpress_documents;
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

-- 4. Customer Isolation (Orders, Addresses, Profile)
DROP POLICY IF EXISTS "Customer Read Own Data" ON quickpress_documents;
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

-- 5. Partner Store Isolation
DROP POLICY IF EXISTS "Partner Store Read Own Data" ON quickpress_documents;
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

-- 6. Delivery Captain Isolation
DROP POLICY IF EXISTS "Rider Read Assigned Trips" ON quickpress_documents;
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

-- 7. Block Direct Financial Modifications (Wallets & General Ledger)
DROP POLICY IF EXISTS "Block Direct Wallet Modifications" ON quickpress_documents;
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
