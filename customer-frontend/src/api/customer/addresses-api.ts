// Addresses data layer — /api/addresses endpoints

import { apiDeleteJson, apiGetJson, apiPostJson, apiRequest } from "../core/transport";
import { reverseGeocodeCoords } from "../core/maps-api";
import { detectDeviceLocation, getCurrentDeviceLocation, readLocation, GeoError } from "./location";
import type { AddressEntity } from "@/shared/types";
import { CACHE_KEYS, readStaleCache, writeCache } from "./api/cache";

export type AddressType = AddressEntity["type"];

export type SavedAddress = {
  id: string;
  type: AddressType;
  label: string;
  houseNumber: string;
  building: string;
  street: string;
  area: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  contactName: string;
  phone: string;
  isDefault: boolean;
  /** Map-picked / GPS coordinates. Optional: older addresses have none. */
  latitude?: number | undefined;
  longitude?: number | undefined;
};

export type AddressDraft = Omit<SavedAddress, "id" | "isDefault">;

export function formatAddress(address: SavedAddress) {
  return [
    [address.houseNumber, address.building].filter(Boolean).join(", "),
    address.street,
    address.area,
    address.landmark,
    `${address.city}, ${address.state} ${address.pincode}`,
  ]
    .filter(Boolean)
    .join(", ");
}

export const EMPTY_ADDRESS: AddressDraft = {
  type: "home",
  label: "Home",
  houseNumber: "",
  building: "",
  street: "",
  area: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  contactName: "",
  phone: "",
};

export async function fetchAddresses(): Promise<SavedAddress[]> {
  const addresses = await apiGetJson<SavedAddress[]>("/api/addresses");
  writeCache(CACHE_KEYS.addresses, addresses);
  return addresses;
}

/** Last known address book — rendered instantly on a warm or offline start. */
export function readCachedAddresses(): SavedAddress[] | null {
  return readStaleCache<SavedAddress[]>(CACHE_KEYS.addresses);
}

export async function createAddress(draft: AddressDraft): Promise<SavedAddress> {
  return apiPostJson<SavedAddress>("/api/addresses", draft);
}

export async function updateAddress(id: string, draft: AddressDraft) {
  return apiRequest<SavedAddress>("PUT", `/api/addresses/${id}`, { body: draft });
}

export async function deleteAddress(id: string) {
  await apiDeleteJson(`/api/addresses/${id}`);
  return { ok: true, id };
}

export async function setDefaultAddress(id: string) {
  return apiRequest<SavedAddress>("PUT", `/api/addresses/${id}/default`);
}

export type AddressErrors = Partial<Record<keyof AddressDraft, string>>;

/**
 * Client-side mirror of the FastAPI address validator, so the form reports
 * problems before a request is spent on them.
 */
export function validateAddress(draft: AddressDraft): AddressErrors {
  const errors: AddressErrors = {};
  if (!draft.houseNumber.trim()) errors.houseNumber = "House / flat number is required";
  if (!draft.area.trim()) errors.area = "Area is required";
  if (!draft.city.trim()) errors.city = "City is required";
  if (!/^\d{6}$/.test(draft.pincode.trim())) errors.pincode = "Pincode must be 6 digits";
  if (draft.phone.replace(/\D/g, "").length < 10) {
    errors.phone = "Enter a valid 10 digit phone number";
  }
  if (draft.contactName.trim() && draft.contactName.trim().length < 2) {
    errors.contactName = "Enter a valid name";
  }
  return errors;
}

/**
 * Current-location fill for the address form.
 *
 * REAL device GPS + the existing Google Maps reverse-geocode proxy. It only
 * returns form values — it never writes the address book and never changes the
 * customer's default address.
 */
export async function detectCurrentLocation(): Promise<Partial<AddressDraft>> {
  const loc = await detectDeviceLocation({ allowFallback: true, timeoutMs: 9000 });
  const lat = loc.latitude;
  const lng = loc.longitude;

  if (lat == null || lng == null) {
    const saved = readLocation();
    if (saved?.latitude != null && saved?.longitude != null) {
      return {
        street: saved.street || saved.area || "",
        area: saved.area || "",
        city: saved.city || "",
        state: saved.state || "",
        pincode: saved.pincode || "",
        latitude: saved.latitude,
        longitude: saved.longitude,
      };
    }
    throw new GeoError("POSITION_UNAVAILABLE");
  }

  let street = loc.street || "";
  let pincode = loc.pincode || "";
  try {
    const place = await reverseGeocodeCoords(lat, lng);
    if (place) {
      street = place.street || place.formattedAddress?.split(",")?.[0]?.trim() || street;
      pincode = place.pincode || pincode;
    }
  } catch {}

  return {
    street: street || loc.area || "Current Location",
    area: loc.area || loc.city || "",
    city: loc.city || "",
    state: loc.state || "",
    pincode: pincode || "",
    latitude: lat,
    longitude: lng,
  };
}
