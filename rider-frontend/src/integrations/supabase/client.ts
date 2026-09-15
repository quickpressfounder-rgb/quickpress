import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const FALLBACK_SUPABASE_URL = "https://acpxzppgjnqqhckzxcmk.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjcHh6cHBnam5xcWhja3p4Y21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTM5NzksImV4cCI6MjEwMzMyOTk3OX0.EL5oL0v4BQ-4dN58Yeqm-SN6LzyPGv7fpDkZQfIS794";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  const envUrl =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_SUPABASE_URL) ||
    (typeof process !== "undefined" && process.env?.SUPABASE_URL);

  const envKey =
    (typeof import.meta !== "undefined" &&
      ((import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
        (import.meta as any).env?.VITE_SUPABASE_ANON_KEY)) ||
    (typeof process !== "undefined" &&
      (process.env?.SUPABASE_PUBLISHABLE_KEY || process.env?.SUPABASE_ANON_KEY));

  const supabaseUrl = envUrl || FALLBACK_SUPABASE_URL;
  const supabaseKey = envKey || FALLBACK_SUPABASE_ANON_KEY;

  return createClient<Database>(supabaseUrl, supabaseKey, {
    global: {
      fetch: createSupabaseFetch(supabaseKey),
    },
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

function createSafeChannel(name: string) {
  const channel = {
    name,
    on: () => channel,
    subscribe: (callback?: (status: string, err?: any) => void) => {
      if (typeof callback === "function") {
        setTimeout(() => callback("SUBSCRIBED"), 0);
      }
      return channel;
    },
    unsubscribe: () => Promise.resolve("ok"),
  };
  return channel;
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (prop === "channel") {
      return (name: string) => createSafeChannel(name);
    }
    if (prop === "removeChannel" || prop === "removeAllChannels") {
      return () => Promise.resolve("ok");
    }
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
