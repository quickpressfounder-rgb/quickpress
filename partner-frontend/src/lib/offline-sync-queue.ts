/**
 * Offline-First Mutation & Operation Sync Queue for Partner App.
 *
 * Ensures partner operations (accepting orders, updating status, verifying dispatch OTPs)
 * are safely preserved during intermittent network loss.
 */

import { apiPostJson, apiRequest, type HttpMethod } from "@/api/core/transport";

export interface PendingSyncItem {
  id: string;
  endpoint: string;
  method: HttpMethod;
  payload?: unknown;
  description: string;
  createdAt: number;
  retryCount: number;
  lastAttemptAt?: number;
}

const STORAGE_KEY = "qp_partner_offline_mutation_queue_v1";

class OfflineSyncQueue {
  private static instance: OfflineSyncQueue;
  private queue: PendingSyncItem[] = [];
  private isProcessing = false;
  private listeners = new Set<(pendingCount: number) => void>();

  private constructor() {
    this.loadQueue();
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        void this.processQueue();
      });
      window.addEventListener("focus", () => {
        void this.processQueue();
      });
    }
  }

  public static getInstance(): OfflineSyncQueue {
    if (!OfflineSyncQueue.instance) {
      OfflineSyncQueue.instance = new OfflineSyncQueue();
    }
    return OfflineSyncQueue.instance;
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public subscribe(listener: (pendingCount: number) => void): () => void {
    this.listeners.add(listener);
    listener(this.queue.length);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public enqueue(
    endpoint: string,
    payload?: unknown,
    description = "Pending background sync",
    method: HttpMethod = "POST"
  ): void {
    const item: PendingSyncItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      endpoint,
      method,
      payload,
      description,
      createdAt: Date.now(),
      retryCount: 0,
    };

    this.queue.push(item);
    this.saveQueue();
    this.notify();

    if (typeof navigator === "undefined" || navigator.onLine) {
      void this.processQueue();
    }
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        if (typeof navigator !== "undefined" && !navigator.onLine) break;

        const current = this.queue[0];
        try {
          if (current.method === "POST") {
            await apiPostJson(current.endpoint, current.payload);
          } else {
            await apiRequest(current.method, current.endpoint, { body: current.payload });
          }

          this.queue.shift();
          this.saveQueue();
          this.notify();
        } catch (err: any) {
          const isNetworkError =
            err?.code === "offline" ||
            err?.message?.includes("offline") ||
            err?.message?.includes("Failed to fetch") ||
            err?.message?.includes("NetworkError");

          if (isNetworkError) {
            break;
          }

          current.retryCount += 1;
          current.lastAttemptAt = Date.now();

          if (current.retryCount > 4) {
            console.error("[OfflineSyncQueue] Discarding operation after 5 failed retries:", current);
            this.queue.shift();
            this.saveQueue();
            this.notify();
          } else {
            break;
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private loadQueue() {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.queue = parsed;
        }
      }
    } catch {
      this.queue = [];
    }
  }

  private saveQueue() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch {}
  }

  private notify() {
    const count = this.queue.length;
    this.listeners.forEach((listener) => {
      try {
        listener(count);
      } catch {}
    });
  }
}

export const offlineSyncQueue = OfflineSyncQueue.getInstance();
