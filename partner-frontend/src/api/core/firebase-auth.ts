/**
 * Firebase Authentication adapter.
 *
 * Owns everything that talks to Firebase directly: app initialisation, the
 * invisible reCAPTCHA verifier required by phone OTP, Google Sign In and the
 * (prepared but disabled) Apple provider. It returns Firebase ID tokens; the
 * QuickPress FastAPI backend exchanges those for our own JWT pair.
 *
 * The Firebase SDK is imported lazily so apps that run in mock mode never
 * download or evaluate it.
 */

import type {
  Auth,
  ConfirmationResult,
  RecaptchaVerifier,
  UserCredential,
} from "firebase/auth";

import { ApiError } from "./errors";
import { firebaseConfig, isAppleSignInEnabled, isFirebaseConfigured } from "./firebase-config";

let authPromise: Promise<Auth> | null = null;
let recaptcha: RecaptchaVerifier | null = null;
let pendingConfirmation: ConfirmationResult | null = null;

const RECAPTCHA_CONTAINER_ID = "quickpress-recaptcha";

function requireBrowser(): void {
  if (typeof window === "undefined") {
    throw new ApiError("network", "Firebase Authentication is only available in the browser");
  }
}

/** Initialise (once) and return the Firebase Auth instance. */
export async function firebaseAuth(): Promise<Auth> {
  requireBrowser();
  if (!isFirebaseConfigured()) {
    throw new ApiError("unconfigured", "Firebase is not configured for this environment");
  }
  if (!authPromise) {
    authPromise = (async () => {
      const [{ initializeApp, getApps, getApp }, { getAuth, setPersistence, browserLocalPersistence }] =
        await Promise.all([import("firebase/app"), import("firebase/auth")]);
      const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig());
      const auth = getAuth(app);
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch {
        /* persistence is best-effort (private mode / SSR shells) */
      }
      return auth;
    })();
  }
  return authPromise;
}

async function ensureRecaptcha(auth: Auth): Promise<RecaptchaVerifier> {
  if (recaptcha) return recaptcha;
  const { RecaptchaVerifier } = await import("firebase/auth");
  
  const existing = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (existing) {
    try {
      existing.remove();
    } catch {
      /* ignore */
    }
  }

  const host = document.createElement("div");
  host.id = RECAPTCHA_CONTAINER_ID;
  document.body.appendChild(host);

  recaptcha = new RecaptchaVerifier(auth, host, {
    size: "invisible",
    "expired-callback": () => {
      resetRecaptcha();
    },
  });
  await recaptcha.render();
  return recaptcha;
}

/** Reset the verifier after a failed attempt so the next send works cleanly. */
export function resetRecaptcha(): void {
  try {
    recaptcha?.clear();
  } catch {
    /* ignore */
  }
  recaptcha = null;
  const host = document.getElementById(RECAPTCHA_CONTAINER_ID);
  if (host) {
    try {
      host.remove();
    } catch {
      host.innerHTML = "";
    }
  }
}

export function hasPendingOtp(): boolean {
  return pendingConfirmation !== null;
}

export function clearPendingOtp(): void {
  pendingConfirmation = null;
  resetRecaptcha();
}

function mapFirebaseError(error: unknown): ApiError {
  const code = (error as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/invalid-verification-code":
      return new ApiError("validation", "That OTP is incorrect. Please check and try again.");
    case "auth/code-expired":
    case "auth/session-expired":
      return new ApiError("validation", "That OTP expired. Request a new code.");
    case "auth/invalid-phone-number":
      return new ApiError("validation", "Enter a valid phone number.");
    case "auth/too-many-requests":
      return new ApiError("conflict", "Too many attempts. Please try again in a few minutes.");
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return new ApiError("validation", "Sign in was cancelled.");
    case "auth/account-exists-with-different-credential":
      return new ApiError("conflict", "This email is already linked to another sign-in method.");
    case "auth/network-request-failed":
      return new ApiError("network", "We couldn't reach Firebase. Check your connection.");
    default:
      return new ApiError("http", (error as Error)?.message || "Authentication failed");
  }
}

/** Step 1 of phone login — sends the SMS OTP through Firebase. */
export async function sendFirebaseOtp(phoneE164: string): Promise<void> {
  const digits = phoneE164.replace(/\D/g, "");
  const normalized = phoneE164.startsWith("+")
    ? phoneE164
    : `+91${digits.slice(-10)}`;
  const auth = await firebaseAuth();
  try {
    const { signInWithPhoneNumber } = await import("firebase/auth");
    const verifier = await ensureRecaptcha(auth);
    pendingConfirmation = await signInWithPhoneNumber(auth, normalized, verifier);
  } catch (error) {
    resetRecaptcha();
    throw mapFirebaseError(error);
  }
}

/** Step 2 of phone login — confirms the OTP and returns the Firebase ID token. */
export async function confirmFirebaseOtp(code: string): Promise<string> {
  if (!pendingConfirmation) {
    throw new ApiError("validation", "That OTP expired. Request a new code.");
  }
  try {
    const credential = await pendingConfirmation.confirm(code);
    pendingConfirmation = null;
    resetRecaptcha();
    return await credential.user.getIdToken();
  } catch (error) {
    throw mapFirebaseError(error);
  }
}

async function signInWithProvider(kind: "google" | "apple"): Promise<UserCredential> {
  const auth = await firebaseAuth();
  const { GoogleAuthProvider, OAuthProvider, signInWithPopup } = await import("firebase/auth");
  const provider =
    kind === "google"
      ? new GoogleAuthProvider()
      : (() => {
          const apple = new OAuthProvider("apple.com");
          apple.addScope("email");
          apple.addScope("name");
          return apple;
        })();
  return signInWithPopup(auth, provider);
}

/** Google Sign In — returns the Firebase ID token for backend exchange. */
export async function signInWithGoogleIdToken(): Promise<string> {
  try {
    const credential = await signInWithProvider("google");
    return await credential.user.getIdToken();
  } catch (error) {
    throw mapFirebaseError(error);
  }
}

/**
 * Apple Sign In — fully implemented but gated behind
 * VITE_APPLE_SIGN_IN_ENABLED so Android builds never surface it.
 */
export async function signInWithAppleIdToken(): Promise<string> {
  if (!isAppleSignInEnabled()) {
    throw new ApiError("unconfigured", "Apple Sign In is not enabled on this platform");
  }
  try {
    const credential = await signInWithProvider("apple");
    return await credential.user.getIdToken();
  } catch (error) {
    throw mapFirebaseError(error);
  }
}

/** Current Firebase ID token, if a Firebase user is still signed in. */
export async function currentFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  if (typeof window === "undefined" || !isFirebaseConfigured()) return null;
  try {
    const auth = await firebaseAuth();
    const user = auth.currentUser;
    if (user) return await user.getIdToken(forceRefresh);
    // Firebase restores persisted users asynchronously — wait for the first tick.
    const restored = await new Promise<Auth["currentUser"]>((resolve) => {
      const stop = auth.onAuthStateChanged((next) => {
        stop();
        resolve(next);
      });
    });
    return restored ? await restored.getIdToken(forceRefresh) : null;
  } catch {
    return null;
  }
}

export async function firebaseSignOut(): Promise<void> {
  if (typeof window === "undefined" || !isFirebaseConfigured()) return;
  try {
    const auth = await firebaseAuth();
    const { signOut } = await import("firebase/auth");
    await signOut(auth);
  } catch {
    /* logging out locally is enough */
  } finally {
    pendingConfirmation = null;
    resetRecaptcha();
  }
}
