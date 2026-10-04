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

try:
    import asyncpg
except ImportError:
    asyncpg = None  # type: ignore

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


_CACHEABLE_STATIC_COLLECTIONS = {
    "banners",
    "categories",
    "counters",
    "admin_settings",
    "faq_categories",
    "faqs",
    "admin_cities",
    "services",
    "admin_services",
    "admin_categories",
    "membership_benefits",
    "membership_plans",
    "cart_settings",
    "referral_program_settings",
    "financial_rules",
    "website_settings",
    "website_faqs",
    "website_testimonials",
    "website_landing_content",
    "website_legal_docs",
}


def _make_cache_key(val: Any) -> str:
    """Fast deterministic cache key for query caching."""
    try:
        return json.dumps(val, sort_keys=True, default=str)
    except Exception:
        return str(val)


def _compile_filter(
    collection: str, query: Dict[str, Any]
) -> Tuple[Optional[str], List[Any]]:
    """Compiles a MongoDB-style query into a parameterized PostgreSQL JSONB WHERE clause."""
    if not query:
        return "collection = $1", [collection]

    params: List[Any] = [collection]
    conditions: List[str] = ["collection = $1"]

    def _compile_clause(key: str, val: Any) -> Optional[str]:
        nonlocal params
        # 1. Primary key lookup: _id or id
        if key in ("_id", "id"):
            if isinstance(val, (str, int)):
                params.append(f"{collection}:{val}")
                return f"id = ${len(params)}"
            elif isinstance(val, dict) and "$in" in val and isinstance(val["$in"], (list, tuple)):
                params.append([f"{collection}:{str(x)}" for x in val["$in"]])
                return f"id = ANY(${len(params)}::text[])"
            return None

        # 2. $or operator
        if key == "$or" and isinstance(val, list):
            or_parts = []
            for subq in val:
                if not isinstance(subq, dict):
                    return None
                sub_parts = []
                for sk, sv in subq.items():
                    sc = _compile_clause(sk, sv)
                    if sc is None:
                        return None
                    sub_parts.append(sc)
                if sub_parts:
                    or_parts.append("(" + " AND ".join(sub_parts) + ")")
            return "(" + " OR ".join(or_parts) + ")" if or_parts else None

        # 3. $and operator
        if key == "$and" and isinstance(val, list):
            and_parts = []
            for subq in val:
                if not isinstance(subq, dict):
                    return None
                for sk, sv in subq.items():
                    sc = _compile_clause(sk, sv)
                    if sc is None:
                        return None
                    and_parts.append(sc)
            return "(" + " AND ".join(and_parts) + ")" if and_parts else None

        # JSON path extraction: nested keys like "address.city" -> data->'address'->>'city'
        path_parts = key.split(".")
        if len(path_parts) == 1:
            json_field = f"data->>'{path_parts[0]}'"
        else:
            intermediates = "->".join(f"'{p}'" for p in path_parts[:-1])
            json_field = f"data->{intermediates}->>'{path_parts[-1]}'"

        # 4. Operator dictionaries
        if isinstance(val, dict):
            sub_clauses = []
            for op, op_val in val.items():
                if op == "$eq":
                    if isinstance(op_val, bool):
                        params.append("true" if op_val else "false")
                    else:
                        params.append(str(op_val))
                    sub_clauses.append(f"{json_field} = ${len(params)}")
                elif op == "$ne":
                    if isinstance(op_val, bool):
                        params.append("true" if op_val else "false")
                    else:
                        params.append(str(op_val))
                    sub_clauses.append(f"({json_field} IS DISTINCT FROM ${len(params)})")
                elif op == "$in" and isinstance(op_val, (list, tuple)):
                    params.append([("true" if x is True else ("false" if x is False else str(x))) for x in op_val])
                    sub_clauses.append(f"{json_field} = ANY(${len(params)}::text[])")
                elif op == "$nin" and isinstance(op_val, (list, tuple)):
                    params.append([("true" if x is True else ("false" if x is False else str(x))) for x in op_val])
                    sub_clauses.append(f"(NOT ({json_field} = ANY(${len(params)}::text[])))")
                elif op == "$exists":
                    if bool(op_val):
                        sub_clauses.append(f"({json_field} IS NOT NULL)")
                    else:
                        sub_clauses.append(f"({json_field} IS NULL)")
                elif op in ("$gt", "$gte", "$lt", "$lte"):
                    op_symbol = {"$gt": ">", "$gte": ">=", "$lt": "<", "$lte": "<="}[op]
                    if isinstance(op_val, (int, float)):
                        params.append(float(op_val))
                        sub_clauses.append(f"({json_field})::numeric {op_symbol} ${len(params)}")
                    else:
                        params.append(str(op_val))
                        sub_clauses.append(f"{json_field} {op_symbol} ${len(params)}")
                else:
                    return None
            return " AND ".join(sub_clauses) if sub_clauses else None

        # 5. Scalar equality
        if val is None:
            return f"({json_field} IS NULL)"
        if isinstance(val, bool):
            params.append("true" if val else "false")
        elif isinstance(val, (int, float)):
            params.append(str(val))
        elif isinstance(val, (list, tuple)):
            params.append([("true" if x is True else ("false" if x is False else str(x))) for x in val])
            return f"{json_field} = ANY(${len(params)}::text[])"
        else:
            params.append(str(val))
        return f"{json_field} = ${len(params)}"

    for k, v in query.items():
        clause = _compile_clause(k, v)
        if clause is None:
            return None, []
        conditions.append(clause)

    return " AND ".join(conditions), params


class SupabaseCursor:
    """Async cursor mimicking PyMongo/Motor cursor with SQL pushdown for Supabase PostgreSQL."""

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
        lim = self._limit if self._limit is not None else length

        # Try pushdown to PostgreSQL with ORDER BY, OFFSET, LIMIT
        where_clause, params = _compile_filter(self._collection._name, self._query)
        if where_clause is not None:
            try:
                order_by_parts = []
                for key, direction in self._sort_fields:
                    dir_str = "ASC" if direction >= 0 else "DESC"
                    if key in ("_id", "id"):
                        order_by_parts.append(f"id {dir_str}")
                    else:
                        order_by_parts.append(f"data->>'{key}' {dir_str}")

                order_sql = f" ORDER BY {', '.join(order_by_parts)}" if order_by_parts else " ORDER BY updated_at DESC"
                limit_offset_sql = ""

                cur_params = list(params)
                if self._skip:
                    cur_params.append(self._skip)
                    limit_offset_sql += f" OFFSET ${len(cur_params)}"

                cur_params.append(lim if lim is not None else 500)
                limit_offset_sql += f" LIMIT ${len(cur_params)}"

                sql = f"SELECT data FROM quickpress_documents WHERE {where_clause}{order_sql}{limit_offset_sql}"
                pool = await self._collection._db.get_pool()
                async with pool.acquire() as conn:
                    rows = await conn.fetch(sql, *cur_params)
                    return [json.loads(r["data"]) for r in rows]
            except Exception as e:
                logger.debug("SQL cursor execution fallback to memory: %s", e)

        # Fallback to in-memory cursor
        docs = await self._collection.find_many(self._query)
        if self._sort_fields:
            for key, direction in reversed(self._sort_fields):
                docs.sort(key=lambda d: _sort_key(_get_nested(d, key)), reverse=(direction < 0))
        if self._skip:
            docs = docs[self._skip:]
        if lim is not None:
            docs = docs[:lim]
        return docs


class SupabaseCollection:
    """PostgreSQL-backed document collection in Supabase with sub-millisecond query caching."""

    STATIC_CACHE_TTL: float = 300.0  # 5 minutes for reference catalog data
    QUERY_CACHE_TTL: float = 2.5     # 2.5 seconds for repetitive polling queries

    def __init__(self, db: Any, name: str) -> None:
        self._db = db
        self._name = name
        self._is_static = name in _CACHEABLE_STATIC_COLLECTIONS
        self._cache: Optional[List[Dict[str, Any]]] = None
        self._cache_ts: float = 0.0
        self._query_cache: Dict[str, Tuple[float, Any]] = {}

    def _invalidate_query_cache(self) -> None:
        self._query_cache.clear()

    def _get_from_query_cache(self, key: str) -> Optional[Any]:
        cached = self._query_cache.get(key)
        if cached is not None:
            ts, val = cached
            if (time.time() - ts) < self.QUERY_CACHE_TTL:
                return val
            del self._query_cache[key]
        return None

    def _put_in_query_cache(self, key: str, val: Any) -> None:
        if len(self._query_cache) > 200:
            self._query_cache.clear()
        self._query_cache[key] = (time.time(), val)

    async def _fetch_all(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        now = time.time()
        ttl = self.STATIC_CACHE_TTL if self._is_static else 3.0
        if not force_refresh and self._cache is not None and (now - self._cache_ts) < ttl:
            return list(self._cache)

        try:
            pool = await self._db.get_pool()
            async with pool.acquire() as conn:
                if self._is_static:
                    sql = "SELECT data FROM quickpress_documents WHERE collection = $1"
                    rows = await conn.fetch(sql, self._name)
                else:
                    sql = "SELECT data FROM quickpress_documents WHERE collection = $1 ORDER BY updated_at DESC LIMIT 300"
                    rows = await conn.fetch(sql, self._name)
                docs = [json.loads(r["data"]) for r in rows]
                if self._is_static:
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

        # Invalidate query cache immediately on any write
        self._invalidate_query_cache()

        # In-memory cache write-through for static collections
        if self._is_static:
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
        self._invalidate_query_cache()
        if self._is_static and self._cache is not None:
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
        # 1. Check local static cache if available
        if self._is_static and self._cache is not None:
            for d in self._cache:
                if _matches(d, query):
                    return dict(d)

        # 2. Check query cache
        q_key = f"one:{_make_cache_key(query)}"
        cached_result = self._get_from_query_cache(q_key)
        if cached_result is not None:
            return dict(cached_result) if isinstance(cached_result, dict) else None

        # 3. Targeted SQL lookup (O(1) index hit)
        where_clause, params = _compile_filter(self._name, query)
        if where_clause is not None:
            try:
                pool = await self._db.get_pool()
                async with pool.acquire() as conn:
                    sql = f"SELECT data FROM quickpress_documents WHERE {where_clause} LIMIT 1"
                    row = await conn.fetchrow(sql, *params)
                    if row:
                        doc = json.loads(row["data"])
                        self._put_in_query_cache(q_key, doc)
                        return doc
                    self._put_in_query_cache(q_key, None)
                    return None
            except Exception as e:
                logger.debug("Targeted SQL find_one fallback: %s", e)

        # 4. Fallback
        docs = await self._fetch_all()
        for d in docs:
            if _matches(d, query):
                self._put_in_query_cache(q_key, d)
                return dict(d)
        self._put_in_query_cache(q_key, None)
        return None

    async def find_many(self, query: Dict[str, Any]) -> List[Dict[str, Any]]:
        # 1. Check static cache if available
        if self._is_static:
            if self._cache is not None and not query:
                return [dict(d) for d in self._cache]
            if self._cache is not None:
                return [dict(d) for d in self._cache if _matches(d, query)]

        # 2. Check query cache
        q_key = f"many:{_make_cache_key(query)}"
        cached_result = self._get_from_query_cache(q_key)
        if cached_result is not None:
            return [dict(d) for d in cached_result]

        # 3. SQL pushdown
        where_clause, params = _compile_filter(self._name, query)
        if where_clause is not None:
            try:
                pool = await self._db.get_pool()
                async with pool.acquire() as conn:
                    sql = f"SELECT data FROM quickpress_documents WHERE {where_clause} ORDER BY updated_at DESC LIMIT 500"
                    rows = await conn.fetch(sql, *params)
                    docs = [json.loads(r["data"]) for r in rows]
                    self._put_in_query_cache(q_key, docs)
                    return docs
            except Exception as e:
                logger.debug("Targeted SQL find_many fallback: %s", e)

        # 4. Fallback to memory
        docs = await self._fetch_all()
        matched = [d for d in docs if _matches(d, query)]
        self._put_in_query_cache(q_key, matched)
        return matched

    async def count_documents(self, query: Dict[str, Any]) -> int:
        if self._is_static and self._cache is not None and not query:
            return len(self._cache)

        q_key = f"cnt:{_make_cache_key(query)}"
        cached_count = self._get_from_query_cache(q_key)
        if cached_count is not None:
            return cached_count

        where_clause, params = _compile_filter(self._name, query)
        if where_clause is not None:
            try:
                pool = await self._db.get_pool()
                async with pool.acquire() as conn:
                    sql = f"SELECT count(*) FROM quickpress_documents WHERE {where_clause}"
                    count = await conn.fetchval(sql, *params)
                    res = int(count or 0)
                    self._put_in_query_cache(q_key, res)
                    return res
            except Exception as e:
                logger.debug("Targeted SQL count_documents fallback: %s", e)

        docs = await self._fetch_all()
        res = sum(1 for d in docs if _matches(d, query))
        self._put_in_query_cache(q_key, res)
        return res

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
        target = await self.find_one(query)
        if not target:
            if upsert:
                new_doc = dict(query)
                if "$set" in update:
                    new_doc.update(update["$set"])
                else:
                    new_doc.update(update)
                await self._save_doc(new_doc)
                return new_doc
            return None

        _apply_update(target, update)
        await self._save_doc(target)
        return target

    async def update_many(self, query: Dict[str, Any], update: Dict[str, Any]) -> int:
        docs = await self.find_many(query)
        for doc in docs:
            _apply_update(doc, update)
            await self._save_doc(doc)
        return len(docs)

    async def find_one_and_update(
        self,
        query: Dict[str, Any],
        update: Dict[str, Any],
        return_document: Any = None,
        upsert: bool = False,
    ) -> Optional[Dict[str, Any]]:
        target = await self.find_one(query)
        if not target:
            if not upsert:
                return None
            target = dict(query)
            if "$set" in update:
                target.update(update["$set"])
            else:
                target.update(update)
            await self._save_doc(target)
            return dict(target)

        _apply_update(target, update)
        await self._save_doc(target)
        return dict(target)

    async def delete_one(self, query: Dict[str, Any]) -> int:
        # Check by id directly
        doc_id = None
        if "_id" in query and isinstance(query["_id"], (str, int)):
            doc_id = str(query["_id"])
        elif "id" in query and isinstance(query["id"], (str, int)):
            doc_id = str(query["id"])

        if doc_id:
            await self._delete_doc_id(doc_id)
            return 1

        target = await self.find_one(query)
        if target:
            target_id = target.get("id") or target.get("_id")
            if target_id:
                await self._delete_doc_id(str(target_id))
                return 1
        return 0

    async def delete_many(self, query: Dict[str, Any]) -> int:
        self._invalidate_query_cache()
        if not query:
            count = len(self._cache or [])
            self._cache = [] if self._is_static else None
            self._cache_ts = time.time()
            try:
                pool = await self._db.get_pool()
                async with pool.acquire() as conn:
                    res = await conn.execute(
                        "DELETE FROM quickpress_documents WHERE collection = $1", self._name
                    )
                    # Extract count from response 'DELETE N'
                    if res and " " in res:
                        count = int(res.split(" ")[-1])
            except Exception as e:
                logger.warning(f"Delete all error for {self._name}: {e}")
            return count

        where_clause, params = _compile_filter(self._name, query)
        if where_clause is not None:
            try:
                pool = await self._db.get_pool()
                async with pool.acquire() as conn:
                    res = await conn.execute(
                        f"DELETE FROM quickpress_documents WHERE {where_clause}", *params
                    )
                    count = int(res.split(" ")[-1]) if (res and " " in res) else 0
                    if self._is_static and self._cache is not None:
                        self._cache = [d for d in self._cache if not _matches(d, query)]
                    return count
            except Exception as e:
                logger.debug("Targeted SQL delete_many fallback: %s", e)

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
        self.semaphore = asyncio.Semaphore(50)
        self._total_queries: int = 0
        self._slow_queries: int = 0
        self._total_query_time_ms: float = 0.0

    def get_pool_metrics(self) -> Dict[str, Any]:
        """Returns database connection pool utilization and query performance telemetry."""
        active = 0
        free = 0
        max_size = 4
        min_size = 1
        if self._pool is not None and not self._pool._closed:
            try:
                active = self._pool.get_size() - self._pool.get_idle_size()
                free = self._pool.get_idle_size()
                max_size = self._pool.get_max_size()
                min_size = self._pool.get_min_size()
            except Exception:
                pass
        avg_time = (self._total_query_time_ms / self._total_queries) if self._total_queries > 0 else 0.0
        return {
            "engine": "supabase-postgresql",
            "min_pool_size": min_size,
            "max_pool_size": max_size,
            "active_connections": active,
            "idle_connections": free,
            "total_queries": self._total_queries,
            "slow_queries": self._slow_queries,
            "avg_query_time_ms": round(avg_time, 2),
        }

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
                ssl_mode = "require" if ("supabase" in self.database_url or "pooler" in self.database_url or "sslmode=require" in self.database_url) else None
                self._pool = await asyncpg.create_pool(
                    self.database_url,
                    min_size=1,
                    max_size=4,
                    max_inactive_connection_lifetime=300.0,
                    statement_cache_size=0,
                    command_timeout=15.0,
                    timeout=12.0,
                    ssl=ssl_mode,
                )
                self._loop = current_loop
            return self._pool

    async def preload_cache(self) -> None:
        """Preload static reference collections from Supabase PostgreSQL in a single fast query."""
        for attempt in range(4):
            try:
                pool = await self.get_pool()
                async with pool.acquire() as conn:
                    # Preload ONLY small static reference collections to keep memory usage lightweight
                    rows = await conn.fetch(
                        "SELECT collection, data FROM quickpress_documents WHERE collection = ANY($1::text[])",
                        list(_CACHEABLE_STATIC_COLLECTIONS),
                    )
                    coll_map: Dict[str, List[Dict[str, Any]]] = {}
                    for r in rows:
                        c_name = r["collection"]
                        coll_map.setdefault(c_name, []).append(json.loads(r["data"]))
                    for c_name, doc_list in coll_map.items():
                        coll = self.collection(c_name)
                        coll._cache = doc_list
                        coll._cache_ts = time.time()
                    self._is_preloaded = True
                    logger.info("Successfully preloaded %d static documents across %d collections from Supabase.", len(rows), len(coll_map))
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
                CREATE INDEX IF NOT EXISTS idx_qp_docs_collection_id ON quickpress_documents(collection, id);
                CREATE INDEX IF NOT EXISTS idx_qp_docs_gin ON quickpress_documents USING gin (data jsonb_path_ops);
                CREATE INDEX IF NOT EXISTS idx_qp_docs_status ON quickpress_documents (collection, (data->>'status'));
                CREATE INDEX IF NOT EXISTS idx_qp_docs_user_id ON quickpress_documents (collection, (data->>'userId'));
                CREATE INDEX IF NOT EXISTS idx_qp_docs_phone ON quickpress_documents (collection, (data->>'phone'));
                CREATE INDEX IF NOT EXISTS idx_qp_docs_created_at ON quickpress_documents (collection, (data->>'createdAt'));
                CREATE INDEX IF NOT EXISTS idx_qp_docs_partner_id ON quickpress_documents (collection, (data->>'partnerId'));
                CREATE INDEX IF NOT EXISTS idx_qp_docs_rider_id ON quickpress_documents (collection, (data->>'riderId'));
                CREATE INDEX IF NOT EXISTS idx_qp_docs_order_id ON quickpress_documents (collection, (data->>'orderId'));
                CREATE INDEX IF NOT EXISTS idx_qp_docs_code ON quickpress_documents (collection, (data->>'code'));
                CREATE INDEX IF NOT EXISTS idx_qp_docs_is_online ON quickpress_documents (collection, (data->>'isOnline'));
                CREATE INDEX IF NOT EXISTS idx_qp_docs_partner_pid ON quickpress_documents (collection, (data->'partner'->>'id'));
                CREATE INDEX IF NOT EXISTS idx_qp_docs_updated_at ON quickpress_documents (collection, updated_at DESC);
            """)
        logger.info("Connected to Supabase PostgreSQL and initialized optimized schema + JSONB indexes.")
        asyncio.create_task(self._safe_preload_cache())

    async def disconnect(self) -> None:
        if self._pool is not None and not self._pool._closed:
            await self._pool.close()
            self._pool = None
            self._loop = None

    def collection(self, name: str) -> SupabaseCollection:
        if name not in self._collections:
            coll = SupabaseCollection(self, name)
            if self._is_preloaded and name in _CACHEABLE_STATIC_COLLECTIONS:
                if coll._cache is None:
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


