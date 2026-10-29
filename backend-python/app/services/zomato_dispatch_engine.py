"""Zomato-Style Micro-Zone (Pod) and Concentric Wave Dispatch Engine.

Implements the industry-standard dispatch architecture:
1. Micro-Zone (Pod) spatial partitioning.
2. Multi-factor rider priority scoring (Distance + Idle Time Fairness + Rating).
3. Concentric Wave Dispatch:
   - Wave 1 (Ultra-Local Pod: 0 - 1.8 km): 15-second exclusive priority window.
   - Wave 2 (Neighboring Pods: 1.8 - 4.0 km): Cascades if Wave 1 unclaimed.
   - Wave 3 (Outer Zone / Fleet Fallback: 4.0 - 8.0 km): Citywide fallback.
4. Auto-cancellation of pending wave timers the millisecond a rider accepts.
"""

from __future__ import annotations

import asyncio
import logging
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from app.db.client import database
from app.core.privacy import mask_phone
from app.services import order_lifecycle as lifecycle
from app.services.socket_service import sio

logger = logging.getLogger("quickpress.zomato_dispatch")

RIDES_COLLECTION = "rides"
RIDE_ASSIGNMENTS_COLLECTION = "ride_assignments"
RIDERS_COLLECTION = "rider_profiles"
NOTIFICATIONS_COLLECTION = "rider_notifications"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute spherical great-circle distance in kilometers."""
    r = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(r * c, 2)


class ZomatoDispatchEngine:
    def __init__(self) -> None:
        # Default Zomato Concentric Wave Thresholds
        self.wave_1_radius_km: float = 1.8    # Ultra-Local Pod
        self.wave_2_radius_km: float = 4.0    # Neighboring Pods
        self.wave_3_radius_km: float = 8.0    # Citywide Fleet Fallback
        self.wave_1_timeout_sec: int = 15     # 15s priority window
        self.wave_2_timeout_sec: int = 15     # 15s window before citywide

        # In-flight active wave tasks by ride_id
        self._active_wave_tasks: Dict[str, asyncio.Task] = {}
        self._active_wave_metadata: Dict[str, Dict[str, Any]] = {}

    def get_config(self) -> Dict[str, Any]:
        return {
            "wave1RadiusKm": self.wave_1_radius_km,
            "wave2RadiusKm": self.wave_2_radius_km,
            "wave3RadiusKm": self.wave_3_radius_km,
            "wave1TimeoutSec": self.wave_1_timeout_sec,
            "wave2TimeoutSec": self.wave_2_timeout_sec,
            "architecture": "Zomato Concentric Pod Dispatch",
        }

    def update_config(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        if "wave1RadiusKm" in payload:
            self.wave_1_radius_km = float(payload["wave1RadiusKm"])
        if "wave2RadiusKm" in payload:
            self.wave_2_radius_km = float(payload["wave2RadiusKm"])
        if "wave3RadiusKm" in payload:
            self.wave_3_radius_km = float(payload["wave3RadiusKm"])
        if "wave1TimeoutSec" in payload:
            self.wave_1_timeout_sec = int(payload["wave1TimeoutSec"])
        if "wave2TimeoutSec" in payload:
            self.wave_2_timeout_sec = int(payload["wave2TimeoutSec"])
        return self.get_config()

    def compute_rider_priority_score(
        self, rider: Dict[str, Any], distance_km: float, now_dt: Optional[datetime] = None
    ) -> float:
        """Zomato Composite Ranking Formula:
        Score = (DistanceKm * 1.0) - (min(IdleMinutes, 60) * 0.15) - ((Rating - 4.0) * 0.5)
        Lower Score = Higher Dispatch Priority.
        """
        now = now_dt or datetime.now(timezone.utc)

        # 1. Idle time factor (riders waiting longer get a fairness boost)
        last_activity_str = (
            rider.get("lastAssignedAt")
            or rider.get("lastCompletedTripAt")
            or rider.get("lastLocationAt")
            or rider.get("updatedAt")
        )
        idle_minutes = 10.0
        if last_activity_str:
            try:
                last_dt = datetime.fromisoformat(str(last_activity_str).replace("Z", "+00:00"))
                idle_minutes = max(0.0, (now - last_dt).total_seconds() / 60.0)
            except Exception:
                idle_minutes = 10.0

        clamped_idle = min(60.0, idle_minutes)

        # 2. Rating factor (4.0 to 5.0 scale)
        rating = float(rider.get("rating") or 5.0)

        # Formula
        score = (distance_km * 1.0) - (clamped_idle * 0.15) - ((rating - 4.0) * 0.5)
        return round(score, 3)

    def classify_riders_into_waves(
        self, ranked_riders: List[Tuple[Dict[str, Any], float]]
    ) -> Dict[str, List[Tuple[Dict[str, Any], float]]]:
        """Classify candidate riders into Zomato concentric waves based on GPS distance."""
        w1: List[Tuple[Dict[str, Any], float]] = []
        w2: List[Tuple[Dict[str, Any], float]] = []
        w3: List[Tuple[Dict[str, Any], float]] = []

        now = datetime.now(timezone.utc)
        # Score each rider
        scored = []
        for rider, dist in ranked_riders:
            score = self.compute_rider_priority_score(rider, dist, now)
            scored.append((rider, dist, score))

        # Sort within each wave by composite score
        scored.sort(key=lambda item: item[2])

        for rider, dist, _score in scored:
            if dist <= self.wave_1_radius_km:
                w1.append((rider, dist))
            elif dist <= self.wave_2_radius_km:
                w2.append((rider, dist))
            elif dist <= self.wave_3_radius_km:
                w3.append((rider, dist))

        return {"wave_1": w1, "wave_2": w2, "wave_3": w3}

    async def start_concentric_wave_dispatch(
        self,
        ride_id: str,
        order_id: str,
        ride: Dict[str, Any],
        ranked_riders: List[Tuple[Dict[str, Any], float]],
    ) -> None:
        """Start the Zomato Concentric Wave Dispatch process for a ride."""
        # Cancel any previous wave task for this ride
        self.cancel_dispatch(ride_id)

        waves = self.classify_riders_into_waves(ranked_riders)
        w1_riders = waves["wave_1"]
        w2_riders = waves["wave_2"]
        w3_riders = waves["wave_3"]

        logger.info(
            "⚡ [Zomato Dispatch] Ride %s candidate waves: Wave 1=%d, Wave 2=%d, Wave 3=%d",
            ride_id,
            len(w1_riders),
            len(w2_riders),
            len(w3_riders),
        )

        # If Wave 1 has riders, start with Wave 1 and schedule Wave 2 escalation
        if w1_riders:
            await self._dispatch_single_wave(
                wave_num=1,
                tier_label="ultra_local",
                badge_prefix="🟢 Ultra-Local",
                ride_id=ride_id,
                order_id=order_id,
                ride=ride,
                riders=w1_riders,
            )
            # Schedule Wave 2 if unclaimed after wave_1_timeout_sec
            task = asyncio.create_task(
                self._wave_escalation_loop(
                    ride_id=ride_id,
                    order_id=order_id,
                    ride=ride,
                    w2_riders=w2_riders,
                    w3_riders=w3_riders,
                )
            )
            self._active_wave_tasks[ride_id] = task

        elif w2_riders:
            # No ultra-local riders currently online, jump straight to Wave 2 with zero delay
            logger.info("⚡ [Zomato Dispatch] No Wave 1 riders, instantly promoting to Wave 2 for Ride %s", ride_id)
            await self._dispatch_single_wave(
                wave_num=2,
                tier_label="nearby_zone",
                badge_prefix="⚡ Nearby Zone",
                ride_id=ride_id,
                order_id=order_id,
                ride=ride,
                riders=w2_riders,
            )
            task = asyncio.create_task(
                self._wave_escalation_loop(
                    ride_id=ride_id,
                    order_id=order_id,
                    ride=ride,
                    w2_riders=[],  # already dispatched
                    w3_riders=w3_riders,
                )
            )
            self._active_wave_tasks[ride_id] = task

        elif w3_riders:
            # Fallback to citywide
            logger.info("⚡ [Zomato Dispatch] Promoting directly to Wave 3 (Citywide) for Ride %s", ride_id)
            await self._dispatch_single_wave(
                wave_num=3,
                tier_label="outer_city",
                badge_prefix="🛵 Citywide Fleet",
                ride_id=ride_id,
                order_id=order_id,
                ride=ride,
                riders=w3_riders,
            )
        else:
            # No eligible riders in any radius
            logger.warning("[Zomato Dispatch] No eligible online captains found in any wave for Ride %s", ride_id)

    async def _wave_escalation_loop(
        self,
        ride_id: str,
        order_id: str,
        ride: Dict[str, Any],
        w2_riders: List[Tuple[Dict[str, Any], float]],
        w3_riders: List[Tuple[Dict[str, Any], float]],
    ) -> None:
        """Background coroutine that progressively cascades offers to outer waves if unclaimed."""
        try:
            # Wait for Wave 1 priority window
            if w2_riders:
                await asyncio.sleep(self.wave_1_timeout_sec)

                # Check if ride was already accepted by a Wave 1 rider
                current_ride = await database.find_one(RIDES_COLLECTION, {"_id": ride_id})
                if not current_ride or current_ride.get("status") in ("ACCEPTED", "COMPLETED", "CANCELLED"):
                    logger.info("⚡ [Zomato Dispatch] Ride %s was claimed in Wave 1. Halting wave escalation.", ride_id)
                    return

                # Escalate to Wave 2
                logger.info(
                    "⚡ [Zomato Dispatch] Escalating Ride %s to WAVE 2 (%d Neighboring Captains)",
                    ride_id,
                    len(w2_riders),
                )
                await self._dispatch_single_wave(
                    wave_num=2,
                    tier_label="nearby_zone",
                    badge_prefix="⚡ Nearby Zone",
                    ride_id=ride_id,
                    order_id=order_id,
                    ride=current_ride,
                    riders=w2_riders,
                )

            # Wait for Wave 2 window before cascading to Wave 3
            if w3_riders:
                await asyncio.sleep(self.wave_2_timeout_sec)

                current_ride = await database.find_one(RIDES_COLLECTION, {"_id": ride_id})
                if not current_ride or current_ride.get("status") in ("ACCEPTED", "COMPLETED", "CANCELLED"):
                    logger.info("⚡ [Zomato Dispatch] Ride %s was claimed in Wave 2. Halting wave escalation.", ride_id)
                    return

                # Escalate to Wave 3 (Citywide Fleet)
                logger.info(
                    "⚡ [Zomato Dispatch] Escalating Ride %s to WAVE 3 (%d Outer Captains)",
                    ride_id,
                    len(w3_riders),
                )
                await self._dispatch_single_wave(
                    wave_num=3,
                    tier_label="outer_city",
                    badge_prefix="🛵 Citywide Fleet",
                    ride_id=ride_id,
                    order_id=order_id,
                    ride=current_ride,
                    riders=w3_riders,
                )

        except asyncio.CancelledError:
            logger.info("⚡ [Zomato Dispatch] Wave escalation cancelled for Ride %s", ride_id)
        except Exception as err:
            logger.error("[Zomato Dispatch] Wave escalation error for Ride %s: %s", ride_id, err)
        finally:
            self._active_wave_tasks.pop(ride_id, None)

    async def _dispatch_single_wave(
        self,
        wave_num: int,
        tier_label: str,
        badge_prefix: str,
        ride_id: str,
        order_id: str,
        ride: Dict[str, Any],
        riders: List[Tuple[Dict[str, Any], float]],
    ) -> None:
        """Emit socket offers to all captains in this specific wave."""
        now = lifecycle.now_iso()
        ride_type = ride.get("rideType", "pickup")
        target_loc = ride.get("pickupLocation") or {}
        drop_loc = ride.get("dropLocation") or {}
        base_fare = ride.get("fare") or ride.get("estimatedEarning", 45)
        is_express = bool(ride.get("isExpress"))
        rider_express_bonus = float(ride.get("riderExpressBonus") or 0.0)
        express_fee = float(ride.get("expressFee") or 0.0)
        express_share_pct = float(ride.get("expressRiderSharePercent") or 80.0)

        # Store active wave state for telemetry
        self._active_wave_metadata[ride_id] = {
            "orderId": order_id,
            "orderCode": ride.get("orderCode") or (order_id[-6:].upper() if order_id else ""),
            "currentWave": wave_num,
            "tierLabel": tier_label,
            "waveCaptainsCount": len(riders),
            "dispatchedAt": now,
        }

        # 1. Broadcast to riders room tagged with wave level
        broadcast_payload = {
            "offerId": f"off-{ride_id}-w{wave_num}-bcast",
            "rideId": ride_id,
            "orderId": order_id,
            "orderCode": ride.get("orderCode"),
            "rideType": ride_type,
            "type": ride_type,
            "fare": base_fare,
            "estimatedEarning": base_fare,
            "pickupAddress": target_loc.get("address") or "Customer Pickup Location",
            "dropAddress": drop_loc.get("address") or "QuickPress Store",
            "pickupTitle": target_loc.get("contactName") or "Pickup",
            "dropTitle": drop_loc.get("contactName") or "Drop",
            "customerName": target_loc.get("contactName") or "Customer",
            "partnerName": drop_loc.get("contactName") or "QuickPress Store",
            "distanceKm": round(float(ride.get("distanceKm") or 2.0), 1),
            "isExpress": is_express,
            "riderExpressBonus": rider_express_bonus,
            "createdAt": now,
            "autoAssigned": False,
            "wave": wave_num,
            "proximityTier": tier_label,
            "proximityBadge": f"{badge_prefix} • Wave {wave_num}",
            "waveTimeoutSeconds": self.wave_1_timeout_sec if wave_num == 1 else self.wave_2_timeout_sec,
            "fareBreakdown": ride.get("fareBreakdown"),
            "fareBreakdownText": (ride.get("fareBreakdown") or {}).get("breakdownText"),
        }

        # Emit to global riders channel
        await sio.emit("order.rider_offer", broadcast_payload, room="riders")
        await sio.emit("new_order_offer", broadcast_payload, room="riders")

        # 2. Targeted emissions with exact captain distance & arrival ETA
        async def _notify_captain(c_rider: Dict[str, Any], dist_km: float) -> None:
            r_id = str(c_rider.get("_id") or c_rider.get("riderId") or c_rider.get("id") or "")
            offer_id = f"off-{ride_id}-{r_id}"
            arrival_mins = max(2, int(round(dist_km * 2.8)))
            badge_text = f"{badge_prefix} • {round(dist_km, 1)} km (~{arrival_mins} min arrival)"

            offer_doc = {
                "_id": offer_id,
                "offerId": offer_id,
                "rideId": ride_id,
                "orderId": order_id,
                "orderCode": ride.get("orderCode"),
                "rideType": ride_type,
                "type": ride_type,
                "riderId": r_id,
                "status": "pending",
                "distanceKm": round(dist_km, 1),
                "estimatedArrivalMinutes": arrival_mins,
                "wave": wave_num,
                "proximityTier": tier_label,
                "proximityBadge": badge_text,
                "estimatedEarning": base_fare,
                "fare": base_fare,
                "isExpress": is_express,
                "expressFee": express_fee,
                "riderExpressBonus": rider_express_bonus,
                "expressRiderSharePercent": express_share_pct,
                "fareBreakdown": ride.get("fareBreakdown"),
                "fareBreakdownText": (ride.get("fareBreakdown") or {}).get("breakdownText"),
                "pickupAddress": target_loc.get("address"),
                "dropAddress": drop_loc.get("address"),
                "customerName": target_loc.get("contactName") or "Customer",
                "customerPhone": mask_phone(target_loc.get("contactPhone") or ""),
                "customerPhoneMasked": mask_phone(target_loc.get("contactPhone") or ""),
                "isNumberMasked": True,
                "partnerName": drop_loc.get("contactName") or "QuickPress Store",
                "partnerPhone": drop_loc.get("contactPhone") or "",
                "createdAt": now,
                "waveTimeoutSeconds": self.wave_1_timeout_sec if wave_num == 1 else self.wave_2_timeout_sec,
            }

            # Socket rooms for this rider
            socket_rooms = [f"rider:{r_id}"]
            r_phone = str(c_rider.get("phone") or "").replace("+", "").strip()
            if r_phone:
                socket_rooms.extend([f"rider:{r_phone}", f"rider:+{r_phone}"])
            r_uid = str(c_rider.get("userId") or "").strip()
            if r_uid:
                socket_rooms.append(f"rider:{r_uid}")

            for s_room in socket_rooms:
                await sio.emit("order.rider_offer", offer_doc, room=s_room)
                await sio.emit("new_order_offer", offer_doc, room=s_room)

            # Persist offer docs asynchronously
            await asyncio.gather(
                database.collection(RIDE_ASSIGNMENTS_COLLECTION).update_one(
                    {"_id": offer_id},
                    {"$set": {k: v for k, v in offer_doc.items() if k != "_id"}},
                    upsert=True,
                ),
                database.collection("rider_offers").update_one(
                    {"_id": offer_id},
                    {"$set": {k: v for k, v in offer_doc.items() if k != "_id"}},
                    upsert=True,
                ),
                return_exceptions=True,
            )

            # Trigger real-time background FCM push notification to wake captain device in milliseconds
            target_uids = [uid for uid in [r_uid, r_id] if uid]
            if target_uids:
                try:
                    from app.core.fcm import send_fcm_push
                    fcm_data = {
                        "type": "new_order_offer",
                        "offerId": offer_id,
                        "orderId": order_id,
                        "orderCode": str(ride.get("orderCode") or ""),
                        "amount": str(base_fare),
                        "customerName": str(target_loc.get("contactName") or "Customer"),
                        "role": "rider",
                        "url": "/orders",
                        "channel_id": "quickpress_urgent_dispatch",
                        "wake_screen": "true",
                        "ring_bell": "true",
                    }
                    asyncio.create_task(
                        send_fcm_push(
                            target_uids,
                            title=f"⚡ New Order Offer: ₹{base_fare} ({round(dist_km, 1)} km)",
                            body=f"Pickup: {target_loc.get('address', 'Kasganj')} • Tap to accept",
                            data=fcm_data,
                            role="rider",
                        )
                    )
                except Exception as fcm_err:
                    logger.debug("Failed triggering captain offer push: %s", fcm_err)

        if riders:
            await asyncio.gather(
                *[_notify_captain(c, d) for c, d in riders],
                return_exceptions=True,
            )

    def cancel_dispatch(self, ride_id: str) -> None:
        """Cancel pending wave timers immediately when a ride is claimed."""
        task = self._active_wave_tasks.pop(ride_id, None)
        if task and not task.done():
            task.cancel()
        self._active_wave_metadata.pop(ride_id, None)

    def get_live_waves(self) -> Dict[str, Any]:
        """Telemetry of in-flight dispatch waves."""
        live_list = []
        for ride_id, meta in self._active_wave_metadata.items():
            live_list.append({
                "rideId": ride_id,
                "orderId": meta.get("orderId", ""),
                "orderCode": meta.get("orderCode", ""),
                "currentWave": meta.get("currentWave", 1),
                "tierLabel": meta.get("tierLabel", "ultra_local"),
                "waveCaptainsCount": meta.get("waveCaptainsCount", 0),
                "dispatchedAt": meta.get("dispatchedAt", datetime.now(timezone.utc).isoformat()),
            })

        return {
            "activeCount": len(self._active_wave_tasks),
            "activeDispatchesCount": len(self._active_wave_tasks),
            "inFlightRides": list(self._active_wave_tasks.keys()),
            "liveWaves": live_list,
            "metadata": self._active_wave_metadata,
        }


zomato_dispatch_engine = ZomatoDispatchEngine()
