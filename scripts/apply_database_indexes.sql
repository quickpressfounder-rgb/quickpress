-- ==============================================================================
-- QuickPress Supabase PostgreSQL Database Indexing Script
-- Optimizes query performance, zero-latency search, and instant dashboard loading
-- ==============================================================================

-- 1. Ensure primary document store exists
CREATE TABLE IF NOT EXISTS quickpress_documents (
    id TEXT PRIMARY KEY,
    collection TEXT NOT NULL,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Core Collection & Document ID Indexes
CREATE INDEX IF NOT EXISTS idx_qp_docs_collection ON quickpress_documents(collection);
CREATE INDEX IF NOT EXISTS idx_qp_docs_collection_id ON quickpress_documents(collection, id);
CREATE INDEX IF NOT EXISTS idx_qp_docs_updated_at ON quickpress_documents (collection, updated_at DESC);

-- 3. High-Performance GIN JSONB Path Ops (Fast internal key lookups)
CREATE INDEX IF NOT EXISTS idx_qp_docs_gin ON quickpress_documents USING gin (data jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_qp_docs_gin_full ON quickpress_documents USING gin (data);

-- 4. Identity & Authentication Indexes
CREATE INDEX IF NOT EXISTS idx_qp_docs_user_id ON quickpress_documents (collection, (data->>'userId'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_phone ON quickpress_documents (collection, (data->>'phone'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_role ON quickpress_documents (collection, (data->>'role'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_idempotency_key ON quickpress_documents (collection, (data->>'idempotencyKey'));

-- 5. Partner & Rider Operations Indexes
CREATE INDEX IF NOT EXISTS idx_qp_docs_partner_id ON quickpress_documents (collection, (data->>'partnerId'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_partner_pid ON quickpress_documents (collection, (data->'partner'->>'id'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_rider_id ON quickpress_documents (collection, (data->>'riderId'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_is_online ON quickpress_documents (collection, (data->>'isOnline'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_status ON quickpress_documents (collection, (data->>'status'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_partner_orders ON quickpress_documents (collection, (data->>'partnerId'), (data->>'status'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_rider_rides ON quickpress_documents (collection, (data->>'riderId'), (data->>'status'));

-- 6. Geographic Location & City Filtering Indexes
CREATE INDEX IF NOT EXISTS idx_qp_docs_city ON quickpress_documents (collection, (data->>'city'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_pincode ON quickpress_documents (collection, (data->>'pincode'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_role_city ON quickpress_documents (collection, (data->>'role'), (data->>'city'));

-- 7. Orders & Customer Tracking Indexes
CREATE INDEX IF NOT EXISTS idx_qp_docs_order_id ON quickpress_documents (collection, (data->>'orderId'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_code ON quickpress_documents (collection, (data->>'code'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_order_code ON quickpress_documents (collection, (data->>'orderCode'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_cust_phone ON quickpress_documents (collection, (data->>'customerPhone'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_created_at ON quickpress_documents (collection, (data->>'createdAt'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_user_orders ON quickpress_documents (collection, (data->>'userId'), (data->>'createdAt') DESC);

-- 8. Referral Program Multi-Role Indexes
CREATE INDEX IF NOT EXISTS idx_qp_docs_referrer_id ON quickpress_documents (collection, (data->>'referrer_id'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_referee_id ON quickpress_documents (collection, (data->>'referee_id'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_referral_code ON quickpress_documents (collection, (data->>'referral_code'));

-- 9. Finance, Settlements & Double-Entry Ledger Indexes
CREATE INDEX IF NOT EXISTS idx_qp_docs_cycle_id ON quickpress_documents (collection, (data->>'cycleId'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_is_settled ON quickpress_documents (collection, (data->>'isSettled'));
CREATE INDEX IF NOT EXISTS idx_qp_docs_kind ON quickpress_documents (collection, (data->>'kind'));

-- Analyze table to update query planner statistics immediately
ANALYZE quickpress_documents;
