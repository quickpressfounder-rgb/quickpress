"""Database abstraction.

Primary database is Supabase PostgreSQL (asyncpg). When DATABASE_URL is empty —
e.g. a preview environment with no outbound database access — the exact same
repository interface is served by an in-memory store, so application code never branches.
"""

from __future__ import annotations

import asyncio
import logging
import re
from typing import Any, Dict, List, Optional, Protocol, Tuple

from app.config import get_settings

logger = logging.getLogger(__name__)


class UpdateResult:
    def __init__(self, modified_count: int = 0, matched_count: int = 0):
        self.modified_count = modified_count
        self.matched_count = matched_count


class Collection(Protocol):
    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]: ...
    async def insert_one(self, document: Dict[str, Any]) -> None: ...
    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False) -> Any: ...
    async def delete_many(self, query: Dict[str, Any]) -> int: ...
    async def count_documents(self, query: Dict[str, Any]) -> int: ...


def _get_nested(doc: Dict[str, Any], key: str) -> Any:
    if "." in key:
        parts = key.split(".")
        curr = doc
        for part in parts:
            if not isinstance(curr, dict):
                return None
            curr = curr.get(part)
        return curr
    return doc.get(key)


def _matches(document: Dict[str, Any], query: Dict[str, Any]) -> bool:
    import re as _re

    for key, condition in query.items():
        if key == "$or":
            if not any(_matches(document, clause) for clause in condition):
                return False
            continue
        if key == "$and":
            if not all(_matches(document, clause) for clause in condition):
                return False
            continue
        value = _get_nested(document, key)
        if isinstance(condition, dict):
            if "$gt" in condition and not (value is not None and value > condition["$gt"]):
                return False
            if "$gte" in condition and not (value is not None and value >= condition["$gte"]):
                return False
            if "$lt" in condition and not (value is not None and value < condition["$lt"]):
                return False
            if "$lte" in condition and not (value is not None and value <= condition["$lte"]):
                return False
            if "$in" in condition and value not in condition["$in"]:
                return False
            if "$nin" in condition and value in condition["$nin"]:
                return False
            if "$ne" in condition and value == condition["$ne"]:
                return False
            if "$exists" in condition and (value is not None) != bool(condition["$exists"]):
                return False
            if "$regex" in condition:
                flags = _re.IGNORECASE if "i" in str(condition.get("$options", "")) else 0
                if value is None or not _re.search(str(condition["$regex"]), str(value), flags):
                    return False
        elif value != condition:
            return False
    return True


def _apply_update(target: Dict[str, Any], update: Dict[str, Any]) -> None:
    if "$set" in update:
        for k, v in update["$set"].items():
            if "." in k:
                parts = k.split(".")
                curr = target
                for part in parts[:-1]:
                    if part not in curr or not isinstance(curr[part], dict):
                        curr[part] = {}
                    curr = curr[part]
                curr[parts[-1]] = v
            else:
                target[k] = v
    if "$push" in update:
        for k, v in update["$push"].items():
            if k not in target or not isinstance(target[k], list):
                target[k] = []
            target[k].append(v)
    if "$addToSet" in update:
        for k, v in update["$addToSet"].items():
            if k not in target or not isinstance(target[k], list):
                target[k] = []
            if v not in target[k]:
                target[k].append(v)
    if "$pull" in update:
        for k, v in update["$pull"].items():
            if k in target and isinstance(target[k], list):
                target[k] = [item for item in target[k] if item != v]
    if "$inc" in update:
        for k, v in update["$inc"].items():
            target[k] = target.get(k, 0) + v
    if "$unset" in update:
        for k in update["$unset"]:
            target.pop(k, None)
    for k, v in update.items():
        if not k.startswith("$"):
            target[k] = v


def _sort_key(value: Any) -> Any:
    """Stable sort key: keeps None and mixed types from failing comparisons."""
    if value is None:
        return (0, 0, "")
    if isinstance(value, bool):
        return (1, int(value), "")
    if isinstance(value, (int, float)):
        return (1, float(value), "")
    return (2, 0, str(value))


class InMemoryCollection:

    """Minimal Mongo-compatible collection used only when Atlas is unavailable."""

    def __init__(self) -> None:
        self._docs: List[Dict[str, Any]] = []
        self._lock = asyncio.Lock()

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return next((dict(d) for d in self._docs if _matches(d, query)), None)

    async def insert_one(self, document: Dict[str, Any]) -> None:
        async with self._lock:
            self._docs.append(dict(document))

    async def update_one(
        self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False
    ) -> UpdateResult:
        async with self._lock:
            target = next((d for d in self._docs if _matches(d, query)), None)
            if target is None:
                if not upsert:
                    return UpdateResult(0, 0)
                target = {**query, **update.get("$setOnInsert", {})}
                self._docs.append(target)
                _apply_update(target, update)
                return UpdateResult(1, 1)
            _apply_update(target, update)
            return UpdateResult(1, 1)

    async def update_many(
        self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False
    ) -> int:
        async with self._lock:
            count = 0
            for d in self._docs:
                if _matches(d, query):
                    _apply_update(d, update)
                    count += 1
            if count == 0 and upsert:
                target = {**query, **update.get("$setOnInsert", {})}
                self._docs.append(target)
                _apply_update(target, update)
                count = 1
            return count

    async def find_one_and_update(
        self, query: Dict[str, Any], update: Dict[str, Any], return_document: Any = None, upsert: bool = False
    ) -> Optional[Dict[str, Any]]:
        async with self._lock:
            target = next((d for d in self._docs if _matches(d, query)), None)
            if target is None:
                if not upsert:
                    return None
                target = {**query, **update.get("$setOnInsert", {})}
                self._docs.append(target)
            _apply_update(target, update)
            return dict(target)

    async def delete_many(self, query: Dict[str, Any]) -> int:
        async with self._lock:
            keep = [d for d in self._docs if not _matches(d, query)]
            removed = len(self._docs) - len(keep)
            self._docs = keep
            return removed

    async def count_documents(self, query: Dict[str, Any]) -> int:
        async with self._lock:
            return sum(1 for d in self._docs if _matches(d, query))

    async def find_many(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        async with self._lock:
            return [dict(d) for d in self._docs if _matches(d, query)]

    async def insert_many(self, documents: List[Dict[str, Any]]) -> None:
        async with self._lock:
            self._docs.extend(dict(d) for d in documents)

    async def delete_one(self, query: Dict[str, Any]) -> int:
        async with self._lock:
            for index, doc in enumerate(self._docs):
                if _matches(doc, query):
                    self._docs.pop(index)
                    return 1
            return 0



def _with_id(doc: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Expose Mongo's `_id` as `id` too, so models can read either key."""
    if doc is None:
        return None
    if "_id" in doc and "id" not in doc:
        doc = {**doc, "id": doc["_id"]}
    return doc


def _build_candidate_urls(raw_db_url: str) -> List[str]:
    """Extracts database candidates strictly from environment variables. Zero hardcoded strings."""
    candidates: List[str] = []
    if raw_db_url and raw_db_url.strip():
        candidates.append(raw_db_url.strip())
    import os
    backup_url = (os.getenv("SUPABASE_DATABASE_URL") or os.getenv("BACKUP_DATABASE_URL") or "").strip()
    if backup_url and backup_url not in candidates:
        candidates.append(backup_url)
    return candidates


class ReconnectingCollection:
    """Production-grade proxy that ensures live Supabase/PostgreSQL connection on every access.
    
    Prevents silent fallback to empty in-memory stores during transient database reconnections.
    """
    def __init__(self, db: "Database", name: str) -> None:
        self._db = db
        self._name = name

    async def _get_real(self) -> Any:
        if self._db._supabase is not None:
            return self._db._supabase.collection(self._name)
        await self._db.ensure_connected()
        if self._db._supabase is not None:
            return self._db._supabase.collection(self._name)
        raise RuntimeError(f"Database currently unavailable: cannot execute query on collection {self._name}")

    def find(self, query: Optional[Dict[str, Any]] = None) -> Any:
        if self._db._supabase is not None:
            return self._db._supabase.collection(self._name).find(query or {})
        return ReconnectingCursor(self, query or {})

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        coll = await self._get_real()
        return await coll.find_one(query)

    async def find_many(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        coll = await self._get_real()
        return await coll.find_many(query)

    async def insert_one(self, doc: Dict[str, Any]) -> Any:
        coll = await self._get_real()
        return await coll.insert_one(doc)

    async def insert_many(self, documents: List[Dict[str, Any]]) -> Any:
        coll = await self._get_real()
        return await coll.insert_many(documents)

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False) -> Any:
        coll = await self._get_real()
        return await coll.update_one(query, update, upsert=upsert)

    async def update(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False) -> Any:
        coll = await self._get_real()
        return await coll.update(query, update, upsert=upsert)

    async def delete_one(self, query: Dict[str, Any]) -> Any:
        coll = await self._get_real()
        return await coll.delete_one(query)

    async def delete_many(self, query: Dict[str, Any]) -> Any:
        coll = await self._get_real()
        return await coll.delete_many(query)

    async def count_documents(self, query: Optional[Dict[str, Any]] = None) -> int:
        coll = await self._get_real()
        return await coll.count_documents(query or {})

    async def distinct(self, key: str, query: Optional[Dict[str, Any]] = None) -> List[Any]:
        coll = await self._get_real()
        return await coll.distinct(key, query or {})


class ReconnectingCursor:
    def __init__(self, reconn: ReconnectingCollection, query: Dict[str, Any]) -> None:
        self._reconn = reconn
        self._query = query
        self._skip_val: Optional[int] = None
        self._limit_val: Optional[int] = None
        self._sort_spec: Optional[Tuple[Any, int]] = None

    def skip(self, n: int) -> "ReconnectingCursor":
        self._skip_val = n
        return self

    def limit(self, n: int) -> "ReconnectingCursor":
        self._limit_val = n
        return self

    def sort(self, key: Any, direction: int = 1) -> "ReconnectingCursor":
        self._sort_spec = (key, direction)
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        coll = await self._reconn._get_real()
        cursor = coll.find(self._query)
        if self._skip_val is not None:
            cursor = cursor.skip(self._skip_val)
        limit = length if length is not None else self._limit_val
        if limit is not None:
            cursor = cursor.limit(limit)
        if self._sort_spec:
            cursor = cursor.sort(*self._sort_spec)
        return await cursor.to_list(length=limit)

    def __aiter__(self):
        self._iter_docs = None
        return self

    async def __anext__(self):
        if not hasattr(self, "_iter_docs") or self._iter_docs is None:
            self._iter_docs = iter(await self.to_list())
        try:
            return next(self._iter_docs)
        except StopIteration:
            raise StopAsyncIteration


class Database:
    """Lazily connected database handle shared by every repository (Supabase PostgreSQL)."""

    def __init__(self) -> None:
        self._supabase: Any = None
        self._memory: Dict[str, InMemoryCollection] = {}
        self._fallback_in_memory: bool = False
        self._engine: str = "in-memory"
        self._connect_lock: Optional[asyncio.Lock] = None
        self._candidate_urls: List[str] = []

    async def ensure_connected(self) -> None:
        if self._supabase is not None:
            return
        if self._connect_lock is None:
            self._connect_lock = asyncio.Lock()
        async with self._connect_lock:
            if self._supabase is not None:
                return
            await self.connect()

    @property
    def in_memory(self) -> bool:
        if self._supabase is not None:
            return False
        settings = get_settings()
        if settings.app_env.lower() == "production" or bool(settings.database_url):
            return False
        return settings.use_in_memory_db or self._fallback_in_memory

    @property
    def engine_type(self) -> str:
        if self._supabase is not None:
            return "supabase-postgresql"
        return "in-memory"

    def get_pool_metrics(self) -> Dict[str, Any]:
        """Returns database pool size, active connections, and query APM metrics."""
        if self._supabase is not None and hasattr(self._supabase, "get_pool_metrics"):
            return self._supabase.get_pool_metrics()
        return {
            "engine": self.engine_type,
            "min_pool_size": 1,
            "max_pool_size": 1,
            "active_connections": 0,
            "idle_connections": 0,
            "total_queries": 0,
            "slow_queries": 0,
            "avg_query_time_ms": 0.0,
        }

    async def connect(self) -> None:
        """Connect to Supabase PostgreSQL database with multi-host resilience."""
        settings = get_settings()
        import logging
        logger = logging.getLogger(__name__)

        raw_db_url = (getattr(settings, "database_url", None) or "").strip()
        self._candidate_urls = _build_candidate_urls(raw_db_url)

        for target_url in self._candidate_urls:
            for attempt in range(2):
                try:
                    from app.db.supabase_client import SupabaseDatabase
                    sb_db = SupabaseDatabase(target_url)
                    await asyncio.wait_for(sb_db.connect(), timeout=8.0)
                    self._supabase = sb_db
                    self._engine = "supabase-postgresql"
                    self._fallback_in_memory = False
                    logger.info("Connected to Supabase PostgreSQL successfully via %s.", target_url.split("@")[-1])
                    return
                except Exception as err:
                    logger.warning(
                        "PostgreSQL connection attempt %d to %s failed: %s",
                        attempt + 1,
                        target_url.split("@")[-1],
                        repr(err),
                    )
                    await asyncio.sleep(0.5)

        is_production = settings.app_env.lower() == "production" or bool(settings.database_url)
        if is_production:
            logger.error("CRITICAL: PostgreSQL connection failed across all candidates. Starting background auto-reconnect.")
            self._fallback_in_memory = False
            self._engine = "supabase-postgresql"
            asyncio.create_task(self._background_reconnect(self._candidate_urls))
            return

        self._fallback_in_memory = True
        self._engine = "in-memory"
        logger.info("Using in-memory database store (development only).")

    async def _background_reconnect(self, candidate_urls: list[str]) -> None:
        """Background daemon that keeps trying to restore PostgreSQL connection if server started before DB."""
        import logging
        logger = logging.getLogger(__name__)
        while self._supabase is None:
            await asyncio.sleep(3.0)
            for target_url in candidate_urls:
                try:
                    from app.db.supabase_client import SupabaseDatabase
                    sb_db = SupabaseDatabase(target_url)
                    await asyncio.wait_for(sb_db.connect(), timeout=8.0)
                    self._supabase = sb_db
                    self._engine = "supabase-postgresql"
                    self._fallback_in_memory = False
                    logger.info("Restored PostgreSQL connection in background via %s!", target_url.split("@")[-1])
                    return
                except Exception:
                    continue

    async def run_migrations(self) -> Optional[Dict[str, Any]]:
        """Supabase PostgreSQL uses declarative jsonb store and dynamic schemas."""
        return {"status": "ok", "engine": "supabase-postgresql"}

    async def verify_migrations(self) -> None:
        """No-op on Supabase PostgreSQL."""
        return

    async def disconnect(self) -> None:
        if self._supabase is not None:
            await self._supabase.disconnect()
            self._supabase = None

    def collection(self, name: str) -> Any:
        if self._supabase is not None:
            return self._supabase.collection(name)
        if getattr(self, "_db", None) is not None:
            return self._db[name]
        settings = get_settings()
        is_production = settings.app_env.lower() == "production" or bool(settings.database_url)
        if is_production:
            return ReconnectingCollection(self, name)
        return self._memory.setdefault(name, InMemoryCollection())

    def get_collection(self, name: str) -> Any:
        return self.collection(name)


    async def find_many(
        self,
        name: str,
        query: Optional[Dict[str, Any]] = None,
        *,
        sort_key: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """List documents from a collection — works for Motor and the memory store."""
        collection = self.collection(name)
        query = query or {}
        if isinstance(collection, InMemoryCollection):
            docs = await collection.find_many(query)  # type: ignore[attr-defined]
        else:
            cursor = collection.find(query)  # type: ignore[attr-defined]
            length = limit if limit is not None else 500
            docs = await cursor.to_list(length=length)
        if sort_key:
            docs.sort(key=lambda doc: _sort_key(doc.get(sort_key)))
        if limit is not None:
            docs = docs[:limit]
        return docs

    # ------------------------------------------------------------------
    # Sprint 5.2 — generic CRUD / pagination helpers shared by every
    # partner, rider and admin repository. Identical behaviour on Motor
    # and on the in-memory preview store.
    # ------------------------------------------------------------------

    async def find_sorted(
        self,
        name: str,
        query: Optional[Dict[str, Any]] = None,
        *,
        sort: Optional[List[tuple]] = None,
        skip: int = 0,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        collection = self.collection(name)
        query = query or {}
        if isinstance(collection, InMemoryCollection):
            docs = await collection.find_many(query)  # type: ignore[attr-defined]
            for key, direction in reversed(sort or []):
                docs.sort(key=lambda doc: _sort_key(doc.get(key)), reverse=direction < 0)
        else:
            cursor = collection.find(query)  # type: ignore[attr-defined]
            if sort:
                cursor = cursor.sort(sort)
            docs = await cursor.to_list(length=2000)
        if skip:
            docs = docs[skip:]
        if limit is not None:
            docs = docs[:limit]
        return [_with_id(d) for d in docs]

    async def paginate(
        self,
        name: str,
        query: Optional[Dict[str, Any]] = None,
        *,
        sort: Optional[List[tuple]] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict[str, Any]:
        """Standard page envelope: items + total + page + pageSize + hasMore."""
        page = max(1, page)
        page_size = max(1, min(page_size, 100))
        query = query or {}
        total = await self.count(name, query)
        items = await self.find_sorted(
            name, query, sort=sort, skip=(page - 1) * page_size, limit=page_size
        )
        return {
            "items": items,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "hasMore": page * page_size < total,
        }

    async def count(self, name: str, query: Optional[Dict[str, Any]] = None) -> int:
        return await self.collection(name).count_documents(query or {})

    async def find_one(self, name: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        return await self.collection(name).find_one(query)

    async def insert(self, name: str, document: Dict[str, Any]) -> Dict[str, Any]:
        await self.collection(name).insert_one(dict(document))
        return document

    async def insert_all(self, name: str, documents: List[Dict[str, Any]]) -> None:
        if not documents:
            return
        collection = self.collection(name)
        if True:  # both Motor and the in-memory store expose insert_many
            await collection.insert_many([dict(d) for d in documents])  # type: ignore[attr-defined]
        else:  # pragma: no cover - Motor always has insert_many
            for document in documents:
                await collection.insert_one(dict(document))

    async def update(
        self,
        name: str,
        query: Dict[str, Any],
        changes: Dict[str, Any],
        *,
        upsert: bool = False,
    ) -> Optional[Dict[str, Any]]:
        update_doc = changes if any(str(k).startswith("$") for k in changes.keys()) else {"$set": changes}
        await self.collection(name).update_one(query, update_doc, upsert=upsert)
        return await self.find_one(name, query)

    async def update_one(
        self,
        name: str,
        query: Dict[str, Any],
        changes: Dict[str, Any],
        *,
        upsert: bool = False,
    ) -> Optional[Dict[str, Any]]:
        return await self.update(name, query, changes, upsert=upsert)

    async def update_many(
        self,
        name: str,
        query: Dict[str, Any],
        changes: Dict[str, Any],
        *,
        upsert: bool = False,
    ) -> int:
        update_doc = changes if any(str(k).startswith("$") for k in changes.keys()) else {"$set": changes}
        collection = self.collection(name)
        result = await collection.update_many(query, update_doc, upsert=upsert)
        return result if isinstance(result, int) else int(getattr(result, "modified_count", 0))

    async def insert_one(self, name: str, document: Dict[str, Any]) -> Dict[str, Any]:
        return await self.insert(name, document)


    async def delete_one(self, name: str, query: Dict[str, Any]) -> int:
        collection = self.collection(name)
        result = await collection.delete_one(query)  # type: ignore[attr-defined]
        return result if isinstance(result, int) else int(getattr(result, "deleted_count", 0))

    async def delete_many(self, name: str, query: Dict[str, Any]) -> int:
        collection = self.collection(name)
        result = await collection.delete_many(query)  # type: ignore[attr-defined]
        return result if isinstance(result, int) else int(getattr(result, "deleted_count", 0))

    async def delete(self, name: str, query: Dict[str, Any]) -> int:
        return await self.delete_many(name, query)


    async def upsert_seed(self, seed: Dict[str, List[Dict[str, Any]]]) -> None:
        """Idempotent seed: only writes documents that do not exist yet."""
        for name, documents in seed.items():
            collection = self.collection(name)
            for document in documents:
                existing = await collection.find_one({"_id": document["_id"]})
                if existing is None:
                    await collection.insert_one(dict(document))



    async def ensure_indexes(self) -> None:
        """Indexes that back queries. Automatically managed in Supabase PostgreSQL."""
        if self._supabase is not None:
            # PostgreSQL indexes are created during connection in supabase_client.py
            return

database = Database()

