import { toast } from "sonner";
import {
  unlockAudioContext,
  playOrderAlertSound,
  speakOrderAlert,
  triggerHaptic,
} from "./captain-audio";

export interface TestOrderOffer {
  id: string;
  orderId: string;
  orderCode: string;
  type: string;
  rideType: string;
  pickupTitle: string;
  pickupAddress: string;
  dropTitle: string;
  dropAddress: string;
  pickupDistanceKm: number;
  dropDistanceKm: number;
  fare: number;
  amount: number;
  paymentMode: string;
  customerName: string;
  customerPhone: string;
  partnerName: string;
  partnerPhone: string;
  partnerAddress: string;
  pickupOtp: string;
  deliveryOtp: string;
  dispatchOtp: string;
  customerCoords: { lat: number; lng: number };
  partnerCoords: { lat: number; lng: number };
  pickupCoords: { lat: number; lng: number };
  dropCoords: { lat: number; lng: number };
  expiresInSeconds: number;
  placedAt: string;
}

export const generateTestOffer = (): TestOrderOffer => {
  return {
    id: `TEST-${Date.now()}`,
    orderId: `TEST-ORD-${Math.floor(100000 + Math.random() * 900000)}`,
    orderCode: "QP1052",
    type: "bike",
    rideType: "pickup",
    pickupTitle: "Sector 67 Noida",
    pickupAddress: "26, Block A, Sector 68, Noida, 201316",
    dropTitle: "Sarfabad Village Sector 73 Noida",
    dropAddress: "Yadu Public School, Noida Sector 73, Sector 63 Road, Sarfabad Village, Noida, Uttar Pradesh, India",
    pickupDistanceKm: 0.8,
    dropDistanceKm: 2.2,
    fare: 27,
    amount: 27,
    paymentMode: "cash",
    customerName: "Priya Sharma",
    customerPhone: "+91 98765 43210",
    partnerName: "CleanWash Hub Sector 67",
    partnerPhone: "+91 98111 22334",
    partnerAddress: "26, Block A, Sector 68, Noida",
    pickupOtp: "4521",
    deliveryOtp: "8890",
    dispatchOtp: "6312",
    customerCoords: { lat: 28.5832, lng: 77.391 },
    partnerCoords: { lat: 28.6015, lng: 77.385 },
    pickupCoords: { lat: 28.6015, lng: 77.385 },
    dropCoords: { lat: 28.5832, lng: 77.391 },
    expiresInSeconds: 120,
    placedAt: new Date().toISOString(),
  };
};

export const dispatchTestTrip = (navigateFn?: (opts: { to: string }) => void) => {
  const offer = generateTestOffer();

  // 1. Store in localStorage so RiderOrdersScreen picks it up instantly on mount
  try {
    localStorage.setItem("qp_test_rider_offer", JSON.stringify(offer));
  } catch {}

  // 2. Play high-priority alert sound, siren & Hindi speech prompt
  try {
    unlockAudioContext();
    triggerHaptic([300, 100, 300, 100, 500]);
    playOrderAlertSound();
    speakOrderAlert(27, "Sector 67 Noida", "Sarfabad Village Sector 73 Noida");
  } catch (err) {
    console.warn("Audio/Haptic error on test trip:", err);
  }

  // 3. Dispatch window event for any currently mounted screens
  try {
    window.dispatchEvent(new CustomEvent("qp_simulate_rider_offer", { detail: offer }));
  } catch {}

  toast.success("🧪 Test Trip Dispatched! (₹27 · Sector 67 Noida ➔ Sarfabad Village)", {
    duration: 4000,
  });

  // 4. Auto-switch to Trips tab (/orders)
  if (navigateFn) {
    navigateFn({ to: "/orders" });
  } else if (typeof window !== "undefined" && window.location.pathname !== "/orders") {
    window.location.assign("/orders");
  }

  return offer;
};
