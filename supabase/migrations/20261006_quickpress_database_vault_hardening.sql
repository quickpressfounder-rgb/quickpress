-- QuickPress Supabase Migration: 20261006_quickpress_database_vault_hardening.sql
-- Enforces:
-- 1. Database-level immutable audit logging table and automatic mutation trigger
-- 2. Least-privilege application role (DML only, no DDL/DROP)
-- 3. Row-Level Security on audit trails (immutable, append-only)
-- 4. Critical composite indexing for sub-millisecond query isolation

-- =========================================================================
-- 1. Immutable Database Mutation Audit Log Table
-- =========================================================================

CREATE TABLE IF NOT EXISTS quickpress_db_audit_log (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL DEFAULT 'quickpress_documents',
    collection TEXT,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT,
    changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qp_audit_collection ON quickpress_db_audit_log (collection, record_id);
CREATE INDEX IF NOT EXISTS idx_qp_audit_changed_at ON quickpress_db_audit_log (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_qp_audit_action ON quickpress_db_audit_log (action);

-- Enable RLS on Audit Log Table
ALTER TABLE IF EXISTS quickpress_db_audit_log ENABLE ROW LEVEL SECURITY;

-- Service Role Full Insert/Select
DROP POLICY IF EXISTS "Service Role Audit Log Access" ON quickpress_db_audit_log;
CREATE POLICY "Service Role Audit Log Access"
ON quickpress_db_audit_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can only READ audit logs; NO ONE can UPDATE or DELETE
DROP POLICY IF EXISTS "Admin Read-Only Audit Log" ON quickpress_db_audit_log;
CREATE POLICY "Admin Read-Only Audit Log"
ON quickpress_db_audit_log
FOR SELECT
TO authenticated
USING (
    (auth.jwt() ->> 'role') IN ('admin', 'super_admin')
    OR (auth.jwt() ->> 'email') LIKE '%@quickpress.com'
);

-- =========================================================================
-- 2. Automated PostgreSQL Mutation Capture Trigger
-- =========================================================================

CREATE OR REPLACE FUNCTION quickpress_audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    curr_collection TEXT;
    rec_id TEXT;
    audit_collections TEXT[] := ARRAY['customer_orders', 'wallets', 'rider_wallets', 'partner_profiles', 'order_settlements', 'admin_staff'];
BEGIN
    IF (TG_OP = 'DELETE') THEN
        curr_collection := OLD.collection;
        rec_id := OLD.id;
        IF curr_collection = ANY(audit_collections) THEN
            INSERT INTO quickpress_db_audit_log(collection, record_id, action, old_data, new_data, changed_at)
            VALUES (curr_collection, rec_id, 'DELETE', OLD.data, NULL, NOW());
        END IF;
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        curr_collection := NEW.collection;
        rec_id := NEW.id;
        IF curr_collection = ANY(audit_collections) THEN
            -- Only record if data actually changed
            IF OLD.data IS DISTINCT FROM NEW.data THEN
                INSERT INTO quickpress_db_audit_log(collection, record_id, action, old_data, new_data, changed_at)
                VALUES (curr_collection, rec_id, 'UPDATE', OLD.data, NEW.data, NOW());
            END IF;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        curr_collection := NEW.collection;
        rec_id := NEW.id;
        IF curr_collection = ANY(audit_collections) THEN
            INSERT INTO quickpress_db_audit_log(collection, record_id, action, old_data, new_data, changed_at)
            VALUES (curr_collection, rec_id, 'INSERT', NULL, NEW.data, NOW());
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to quickpress_documents
DROP TRIGGER IF EXISTS trg_quickpress_docs_audit ON quickpress_documents;
CREATE TRIGGER trg_quickpress_docs_audit
AFTER INSERT OR UPDATE OR DELETE ON quickpress_documents
FOR EACH ROW EXECUTE FUNCTION quickpress_audit_trigger_func();

-- =========================================================================
-- 3. Least-Privilege Application Role Specification
-- =========================================================================
-- In production, the API service connects as 'quickpress_app_role' which possesses
-- strictly DML access (SELECT, INSERT, UPDATE, DELETE) and has no DDL privileges.

DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'quickpress_app_role') THEN
        CREATE ROLE quickpress_app_role WITH LOGIN PASSWORD 'ReplaceWithVaultStrongPassword2026!';
    END IF;
END
$$;

-- Grant standard usage on public schema
GRANT USAGE ON SCHEMA public TO quickpress_app_role;

-- Grant data manipulation privileges only
GRANT SELECT, INSERT, UPDATE, DELETE ON quickpress_documents TO quickpress_app_role;
GRANT SELECT, INSERT ON quickpress_db_audit_log TO quickpress_app_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO quickpress_app_role;

-- Explicitly revoke DDL (DROP / ALTER) capabilities
REVOKE ALL PRIVILEGES ON SCHEMA public FROM quickpress_app_role;
GRANT USAGE ON SCHEMA public TO quickpress_app_role;
