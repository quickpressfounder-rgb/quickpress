/**
 * Partner Defect & Inspection API — Pre-wash defect reporting.
 */
import type { GarmentDefect, DefectType } from "@/shared/types/partner";
import { apiGetJson, apiPostJson } from "../core/transport";

export interface LogDefectPayload {
  item_name: string;
  defect_type: DefectType;
  photo: string;
  description?: string;
}

/**
 * POST /api/partner/orders/{orderId}/defects
 * Partner tags a pre-existing stain, cut, or defect on a garment with a photo.
 */
export async function reportGarmentDefect(
  orderId: string,
  payload: LogDefectPayload,
): Promise<GarmentDefect> {
  return await apiPostJson<GarmentDefect>(`/api/partner/orders/${orderId}/defects`, payload);
}

/**
 * GET /api/partner/orders/{orderId}/defects
 * Fetch all defects logged for an order.
 */
export async function fetchGarmentDefects(orderId: string): Promise<GarmentDefect[]> {
  try {
    return await apiGetJson<GarmentDefect[]>(`/api/partner/orders/${orderId}/defects`);
  } catch {
    return [];
  }
}
