import { apiGetJson, apiPostJson, apiPutJson } from "@/api/core/transport";

export type PeakHourRange = {
  start: string;
  end: string;
};

export type DistanceRateConfig = {
  baseFare: number;
  baseDistanceKm: number;
  extraKmRate: number;
  minimumFare: number;
  maximumFareCap: number;

  surgeEnabled: boolean;
  surgeMultiplier: number;
  rainSurgeFee: number;
  peakHourSurgeFee: number;
  peakHours: PeakHourRange[];

  lateNightEnabled: boolean;
  lateNightFee: number;
  lateNightMultiplier: number;
  lateNightStartTime: string;
  lateNightEndTime: string;

  waitingEnabled: boolean;
  freeWaitingMinutes: number;
  waitingFeePerMinute: number;

  vehicleTypeMultipliers: Record<string, number>;
  expressBonus: number;
  cityOverrides?: Record<string, any>;
};

export type FareBreakdownResult = {
  baseFare: number;
  baseDistanceKm: number;
  distanceKm: number;
  extraDistanceKm: number;
  extraKmRate: number;
  distanceFare: number;
  isNight: boolean;
  nightFee: number;
  isSurge: boolean;
  surgeMultiplier: number;
  surgeFee: number;
  surgeReason: string;
  waitingMinutes: number;
  freeWaitingMinutes: number;
  billableWaitingMinutes: number;
  waitingFare: number;
  expressBonus: number;
  vehicleType: string;
  vehicleMultiplier: number;
  rawTotal: number;
  totalFare: number;
  isClampedMin: boolean;
  isClampedMax: boolean;
  breakdownText: string;
};

export type FareSimulationRequest = {
  distanceKm: number;
  timeOfDay?: string;
  isRain?: boolean;
  isExpress?: boolean;
  waitingMinutes?: number;
  vehicleType?: string;
  city?: string;
};

export async function fetchFareEngineConfig(): Promise<DistanceRateConfig> {
  return apiGetJson<DistanceRateConfig>("/admin/fare-engine/config");
}

export async function updateFareEngineConfig(
  payload: Partial<DistanceRateConfig>
): Promise<DistanceRateConfig> {
  return apiPutJson<DistanceRateConfig>("/admin/fare-engine/config", payload);
}

export async function simulateFareCalculation(
  payload: FareSimulationRequest
): Promise<FareBreakdownResult> {
  return apiPostJson<FareBreakdownResult>("/admin/fare-engine/simulate", payload);
}

export async function resetFareEngineConfig(): Promise<DistanceRateConfig> {
  return apiPostJson<DistanceRateConfig>("/admin/fare-engine/reset-defaults", {});
}
