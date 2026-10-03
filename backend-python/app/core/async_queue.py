"""Async Non-Blocking Task and Notification Queue.

Offloads push notifications (OneSignal, FCM, WebPush, WhatsApp, SMS) and
event broadcasts (Socket.IO, Audit logs) from the critical checkout path,
dropping order placement and status transition latency to sub-30ms.
"""

from __future__ import annotations

import asyncio
import functools
import logging
import time
from typing import Any, Callable, Coroutine, Dict, List, Optional, Set

logger = logging.getLogger(__name__)


class AsyncTaskQueue:
    """In-memory async worker queue with concurrency control and error resilience."""

    def __init__(self, max_concurrency: int = 4, max_queue_size: int = 5000):
        self._max_concurrency = max_concurrency
        self._queue: Optional[asyncio.Queue] = None
        self._workers: List[asyncio.Task] = []
        self._active_tasks: Set[asyncio.Task] = set()
        self._is_running = False
        self._processed_count = 0
        self._failed_count = 0
        self._max_queue_size = max_queue_size

    @property
    def is_running(self) -> bool:
        return self._is_running

    def stats(self) -> Dict[str, Any]:
        """Returns runtime queue metrics."""
        qsize = self._queue.qsize() if self._queue is not None else 0
        return {
            "is_running": self._is_running,
            "workers_count": len(self._workers),
            "queue_depth": qsize,
            "processed_count": self._processed_count,
            "failed_count": self._failed_count,
            "active_tasks_count": len(self._active_tasks),
        }

    async def start(self, num_workers: Optional[int] = None) -> None:
        """Starts worker tasks to process items from the queue."""
        if self._is_running:
            return

        concurrency = num_workers or self._max_concurrency
        self._queue = asyncio.Queue(maxsize=self._max_queue_size)
        self._is_running = True
        self._workers.clear()

        for idx in range(concurrency):
            worker_task = asyncio.create_task(
                self._worker_loop(idx),
                name=f"async-queue-worker-{idx}",
            )
            self._workers.append(worker_task)

        logger.info(
            "AsyncTaskQueue started with %d workers (queue_max=%d).",
            concurrency,
            self._max_queue_size,
        )

    async def stop(self, timeout: float = 3.0) -> None:
        """Gracefully stops workers after draining pending items."""
        if not self._is_running:
            return

        self._is_running = False

        # Wait for queue to drain if possible
        if self._queue is not None and not self._queue.empty():
            try:
                await asyncio.wait_for(self._queue.join(), timeout=timeout)
            except (asyncio.TimeoutError, Exception):
                logger.warning("AsyncTaskQueue queue drain timed out during shutdown.")

        # Cancel all workers
        for worker in self._workers:
            if not worker.done():
                worker.cancel()

        await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()
        self._queue = None
        logger.info("AsyncTaskQueue stopped.")

    async def _worker_loop(self, worker_id: int) -> None:
        """Worker loop continuously popping jobs from the queue."""
        while self._is_running:
            if self._queue is None:
                break
            try:
                item = await self._queue.get()
            except asyncio.CancelledError:
                break

            func, args, kwargs = item
            start_ts = time.perf_counter()
            try:
                res = func(*args, **kwargs)
                if asyncio.iscoroutine(res):
                    await res
                self._processed_count += 1
                duration_ms = (time.perf_counter() - start_ts) * 1000
                logger.debug(
                    "Worker %d processed task %s in %.2fms",
                    worker_id,
                    getattr(func, "__name__", str(func)),
                    duration_ms,
                )
            except asyncio.CancelledError:
                break
            except Exception as exc:
                self._failed_count += 1
                logger.error(
                    "Worker %d task %s failed: %s",
                    worker_id,
                    getattr(func, "__name__", str(func)),
                    exc,
                    exc_info=True,
                )
            finally:
                if self._queue is not None:
                    self._queue.task_done()

    def enqueue(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> bool:
        """Enqueues a task for async background execution.

        If the queue is active and running, submits to the background queue.
        If the queue is not running (e.g. unit tests or early startup),
        schedules the task directly onto the running event loop via asyncio.create_task.
        """
        if self._is_running and self._queue is not None:
            try:
                self._queue.put_nowait((func, args, kwargs))
                return True
            except asyncio.QueueFull:
                logger.warning(
                    "AsyncTaskQueue is full (%d), falling back to immediate create_task",
                    self._max_queue_size,
                )

        # Fallback: schedule directly on active event loop
        try:
            loop = asyncio.get_running_loop()
            res = func(*args, **kwargs)
            if asyncio.iscoroutine(res):
                task = loop.create_task(res)
                self._active_tasks.add(task)
                task.add_done_callback(self._active_tasks.discard)
            return True
        except RuntimeError:
            # No running event loop
            logger.warning("No running event loop available for async background task")
            return False

    async def wait_idle(self, timeout: float = 5.0) -> None:
        """Waits until all queued and active tasks have finished executing."""
        if self._queue is not None:
            try:
                await asyncio.wait_for(self._queue.join(), timeout=timeout)
            except asyncio.TimeoutError:
                logger.warning("wait_idle queue join timed out")

        if self._active_tasks:
            try:
                await asyncio.wait_for(
                    asyncio.gather(*list(self._active_tasks), return_exceptions=True),
                    timeout=timeout,
                )
            except asyncio.TimeoutError:
                logger.warning("wait_idle active tasks timed out")


# Singleton instance
async_task_queue = AsyncTaskQueue(max_concurrency=4)
