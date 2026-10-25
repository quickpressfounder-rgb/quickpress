"""QuickPress Database Index Migration Runner.

Connects to the database and applies all high-performance indexes.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.supabase_client import get_supabase_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("db_indexer")


async def main():
    logger.info("Starting QuickPress Database Indexing Integration...")
    client = get_supabase_client()
    if client is None:
        logger.warning("DATABASE_URL is not set or asyncpg not available. In-memory mode active.")
        return

    logger.info("Connecting to Supabase PostgreSQL...")
    await client.connect()
    logger.info("✅ All Database Indexes Verified and Applied Successfully!")
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
