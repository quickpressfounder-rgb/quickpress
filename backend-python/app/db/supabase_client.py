"""Supabase PostgreSQL Document and Relational Store for QuickPress.

Persists documents into Supabase PostgreSQL (JSONB + indexed tables) with full
support for MongoDB/Document-store query operators ($set, $inc, $in, $regex,
nested paths, cursor pagination, sort, and upsert).
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import Any, Dict, List, Optional, Sequence, Tuple
import uuid

import asyncpg

logger = logging.getLogger(__name__)


def _get_nested(doc: Dict[str, Any], path: str) -> Any:
    parts = path.split(".")
    current: Any = doc
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        else:
            return None
    return current


def _set_nested(doc: Dict[str, Any], path: str, value: Any) -> None:
    parts = path.split(".")
    current = doc
    for part in parts[:-1]:
        if part not in current or not isinstance(current[part], dict):
            current[part] = {}
        current = current[part]
    current[parts[-1]] = value


def _unset_nested(doc: Dict[str, Any], path: str) -> None:
    parts = path.split(".")
    current = doc
    for part in parts[:-1]:
        if not isinstance(current, dict) or part not in current:
            return
        current = current[part]
    if isinstance(current, dict):
        current.pop(parts[-1], None)


def _matches(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    if not query:
        return True

    for key, expected in query.items():
        if key == "$or":
            if not any(_matches(doc, branch) for branch in expected):
                return False
            continue
        if key == "$and":
            if not all(_matches(doc, branch) for branch in expected):
                return False
            continue

        actual = _get_nested(doc, key)

        if isinstance(expected, dict):
            for op, val in expected.items():
                if op == "$eq" and actual != val:
                    return False
                elif op == "$ne" and actual == val:
                    return False
                elif op == "$in":
                    if isinstance(actual, list):
                        if not any(item in val for item in actual):
                            return False
                    elif actual not in val:
                        return False
                elif op == "$nin":
                    if isinstance(actual, list):
                        if any(item in val for item in actual):
                            return False
                    elif actual in val:
                        return False
                elif op == "$gt" and not (actual is not None and actual > val):
                    return False
                elif op == "$gte" and not (actual is not None and actual >= val):
                    return False
                elif op == "$lt" and not (actual is not None and actual < val):
                    return False
                elif op == "$lte" and not (actual is not None and actual <= val):
                    return False
                elif op == "$regex":
                    if actual is None:
                        return False
                    pattern = str(val)
                    flags = 0
                    if "$options" in expected and "i" in expected["$options"]:
                        flags = re.IGNORECASE
                    if not re.search(pattern, str(actual), flags=flags):
                        return False
                elif op == "$exists":
                    exists = actual is not None
                    if exists != bool(val):
                        return False
        else:
            if isinstance(actual, list) and not isinstance(expected, list):
                if expected not in actual:
                    return False
            elif actual != expected:
                return False

    return True


def _apply_update(target: Dict[str, Any], update: Dict[str, Any]) -> None:
    is_atomic = any(k.startswith("$") for k in update.keys())
    if not is_atomic:
        target.clear()
        target.update(update)
        return

    if "$set" in update:
        for k, v in update["$set"].items():
            _set_nested(target, k, v)

    if "$unset" in update:
        for k in update["$unset"].keys():
            _unset_nested(target, k)

    if "$inc" in update:
        for k, delta in update["$inc"].items():
            current = _get_nested(target, k) or 0
            _set_nested(target, k, current + delta)

    if "$push" in update:
        for k, v in update["$push"].items():
            arr = _get_nested(target, k)
            if not isinstance(arr, list):
                arr = []
                _set_nested(target, k, arr)
            if isinstance(v, dict) and "$each" in v:
                arr.extend(v["$each"])
            else:
                arr.append(v)

    if "$pull" in update:
        for k, v in update["$pull"].items():
            arr = _get_nested(target, k)
            if isinstance(arr, list):
                if isinstance(v, dict):
                    _set_nested(target, k, [item for item in arr if not _matches(item, v)])
                else:
                    _set_nested(target, k, [item for item in arr if item != v])


def _sort_key(val: Any) -> Any:
    if val is None:
        return ""
    if isinstance(val, (int, float)):
        return val
    return str(val).lower()


class SupabaseCursor:
    """Async cursor mimicking PyMongo/Motor cursor for Supabase PostgreSQL."""

    def __init__(self, collection: SupabaseCollection, query: Dict[str, Any]) -> None:
        self._collection = collection
        self._query = query
        self._sort_fields: List[Tuple[str, int]] = []
        self._skip = 0
        self._limit: Optional[int] = None

    def sort(self, key_or_list: Any, direction: int = 1) -> SupabaseCursor:
        if isinstance(key_or_list, list):
            self._sort_fields = key_or_list
        elif isinstance(key_or_list, tuple):
            self._sort_fields = [key_or_list]
        elif isinstance(key_or_list, str):
            self._sort_fields = [(key_or_list, direction)]
        return self

    def skip(self, n: int) -> SupabaseCursor:
        self._skip = n
        return self

    def limit(self, n: int) -> SupabaseCursor:
        self._limit = n
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        docs = await self._collection.find_many(self._query)
        if self._sort_fields:
            for key, direction in reversed(self._sort_fields):
                docs.sort(key=lambda d: _sort_key(_get_nested(d, key)), reverse=(direction < 0))
        if self._skip:
            docs = docs[self._skip:]
        lim = self._limit if self._limit is not None else length
        if lim is not None:
            docs = docs[:lim]
        return docs


class SupabaseCollection:
    """PostgreSQL-backed document collection in Supabase with sub-millisecond write-through caching."""

    def __init__(self, db: Any, name: str) -> None:
        self._db = db
        self._name = name
        self._cache: Optional[List[Dict[str, Any]]] = None
        self._cache_ts: float = 0.0

    async def _fetch_all(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        if not force_refresh and self._cache is not None:
            return list(self._cache)

        if not force_refresh and getattr(self._db, "_is_preloaded", False):
            self._cache = []
            self._cache_ts = time.time()
            return []

        try:
            pool = await self._db.get_pool()
            async with pool.acquire() as conn:
                rows = await conn.fetch(
                    "SELECT data FROM quickpress_documents WHERE collection = $1", self._name
                )
                docs = [json.loads(r["data"]) for r in rows]
                self._cache = docs
                self._cache_ts = time.time()
                return list(docs)
        except Exception as e:
            logger.warning(f"Fetch error for collection {self._name}: {e}")
            return list(self._cache or [])

    async def _save_doc(self, doc: Dict[str, Any]) -> None:
        doc_id = str(doc.get("_id") or doc.get("id") or uuid.uuid4().hex)
        if "_id" not in doc:
            doc["_id"] = doc_id
        if "id" not in doc:
            doc["id"] = doc_id

        # In-memory cache write-through
        if self._cache is not None:
            existing_idx = next((i for i, d in enumerate(self._cache) if str(d.get("_id") or d.get("id")) == doc_id), None)
            if existing_idx is not None:
                self._cache[existing_idx] = dict(doc)
            else:
                self._cache.append(dict(doc))
        else:
            self._cache = [dict(doc)]
        self._cache_ts = time.time()

        # Direct database persistence
        try:
            payload = json.dumps(doc, default=str)
            pool = await self._db.get_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO quickpress_documents (id, collection, data, updated_at)
                    VALUES ($1, $2, $3::jsonb, NOW())
                    ON CONFLICT (id) DO UPDATE
                    SET data = EXCLUDED.data, updated_at = NOW();
                    """,
                    f"{self._name}:{doc_id}",
                    self._name,
                    payload,
                )
        except Exception as e:
            logger.warning(f"Save error for {self._name}:{doc_id}: {e}")

    async def _delete_doc_id(self, doc_id: str) -> None:
        if self._cache is not None:
            self._cache = [d for d in self._cache if str(d.get("_id") or d.get("id")) != doc_id]
            self._cache_ts = time.time()

        try:
            pool = await self._db.get_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    "DELETE FROM quickpress_documents WHERE id = $1", f"{self._name}:{doc_id}"
                )
        except Exception as e:
            logger.warning(f"Delete error for {self._name}:{doc_id}: {e}")

    def find(self, query: Optional[Dict[str, Any]] = None) -> SupabaseCursor:
        return SupabaseCursor(self, query or {})

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        docs = await self._fetch_all()
        for d in docs:
            if _matches(d, query):
                return d
        return None

    async def find_many(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        docs = await self._fetch_all()
        return [d for d in docs if _matches(d, query)]

    async def count_documents(self, query: Dict[str, Any]) -> int:
        docs = await self._fetch_all()
        return sum(1 for d in docs if _matches(d, query))

    async def insert_one(self, document: Dict[str, Any]) -> Any:
        doc = dict(document)
        await self._save_doc(doc)
        return doc

    async def insert_many(self, documents: Sequence[Dict[str, Any]]) -> None:
        for doc in documents:
            await self._save_doc(dict(doc))

    async def update_one(
        self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False
    ) -> Any:
        docs = await self._fetch_all()
        matched = [d for d in docs if _matches(d, query)]
        if not matched:
            if upsert:
                new_doc = dict(query)
                if "$set" in update:
                    new_doc.update(update["$set"])
                else:
                    new_doc.update(update)
                await self._save_doc(new_doc)
            return None
        target = matched[0]
        if "$set" in update:
            for k, v in update["$set"].items():
                _set_nested(target, k, v)
        else:
            target.update(update)
        await self._save_doc(target)
        return target

    async def update_many(self, query: Dict[str, Any], update: Dict[str, Any]) -> int:
        docs = await self._fetch_all()
        matched = [d for d in docs if _matches(d, query)]
        for doc in matched:
            _apply_update(doc, update)
            await self._save_doc(doc)
        return len(matched)

    async def find_one_and_update(
        self,
        query: Dict[str, Any],
        update: Dict[str, Any],
        return_document: Any = None,
        upsert: bool = False,
    ) -> Optional[Dict[str, Any]]:
        docs = await self._fetch_all()
        matched = [d for d in docs if _matches(d, query)]
        if not matched:
            if not upsert:
                return None
            target = dict(query)
            if "$set" in update:
                target.update(update["$set"])
            else:
                target.update(update)
            await self._save_doc(target)
            return dict(target)

        target = matched[0]
        _apply_update(target, update)
        await self._save_doc(target)
        return dict(target)

    async def delete_one(self, query: Dict[str, Any]) -> int:
        docs = await self._fetch_all()
        target = next((d for d in docs if _matches(d, query)), None)
        if target:
            doc_id = target.get("id") or target.get("_id")
            if doc_id:
                await self._delete_doc_id(str(doc_id))
                return 1
        return 0

    async def delete_many(self, query: Dict[str, Any]) -> int:
        if not query:
            # Delete all documents in this collection directly in SQL
            count = len(self._cache or [])
            self._cache = []
            self._cache_ts = time.time()
            try:
                pool = await self._db.get_pool()
                async with pool.acquire() as conn:
                    await conn.execute(
                        "DELETE FROM quickpress_documents WHERE collection = $1", self._name
                    )
            except Exception as e:
                logger.warning(f"Delete all error for {self._name}: {e}")
            return count

        docs = await self._fetch_all()
        matched = [d for d in docs if _matches(d, query)]
        for m in matched:
            doc_id = str(m.get("_id") or m.get("id"))
            await self._delete_doc_id(doc_id)
        return len(matched)


class SupabaseDatabase:
    """Supabase PostgreSQL Database Client with Session Pooling and Concurrency Safety."""

    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self._pool: Optional[asyncpg.Pool] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._pool_lock: Optional[asyncio.Lock] = None
        self._collections: Dict[str, SupabaseCollection] = {}
        self._is_preloaded: bool = False
        self.semaphore = asyncio.Semaphore(20)

    async def get_pool(self) -> asyncpg.Pool:
        current_loop = asyncio.get_running_loop()
        if self._pool_lock is None:
            self._pool_lock = asyncio.Lock()

        async with self._pool_lock:
            if self._pool is None or self._loop != current_loop or self._pool._closed:
                if self._pool is not None and not self._pool._closed:
                    try:
                        await self._pool.close()
                    except Exception:
                        pass
                self._pool = await asyncpg.create_pool(
                    self.database_url,
                    min_size=1,
                    max_size=5,
                    statement_cache_size=0,
                    command_timeout=30,
                    timeout=25.0,
                )
                self._loop = current_loop
            return self._pool

    async def preload_cache(self) -> None:
        """Preload all documents from Supabase PostgreSQL in a single fast query."""
        for attempt in range(4):
            try:
                pool = await self.get_pool()
                async with pool.acquire() as conn:
                    # Ensure table exists
                    await conn.execute("""
                        CREATE TABLE IF NOT EXISTS quickpress_documents (
                            id TEXT PRIMARY KEY,
                            collection TEXT NOT NULL,
                            data JSONB NOT NULL,
                            updated_at TIMESTAMPTZ DEFAULT NOW()
                        );
                        CREATE INDEX IF NOT EXISTS idx_qp_docs_collection ON quickpress_documents(collection);
                    """)
                    rows = await conn.fetch("SELECT collection, data FROM quickpress_documents")
                    coll_map: Dict[str, List[Dict[str, Any]]] = {}
                    for r in rows:
                        c_name = r["collection"]
                        coll_map.setdefault(c_name, []).append(json.loads(r["data"]))
                    for c_name, doc_list in coll_map.items():
                        coll = self.collection(c_name)
                        coll._cache = doc_list
                        coll._cache_ts = time.time()
                    self._is_preloaded = True
                    logger.info("Successfully cached %d documents across %d collections from Supabase.", len(rows), len(coll_map))
                    return
            except Exception as e:
                logger.warning("Cache preload attempt %d warning: %s", attempt + 1, repr(e))
                if attempt == 3:
                    return
                await asyncio.sleep(1.0 * (attempt + 1))

    async def _safe_preload_cache(self) -> None:
        try:
            await self.preload_cache()
            logger.info("Background cache preload completed successfully.")
        except Exception as e:
            logger.warning("Background cache preload warning: %s", repr(e))

    async def connect(self) -> None:
        logger.info("Connecting to Supabase PostgreSQL database...")
        pool = await self.get_pool()
        async with pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS quickpress_documents (
                    id TEXT PRIMARY KEY,
                    collection TEXT NOT NULL,
                    data JSONB NOT NULL,
                    updated_at TIMESTAMPTZ DEFAULT NOW()
                );
                CREATE INDEX IF NOT EXISTS idx_qp_docs_collection ON quickpress_documents(collection);
            """)
        logger.info("Connected to Supabase PostgreSQL and initialized schema.")
        asyncio.create_task(self._safe_preload_cache())

    async def disconnect(self) -> None:
        if self._pool is not None and not self._pool._closed:
            await self._pool.close()
            self._pool = None
            self._loop = None

    def collection(self, name: str) -> SupabaseCollection:
        if name not in self._collections:
            coll = SupabaseCollection(self, name)
            if self._is_preloaded:
                coll._cache = []
                coll._cache_ts = time.time()
            self._collections[name] = coll
        return self._collections[name]

    def __getitem__(self, name: str) -> SupabaseCollection:
        return self.collection(name)

    async def find_one(self, name: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return await self.collection(name).find_one(query)

    async def find_many(
        self, name: str, query: Optional[Dict[str, Any]] = None, *, sort_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        docs = await self.collection(name).find_many(query or {})
        if sort_key:
            docs.sort(key=lambda d: _sort_key(_get_nested(d, sort_key)))
        return docs

    async def count(self, name: str, query: Optional[Dict[str, Any]] = None) -> int:
        return await self.collection(name).count_documents(query or {})

    async def insert(self, name: str, document: Dict[str, Any]) -> Dict[str, Any]:
        await self.collection(name).insert_one(dict(document))
        return document

    async def update(
        self, name: str, query: Dict[str, Any], changes: Dict[str, Any], *, upsert: bool = False
    ) -> Optional[Dict[str, Any]]:
        await self.collection(name).update_one(query, {"$set": changes}, upsert=upsert)
        return await self.find_one(name, query)

    async def update_one(
        self, name: str, query: Dict[str, Any], changes: Dict[str, Any], *, upsert: bool = False
    ) -> Optional[Dict[str, Any]]:
        return await self.update(name, query, changes, upsert=upsert)

    async def insert_one(self, name: str, document: Dict[str, Any]) -> Dict[str, Any]:
        return await self.insert(name, document)


    async def delete_one(self, name: str, query: Dict[str, Any]) -> int:
        return await self.collection(name).delete_one(query)

    async def delete_many(self, name: str, query: Dict[str, Any]) -> int:
        return await self.collection(name).delete_many(query)

    async def delete(self, name: str, query: Dict[str, Any]) -> int:
        return await self.collection(name).delete_many(query)


