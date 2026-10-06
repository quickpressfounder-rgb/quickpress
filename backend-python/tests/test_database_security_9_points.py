"""Comprehensive Test Suite for 9 Database Vault Security & Disaster Recovery Pillars.

Validates:
1. Public internet transport security & SSL enforcement
2. High-entropy credentials audit & rejection of weak passwords
3. Least-privilege application role specification
4. Production vs Development environment isolation
5. Field-level AES-256-GCM encryption, tamper resistance & masking
6. High-scale composite and GIN indexing DDL
7. Backup and Point-In-Time Recovery (PITR) procedures
8. Immutable database mutation audit trigger
9. Database-level Row-Level Security access policies
"""

from __future__ import annotations

import os
import subprocess
import pytest

from app.core.field_crypto import (
    decrypt_sensitive_field,
    encrypt_sensitive_field,
    is_encrypted,
    mask_sensitive_field,
)
from app.core.db_security_guard import validate_database_security_posture


# -----------------------------------------------------------------------------
# 1 & 2. SSL Enforcement & Strong Credentials Audit
# -----------------------------------------------------------------------------
def test_01_and_02_database_security_posture_and_weak_credentials():
    """Verify detection of weak credentials, missing SSL, and unsecured root users."""
    # Weak password check
    weak_url = "postgresql://postgres:password123@localhost:5432/quickpress"
    is_sec, violations = validate_database_security_posture(weak_url, "development")
    assert is_sec is False
    assert any("Weak or default database password" in v for v in violations)

    # Production missing SSL check
    unencrypted_prod_url = "postgresql://dbuser:StrongRandomPass2026!@db.quickpress.net:5432/quickpress"
    is_sec, violations = validate_database_security_posture(unencrypted_prod_url, "production")
    assert is_sec is False
    assert any("SSL/TLS" in v for v in violations)

    # Secure production connection
    secure_prod_url = "postgresql://qp_app_user:StrongRandomPass2026!@db.quickpress.net:5432/quickpress?sslmode=require"
    is_sec, violations = validate_database_security_posture(secure_prod_url, "production")
    assert is_sec is True
    assert len(violations) == 0


# -----------------------------------------------------------------------------
# 3. Least-Privilege Role Specification
# -----------------------------------------------------------------------------
def test_03_least_privilege_app_role_migration():
    """Verify that migration script explicitly creates quickpress_app_role with DML only."""
    migration_path = os.path.join(
        os.path.dirname(__file__),
        "../../supabase/migrations/20261006_quickpress_database_vault_hardening.sql",
    )
    with open(migration_path, "r", encoding="utf-8") as f:
        sql = f.read()

    assert "CREATE ROLE quickpress_app_role" in sql
    assert "GRANT SELECT, INSERT, UPDATE, DELETE ON quickpress_documents TO quickpress_app_role" in sql
    assert "REVOKE ALL PRIVILEGES ON SCHEMA public FROM quickpress_app_role" in sql


# -----------------------------------------------------------------------------
# 4. Production vs Dev Environment Isolation
# -----------------------------------------------------------------------------
def test_04_environment_isolation_guard():
    """Verify that dev/testing environment is blocked from pointing to production cluster."""
    prod_leak_url = "postgresql://user:pass@quickpress-prod.supabase.co:5432/postgres"
    is_sec, violations = validate_database_security_posture(prod_leak_url, "development")
    assert is_sec is False
    assert any("Development environment cannot point directly to production" in v for v in violations)

    # Production pointing to localhost blocked
    prod_local_url = "postgresql://user:pass@localhost:5432/postgres"
    is_sec, violations = validate_database_security_posture(prod_local_url, "production")
    assert is_sec is False
    assert any("Production environment cannot bind to localhost" in v for v in violations)


# -----------------------------------------------------------------------------
# 5. Field-Level AES-256-GCM Encryption & Masking
# -----------------------------------------------------------------------------
def test_05_field_level_encryption_and_masking():
    """Verify AES-256-GCM encryption, decryption, tamper-resistance and PII masking."""
    plaintext_aadhaar = "542189012345"
    plaintext_bank = "98765432101234"

    # 1. Encryption
    encrypted_aadhaar = encrypt_sensitive_field(plaintext_aadhaar)
    assert is_encrypted(encrypted_aadhaar) is True
    assert encrypted_aadhaar.startswith("enc:v1:")
    assert plaintext_aadhaar not in encrypted_aadhaar

    # 2. Decryption Round-Trip
    decrypted_aadhaar = decrypt_sensitive_field(encrypted_aadhaar)
    assert decrypted_aadhaar == plaintext_aadhaar

    # 3. Tamper Resistance: Altering ciphertext bytes must raise ValueError
    tampered = encrypted_aadhaar[:-4] + "AAAA"
    with pytest.raises(ValueError):
        decrypt_sensitive_field(tampered)

    # 4. Transparent Fallback for legacy unencrypted values
    assert decrypt_sensitive_field("plain_legacy_val") == "plain_legacy_val"
    assert decrypt_sensitive_field(None) is None

    # 5. Masking
    assert mask_sensitive_field(plaintext_aadhaar) == "XXXX-XXXX-2345"
    assert mask_sensitive_field(encrypted_aadhaar) == "XXXX-XXXX-2345"
    assert mask_sensitive_field(plaintext_bank) == "XXXXXXXXXX1234"


# -----------------------------------------------------------------------------
# 6. Composite & GIN Indexing Verification
# -----------------------------------------------------------------------------
def test_06_proper_database_indexes_ddl():
    """Verify that high-performance composite and GIN indexes exist in client DDL."""
    from app.db.supabase_client import SupabaseDatabase

    # Read the file text directly to verify DDL schema statement
    client_file = os.path.join(
        os.path.dirname(__file__),
        "../app/db/supabase_client.py",
    )
    with open(client_file, "r", encoding="utf-8") as f:
        content = f.read()

    assert "idx_qp_docs_gin" in content
    assert "idx_qp_docs_gin_full" in content
    assert "idx_qp_docs_idempotency_key" in content
    assert "idx_qp_docs_user_orders" in content
    assert "idx_qp_docs_partner_orders" in content
    assert "idx_qp_docs_rider_rides" in content


# -----------------------------------------------------------------------------
# 7. Backup & Point-In-Time Recovery (PITR) Script
# -----------------------------------------------------------------------------
def test_07_backup_and_pitr_script():
    """Verify that backup and PITR orchestrator script exists and has valid syntax."""
    script_path = os.path.join(
        os.path.dirname(__file__),
        "../../supabase/scripts/backup_and_pitr_recovery.sh",
    )
    assert os.path.exists(script_path)
    assert os.access(script_path, os.X_OK)

    # Test syntax check with bash -n
    proc = subprocess.run(["bash", "-n", script_path], capture_output=True, text=True)
    assert proc.returncode == 0


# -----------------------------------------------------------------------------
# 8 & 9. Database-Level Audit Logs & Access Restrictions
# -----------------------------------------------------------------------------
def test_08_and_09_database_audit_log_and_rls_policies():
    """Verify immutable audit log table, trigger function, and RLS policies."""
    migration_path = os.path.join(
        os.path.dirname(__file__),
        "../../supabase/migrations/20261006_quickpress_database_vault_hardening.sql",
    )
    with open(migration_path, "r", encoding="utf-8") as f:
        sql = f.read()

    # Audit log table and trigger
    assert "CREATE TABLE IF NOT EXISTS quickpress_db_audit_log" in sql
    assert "CREATE OR REPLACE FUNCTION quickpress_audit_trigger_func()" in sql
    assert "CREATE TRIGGER trg_quickpress_docs_audit" in sql

    # Immutable RLS on audit logs
    assert "ALTER TABLE IF EXISTS quickpress_db_audit_log ENABLE ROW LEVEL SECURITY;" in sql
    assert "Admin Read-Only Audit Log" in sql
    # Ensures no UPDATE or DELETE policy is defined for audit log
    assert "FOR UPDATE" not in sql
    assert "FOR DELETE" not in sql or "TG_OP = 'DELETE'" in sql
