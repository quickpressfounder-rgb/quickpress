/**
 * Customer Defect & Pre-Wash Consent API.
 * Allows customers to review pre-wash defect photos and digitally consent to:
 * - proceed_wash: Wash with care (customer accepts risk)
 * - return_unwashed: Return garment unwashed as-is
 */
import type { GarmentDefect, CustomerDefectStatus } from "@/shared/types/order";
import { apiGetJson, apiPostJson } from "../core/transport";

export interface CustomerDefectDecisionPayload {
  action: CustomerDefectStatus;
  note?: string;
}

/**
 * GET /api/orders/{orderId}/defects
 * Fetch all garment inspection reports tagged on an order.
 */
export async function fetchOrderDefects(orderId: string): Promise<GarmentDefect[]> {
  try {
    return await apiGetJson<GarmentDefect[]>(`/api/orders/${orderId}/defects`);
  } catch {
    return [];
  }
}

/**
 * POST /api/orders/{orderId}/defects/{defectId}/respond
 * Customer digital consent response.
 */
export async function respondToGarmentDefect(
  orderId: string,
  defectId: string,
  payload: CustomerDefectDecisionPayload,
): Promise<GarmentDefect> {
  return await apiPostJson<GarmentDefect>(`/api/orders/${orderId}/defects/${defectId}/respond`, payload);
}
