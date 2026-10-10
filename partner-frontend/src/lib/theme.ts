/**
 * Partner Console Theme Runtime — QuickPress Partner Design System.
 *
 * CRITICAL RULE: Default theme is ALWAYS "light" (never dark by default).
 *
 * Mode is persisted in localStorage ('qp_partner_theme_mode') for instant warm start.
 */

export type ThemeMode = "light" | "dark" | "system";

export const DEFAULT_THEME: ThemeMode = "light";
const THEME_STORAGE_KEY = "qp_partner_theme_mode";

export function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "dark" || raw === "system" || raw === "light") {
      return raw;
    }
  } catch {
    // Ignore storage quota / restricted context errors
  }
  return DEFAULT_THEME;
}

export function storeTheme(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Ignore storage quota / restricted context errors
  }
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(mode: ThemeMode | null | undefined): "light" | "dark" {
  if (mode === "dark") return "dark";
  if (mode === "system") return systemPrefersDark() ? "dark" : "light";
  return "light";
}

/** Toggle the `dark` class the design tokens key off. */
export function applyTheme(mode: ThemeMode | null | undefined): "light" | "dark" {
  const targetMode = mode === "dark" || mode === "system" ? mode : "light";
  const resolved = resolveTheme(targetMode);
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.style.colorScheme = resolved;
    root.dataset["theme"] = targetMode;
  }
  return resolved;
}

/**
 * Apply the stored theme and keep "system" in sync with the OS.
 * Default is strictly "light".
 * Returns an unsubscribe cleanup function.
 */
export function initTheme(): () => void {
  const stored = readStoredTheme();
  applyTheme(stored);

  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (readStoredTheme() === "system") applyTheme("system");
  };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Persist locally and repaint immediately. */
export function setThemeLocally(mode: ThemeMode): void {
  const safeMode = mode === "dark" || mode === "system" ? mode : "light";
  storeTheme(safeMode);
  applyTheme(safeMode);
}
