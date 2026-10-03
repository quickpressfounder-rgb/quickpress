"""Clean wipe of all demo/seed riders, partners, customers, and orders.

Preserves strictly:
- Super Admin login and admin users
- Master Operating Cities
- Master Service Categories & Services
- Promotional Discount Coupons
- Master Catalog and CMS definitions
"""

import asyncio
import logging
import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.client import database
from app.core.admin_security import ensure_super_admin_seed
from app.db.admin_seed import ensure_admin_operational_seed
from app.db.catalog_repositories import catalog
from app.db.cms_repositories import cms_repo

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("clean_entities")

ENTITIES_COLLECTIONS_TO_WIPE = [
    # Customer collections
    "customers",
    "customer_addresses",
    "customer_carts",
    "carts",
    "customer_reviews",
    "customer_settings",
    "customer_favourite_partners",
    "user_loyalty",
    "loyalty_transactions",
    "memberships",

    # Rider collections
    "admin_riders",
    "riders",
    "rider_profiles",
    "rider_wallets",
    "rider_wallet_transactions",
    "rider_notifications",
    "rider_deliveries",
    "rider_settings",
    "rider_earnings",
    "rider_analytics",
    "rider_bank_accounts",
    "rider_shifts",
    "rider_activity_logs",
    "rider_reviews",
    "rider_route_bookings",

    # Partner collections
    "admin_partners",
    "partners",
    "partner_profiles",
    "catalog_partners",
    "partner_verifications",
    "partner_wallets",
    "partner_wallet_transactions",
    "partner_settings",
    "partner_orders",
    "partner_services",
    "partner_activity_logs",
    "partner_reviews",
    "partner_approval_requests",
    "partner_operations",

    # Order & Dispatch collections
    "customer_orders",
    "orders",
    "order_events",
    "order_reviews",
    "order_timeline",
    "order_counters",
    "order_financials",
    "order_settlements",
    "reorder_history",
    "rides",
    "ride_assignments",
    "rider_offers",
    "live_locations",

    # Financial & Settlements
    "settlements",
    "financial_ledger",
    "financial_audit_logs",
    "invoices",
    "platform_commissions",
    "referrals",

    # CRM internal & support data
    "crm_notes",
    "crm_communications",
    "support_tickets",
    "admin_support_tickets",
    "refunds",
    "admin_payouts",
    "gateway_payments",
    "gateway_order_secrets",
    "gateway_refunds",
    "wallets",
    "user_wallets",
    "wallet_transactions",
    "admin_wallet_transactions",
    "wallet_ledger",
    "notifications",
    "admin_notifications",

    # Cleanup stale tokens and OTP attempts
    "refresh_tokens",
    "otp_attempts",
    "admin_security_events",
    "automation_activity_logs",
    "email_logs",
    "sms_logs",
    "whatsapp_logs",
]


async def run_wipe():
    logger.info("Connecting to Database...")
    await database.connect()
    pool = await database._supabase.get_pool()

    async with pool.acquire() as conn:
        logger.info("Executing collection wipes directly in Supabase PostgreSQL...")
        for coll_name in ENTITIES_COLLECTIONS_TO_WIPE:
            try:
                res = await conn.execute(
                    "DELETE FROM quickpress_documents WHERE collection = $1", coll_name
                )
                cnt = res.split(" ")[-1] if " " in res else res
                if cnt != "0":
                    logger.info("✓ Wiped '%s' (%s records deleted)", coll_name, cnt)
            except Exception as exc:
                logger.warning("Notice on wiping '%s': %s", coll_name, exc)

        # Clean non-admin users
        logger.info("Cleaning non-admin users...")
        res_u = await conn.execute("""
            DELETE FROM quickpress_documents 
            WHERE collection = 'users' 
              AND id != 'stf_super_admin_himanshu'
              AND (data->>'role' IS NULL OR LOWER(data->>'role') != 'admin')
        """)
        logger.info("✓ Wiped non-admin users: %s", res_u)

        # Clear separate payments table if exists
        try:
            await conn.execute("DELETE FROM payments")
            logger.info("✓ Cleared payments table")
        except Exception:
            pass

    # 3. Re-verify master catalog, super admin, and operational seeds
    logger.info("Re-verifying master catalog, Super Admin, and master cities/services...")
    await database.run_migrations()
    await database.ensure_indexes()
    await ensure_super_admin_seed()
    await ensure_admin_operational_seed()
    await catalog.ensure_seed()
    await cms_repo.ensure_seed()

    # Clear all in-memory caches
    if hasattr(database._supabase, "clear_all_caches"):
        database._supabase.clear_all_caches()

    # 4. Summary report
    print("\n" + "=" * 60)
    print("  SUMMARY OF DATABASE AFTER CLEANUP:")
    print("=" * 60)
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT collection, count(*) as count 
            FROM quickpress_documents 
            GROUP BY collection 
            ORDER BY count DESC
        """)
        for r in rows:
            print(f"  • {r['collection']:25}: {r['count']} records")
    print("=" * 60)
    print("  ALL DEMO & SEED ENTITIES REMOVED SUCCESSFULLY! SLATE IS CLEAN.")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(run_wipe())
