/** Online/offline signal used by the Home Screen network states. */

export function isOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine !== false;
}

/** Subscribe to connectivity changes. Returns an unsubscribe function. */
export function onNetworkChange(listener: (online: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const online = () => listener(true);
  const offline = () => listener(false);
  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  return () => {
    window.removeEventListener("online", online);
    window.removeEventListener("offline", offline);
  };
}
