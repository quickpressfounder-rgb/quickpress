"""Review & Rating Repository for QuickPress.

Comprehensive 360-Degree Mutual Rating Engine:
- Customer rates: Partner Store + Delivery Captain
- Partner rates: Delivery Captain + Customer
- Captain rates: Customer + Partner Store
- Real-time aggregate score recalculations across partner_profiles, rider_profiles, and users.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.db.client import database
from app.models.user import User

logger = logging.getLogger(__name__)

REVIEWS_COLLECTION = "order_reviews"
PARTNER_REVIEWS_COLLECTION = "partner_reviews"
RIDER_REVIEWS_COLLECTION = "rider_reviews"
CUSTOMER_REVIEWS_COLLECTION = "customer_reviews"
PARTNER_PROFILES_COLLECTION = "partner_profiles"
RIDER_PROFILES_COLLECTION = "rider_profiles"
USERS_COLLECTION = "users"


class SubmitReviewPayload(BaseModel):
    """Payload for Customer rating Partner Store and Delivery Captain."""
    storeRating: int = Field(..., ge=1, le=5)
    storeFeedback: Optional[str] = None
    storeTags: List[str] = Field(default_factory=list)

    riderRating: Optional[int] = Field(None, ge=1, le=5)
    riderFeedback: Optional[str] = None
    riderTags: List[str] = Field(default_factory=list)
    tipAmount: Optional[int] = Field(0, ge=0)


class SubmitPartnerReviewPayload(BaseModel):
    """Payload for Partner Store rating Delivery Captain and Customer."""
    riderRating: int = Field(..., ge=1, le=5)
    riderFeedback: Optional[str] = None
    riderTags: List[str] = Field(default_factory=list)

    customerRating: Optional[int] = Field(None, ge=1, le=5)
    customerFeedback: Optional[str] = None
    customerTags: List[str] = Field(default_factory=list)


class SubmitRiderReviewPayload(BaseModel):
    """Payload for Captain (Rider) rating Customer and Partner Store."""
    customerRating: int = Field(..., ge=1, le=5)
    customerFeedback: Optional[str] = None
    customerTags: List[str] = Field(default_factory=list)

    storeRating: Optional[int] = Field(None, ge=1, le=5)
    storeFeedback: Optional[str] = None
    storeTags: List[str] = Field(default_factory=list)


class ReviewResponse(BaseModel):
    id: str
    orderId: str
    userId: Optional[str] = None
    customerName: Optional[str] = None
    partnerId: Optional[str] = None
    riderId: Optional[str] = None
    sourceRole: str = "customer"
    storeRating: Optional[int] = None
    storeFeedback: Optional[str] = None
    storeTags: List[str] = Field(default_factory=list)
    riderRating: Optional[int] = None
    riderFeedback: Optional[str] = None
    riderTags: List[str] = Field(default_factory=list)
    customerRating: Optional[int] = None
    customerFeedback: Optional[str] = None
    customerTags: List[str] = Field(default_factory=list)
    createdAt: str


class ReviewRepository:
    """Handles 360-degree mutual reviews submission and real-time aggregate recalculations."""

    async def get_by_order(self, order_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {"orderId": order_id, "sourceRole": "customer"}
        if user_id:
            query["userId"] = user_id
        return await database.find_one(REVIEWS_COLLECTION, query)

    async def get_partner_review(self, order_id: str, partner_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {"orderId": order_id, "sourceRole": "partner"}
        if partner_id:
            query["partnerId"] = partner_id
        return await database.find_one(REVIEWS_COLLECTION, query)

    async def get_rider_review(self, order_id: str, rider_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        query: Dict[str, Any] = {"orderId": order_id, "sourceRole": "rider"}
        if rider_id:
            query["riderId"] = rider_id
        return await database.find_one(REVIEWS_COLLECTION, query)

    async def submit_review(
        self,
        order_id: str,
        user: User,
        payload: SubmitReviewPayload,
    ) -> Dict[str, Any]:
        """Customer rates Partner Store + Delivery Captain."""
        order = await database.find_one("customer_orders", {"_id": order_id})
        if not order:
            order = await database.find_one("customer_orders", {"id": order_id})
        if not order:
            raise ValueError("Order not found")

        order_user_id = str(order.get("userId") or (order.get("customer") or {}).get("id") or "")
        if order_user_id and order_user_id != user.id:
            raise PermissionError("You can only review your own orders")

        existing = await self.get_by_order(order_id, user.id)
        if existing:
            raise ValueError("You have already reviewed this order")

        partner_id = str(order.get("partnerId") or (order.get("partner") or {}).get("id") or (order.get("store") or {}).get("id") or "")
        rider_id = str(order.get("assignedRiderId") or order.get("riderId") or (order.get("rider") or {}).get("id") or "")

        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        review_id = f"rev-cust-{uuid.uuid4().hex[:10]}"
        customer_name = user.display_name or (user.phone[-4:] if user.phone else "QuickPress Customer")

        review_doc = {
            "_id": review_id,
            "id": review_id,
            "orderId": order_id,
            "orderCode": order.get("code", order_id),
            "userId": user.id,
            "customerName": customer_name,
            "partnerId": partner_id,
            "riderId": rider_id if rider_id else None,
            "sourceRole": "customer",
            "storeRating": payload.storeRating,
            "storeFeedback": payload.storeFeedback,
            "storeTags": payload.storeTags,
            "riderRating": payload.riderRating,
            "riderFeedback": payload.riderFeedback,
            "riderTags": payload.riderTags,
            "tipAmount": payload.tipAmount,
            "createdAt": now_iso,
        }
        await database.collection(REVIEWS_COLLECTION).insert_one(review_doc)

        # Record under partner_reviews
        if partner_id:
            partner_review_doc = {
                "_id": f"prv-{review_id}",
                "partnerId": partner_id,
                "orderId": order_id,
                "orderCode": order.get("code", order_id),
                "authorRole": "customer",
                "authorName": customer_name,
                "rating": payload.storeRating,
                "comment": payload.storeFeedback or "",
                "tags": payload.storeTags,
                "createdAt": now_iso,
            }
            await database.collection(PARTNER_REVIEWS_COLLECTION).insert_one(partner_review_doc)
            await self._recalculate_partner_rating(partner_id)

        # Record under rider_reviews
        if rider_id and payload.riderRating:
            rider_review_doc = {
                "_id": f"rrv-{review_id}",
                "riderId": rider_id,
                "orderId": order_id,
                "orderCode": order.get("code", order_id),
                "authorRole": "customer",
                "authorName": customer_name,
                "rating": payload.riderRating,
                "comment": payload.riderFeedback or "",
                "tags": payload.riderTags,
                "tipAmount": payload.tipAmount or 0,
                "createdAt": now_iso,
            }
            await database.collection(RIDER_REVIEWS_COLLECTION).insert_one(rider_review_doc)
            await self._recalculate_rider_rating(rider_id)

        # Mark order as customer reviewed
        await database.collection("customer_orders").update_one(
            {"_id": order.get("_id")},
            {
                "$set": {
                    "isReviewed": True,
                    "customerReviewed": True,
                    "storeRating": payload.storeRating,
                    "riderRating": payload.riderRating,
                    "customerReviewId": review_id,
                    "customerReviewedAt": now_iso,
                }
            },
        )

        return review_doc

    async def submit_partner_review(
        self,
        order_id: str,
        partner_id: str,
        payload: SubmitPartnerReviewPayload,
    ) -> Dict[str, Any]:
        """Partner Store rates Delivery Captain + Customer."""
        order = await database.find_one("customer_orders", {"_id": order_id})
        if not order:
            order = await database.find_one("customer_orders", {"id": order_id})
        if not order:
            raise ValueError("Order not found")

        ord_partner_id = str(order.get("partnerId") or (order.get("partner") or {}).get("id") or (order.get("store") or {}).get("id") or "")
        if ord_partner_id and ord_partner_id != partner_id:
            raise PermissionError("You can only review orders belonging to your store")

        existing = await self.get_partner_review(order_id, partner_id)
        if existing:
            raise ValueError("Partner review has already been submitted for this order")

        rider_id = str(order.get("assignedRiderId") or order.get("riderId") or (order.get("rider") or {}).get("id") or "")
        user_id = str(order.get("userId") or (order.get("customer") or {}).get("id") or "")

        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        review_id = f"rev-part-{uuid.uuid4().hex[:10]}"

        partner_doc = await database.find_one(PARTNER_PROFILES_COLLECTION, {"$or": [{"_id": partner_id}, {"partnerId": partner_id}]}) or {}
        store_name = partner_doc.get("storeName") or partner_doc.get("businessName") or "Partner Store"

        review_doc = {
            "_id": review_id,
            "id": review_id,
            "orderId": order_id,
            "orderCode": order.get("code", order_id),
            "partnerId": partner_id,
            "storeName": store_name,
            "userId": user_id,
            "riderId": rider_id if rider_id else None,
            "sourceRole": "partner",
            "riderRating": payload.riderRating,
            "riderFeedback": payload.riderFeedback,
            "riderTags": payload.riderTags,
            "customerRating": payload.customerRating,
            "customerFeedback": payload.customerFeedback,
            "customerTags": payload.customerTags,
            "createdAt": now_iso,
        }
        await database.collection(REVIEWS_COLLECTION).insert_one(review_doc)

        # 1. Store under rider_reviews (rated by Partner)
        if rider_id and payload.riderRating:
            rider_review_doc = {
                "_id": f"rrv-p-{review_id}",
                "riderId": rider_id,
                "orderId": order_id,
                "orderCode": order.get("code", order_id),
                "authorRole": "partner",
                "authorName": store_name,
                "rating": payload.riderRating,
                "comment": payload.riderFeedback or "",
                "tags": payload.riderTags,
                "createdAt": now_iso,
            }
            await database.collection(RIDER_REVIEWS_COLLECTION).insert_one(rider_review_doc)
            await self._recalculate_rider_rating(rider_id)

        # 2. Store under customer_reviews (rated by Partner)
        if user_id and payload.customerRating:
            customer_review_doc = {
                "_id": f"crv-p-{review_id}",
                "userId": user_id,
                "orderId": order_id,
                "orderCode": order.get("code", order_id),
                "authorRole": "partner",
                "authorName": store_name,
                "rating": payload.customerRating,
                "comment": payload.customerFeedback or "",
                "tags": payload.customerTags,
                "createdAt": now_iso,
            }
            await database.collection(CUSTOMER_REVIEWS_COLLECTION).insert_one(customer_review_doc)
            await self._recalculate_customer_rating(user_id)

        # Update order document
        await database.collection("customer_orders").update_one(
            {"_id": order.get("_id")},
            {
                "$set": {
                    "partnerReviewed": True,
                    "partnerRiderRating": payload.riderRating,
                    "partnerCustomerRating": payload.customerRating,
                    "partnerReviewId": review_id,
                    "partnerReviewedAt": now_iso,
                }
            },
        )

        return review_doc

    async def submit_rider_review(
        self,
        order_id: str,
        rider_id: str,
        payload: SubmitRiderReviewPayload,
    ) -> Dict[str, Any]:
        """Captain (Rider) rates Customer + Partner Store."""
        order = await database.find_one("customer_orders", {"_id": order_id})
        if not order:
            order = await database.find_one("customer_orders", {"id": order_id})
        if not order:
            from app.services.smart_2ride_engine import RIDES_COLLECTION
            ride = await database.find_one(RIDES_COLLECTION, {"_id": order_id})
            if ride:
                order_id = ride.get("orderId")
                order = await database.find_one("customer_orders", {"_id": order_id})

        if not order:
            now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            review_id = f"rev-rdr-{uuid.uuid4().hex[:10]}"
            review_doc = {
                "_id": review_id,
                "id": review_id,
                "orderId": order_id,
                "orderCode": order_id.upper(),
                "riderId": rider_id,
                "riderName": "QuickPress Captain",
                "sourceRole": "rider",
                "customerRating": payload.customerRating,
                "customerFeedback": payload.customerFeedback,
                "customerTags": payload.customerTags,
                "storeRating": payload.storeRating,
                "storeFeedback": payload.storeFeedback,
                "storeTags": payload.storeTags,
                "createdAt": now_iso,
            }
            await database.insert_one(REVIEWS_COLLECTION, review_doc)
            return review_doc

        ord_r_id = str(order.get("assignedRiderId") or order.get("riderId") or order.get("originalRiderId") or (order.get("rider") or {}).get("id") or "")

        if ord_r_id and ord_r_id != rider_id:
            # Check rides collection assignment
            ride_match = await database.find_one("rides", {"orderId": order.get("_id"), "riderId": rider_id})
            if not ride_match:
                raise PermissionError("You can only review orders where you were the assigned Captain")

        existing = await self.get_rider_review(order_id, rider_id)
        if existing:
            raise ValueError("Captain review has already been submitted for this order")

        partner_id = str(order.get("partnerId") or (order.get("partner") or {}).get("id") or (order.get("store") or {}).get("id") or "")
        user_id = str(order.get("userId") or (order.get("customer") or {}).get("id") or "")

        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        review_id = f"rev-rdr-{uuid.uuid4().hex[:10]}"

        rider_profile = await database.find_one(RIDER_PROFILES_COLLECTION, {"$or": [{"_id": rider_id}, {"riderId": rider_id}]}) or {}
        rider_name = rider_profile.get("fullName") or rider_profile.get("name") or "QuickPress Captain"

        review_doc = {
            "_id": review_id,
            "id": review_id,
            "orderId": order_id,
            "orderCode": order.get("code", order_id),
            "riderId": rider_id,
            "riderName": rider_name,
            "userId": user_id,
            "partnerId": partner_id if partner_id else None,
            "sourceRole": "rider",
            "customerRating": payload.customerRating,
            "customerFeedback": payload.customerFeedback,
            "customerTags": payload.customerTags,
            "storeRating": payload.storeRating,
            "storeFeedback": payload.storeFeedback,
            "storeTags": payload.storeTags,
            "createdAt": now_iso,
        }
        await database.collection(REVIEWS_COLLECTION).insert_one(review_doc)

        # 1. Store under customer_reviews (rated by Captain)
        if user_id and payload.customerRating:
            customer_review_doc = {
                "_id": f"crv-r-{review_id}",
                "userId": user_id,
                "orderId": order_id,
                "orderCode": order.get("code", order_id),
                "authorRole": "rider",
                "authorName": rider_name,
                "rating": payload.customerRating,
                "comment": payload.customerFeedback or "",
                "tags": payload.customerTags,
                "createdAt": now_iso,
            }
            await database.collection(CUSTOMER_REVIEWS_COLLECTION).insert_one(customer_review_doc)
            await self._recalculate_customer_rating(user_id)

        # 2. Store under partner_reviews (rated by Captain)
        if partner_id and payload.storeRating:
            partner_review_doc = {
                "_id": f"prv-r-{review_id}",
                "partnerId": partner_id,
                "orderId": order_id,
                "orderCode": order.get("code", order_id),
                "authorRole": "rider",
                "authorName": rider_name,
                "rating": payload.storeRating,
                "comment": payload.storeFeedback or "",
                "tags": payload.storeTags,
                "createdAt": now_iso,
            }
            await database.collection(PARTNER_REVIEWS_COLLECTION).insert_one(partner_review_doc)
            await self._recalculate_partner_rating(partner_id)

        # Update order document
        await database.collection("customer_orders").update_one(
            {"_id": order.get("_id")},
            {
                "$set": {
                    "riderReviewed": True,
                    "riderCustomerRating": payload.customerRating,
                    "riderStoreRating": payload.storeRating,
                    "riderReviewId": review_id,
                    "riderReviewedAt": now_iso,
                }
            },
        )

        return review_doc

    async def get_360_reviews_by_order(self, order_id: str) -> Dict[str, Any]:
        """Returns the full 360-degree mutual reviews exchanged for a specific order."""
        reviews = await database.find_many(REVIEWS_COLLECTION, {"orderId": order_id})
        cust_rev = next((r for r in reviews if r.get("sourceRole") == "customer"), None)
        part_rev = next((r for r in reviews if r.get("sourceRole") == "partner"), None)
        rdr_rev = next((r for r in reviews if r.get("sourceRole") == "rider"), None)

        return {
            "orderId": order_id,
            "hasCustomerReview": bool(cust_rev),
            "hasPartnerReview": bool(part_rev),
            "hasRiderReview": bool(rdr_rev),
            "customerReview": cust_rev,
            "partnerReview": part_rev,
            "riderReview": rdr_rev,
            "mutualRatings": {
                "customerGaveStore": cust_rev.get("storeRating") if cust_rev else None,
                "customerGaveRider": cust_rev.get("riderRating") if cust_rev else None,
                "partnerGaveRider": part_rev.get("riderRating") if part_rev else None,
                "partnerGaveCustomer": part_rev.get("customerRating") if part_rev else None,
                "riderGaveCustomer": rdr_rev.get("customerRating") if rdr_rev else None,
                "riderGaveStore": rdr_rev.get("storeRating") if rdr_rev else None,
            },
        }

    async def _recalculate_partner_rating(self, partner_id: str) -> None:
        """Recalculate partner aggregate rating from customer & rider reviews in real time."""
        try:
            reviews = await database.find_many(PARTNER_REVIEWS_COLLECTION, {"partnerId": partner_id})
            if not reviews:
                return

            total_rating = sum(float(r.get("rating", 5)) for r in reviews)
            count = len(reviews)
            avg_rating = round(total_rating / count, 1)

            cust_reviews = [r for r in reviews if r.get("authorRole") != "rider"]
            cust_avg = round(sum(float(r.get("rating", 5)) for r in cust_reviews) / max(len(cust_reviews), 1), 1)

            rider_reviews = [r for r in reviews if r.get("authorRole") == "rider"]
            rider_avg = round(sum(float(r.get("rating", 5)) for r in rider_reviews) / max(len(rider_reviews), 1), 1) if rider_reviews else avg_rating

            breakdown = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            for r in reviews:
                star = int(r.get("rating", 5))
                if 1 <= star <= 5:
                    breakdown[star] += 1

            await database.collection(PARTNER_PROFILES_COLLECTION).update_many(
                {"$or": [{"_id": partner_id}, {"partnerId": partner_id}]},
                {
                    "$set": {
                        "rating": avg_rating,
                        "customerRating": cust_avg,
                        "riderRating": rider_avg,
                        "reviewsCount": count,
                        "ratingBreakdown": breakdown,
                    }
                },
            )
            logger.info("Partner %s rating updated: overall=%.1f (cust=%.1f, rider=%.1f) from %d reviews", partner_id, avg_rating, cust_avg, rider_avg, count)
        except Exception as exc:
            logger.exception("Failed to recalculate partner rating for %s: %s", partner_id, exc)

    async def _recalculate_rider_rating(self, rider_id: str) -> None:
        """Recalculate rider aggregate rating from customer & partner reviews in real time."""
        try:
            reviews = await database.find_many(RIDER_REVIEWS_COLLECTION, {"riderId": rider_id})
            if not reviews:
                return

            total_rating = sum(float(r.get("rating", 5)) for r in reviews)
            count = len(reviews)
            avg_rating = round(total_rating / count, 1)

            cust_reviews = [r for r in reviews if r.get("authorRole") != "partner"]
            cust_avg = round(sum(float(r.get("rating", 5)) for r in cust_reviews) / max(len(cust_reviews), 1), 1)

            partner_reviews = [r for r in reviews if r.get("authorRole") == "partner"]
            partner_avg = round(sum(float(r.get("rating", 5)) for r in partner_reviews) / max(len(partner_reviews), 1), 1) if partner_reviews else avg_rating

            await database.collection(RIDER_PROFILES_COLLECTION).update_many(
                {"$or": [{"_id": rider_id}, {"riderId": rider_id}, {"userId": rider_id}]},
                {
                    "$set": {
                        "rating": avg_rating,
                        "customerRating": cust_avg,
                        "partnerRating": partner_avg,
                        "ratingCount": count,
                        "totalReviews": count,
                    }
                },
            )
            logger.info("Rider %s rating updated: overall=%.1f (cust=%.1f, partner=%.1f) from %d reviews", rider_id, avg_rating, cust_avg, partner_avg, count)
        except Exception as exc:
            logger.exception("Failed to recalculate rider rating for %s: %s", rider_id, exc)

    async def _recalculate_customer_rating(self, user_id: str) -> None:
        """Recalculate customer aggregate rating from captain & partner reviews in real time."""
        try:
            reviews = await database.find_many(CUSTOMER_REVIEWS_COLLECTION, {"userId": user_id})
            if not reviews:
                return

            total_rating = sum(float(r.get("rating", 5)) for r in reviews)
            count = len(reviews)
            avg_rating = round(total_rating / count, 1)

            await database.collection(USERS_COLLECTION).update_many(
                {"$or": [{"_id": user_id}, {"id": user_id}]},
                {
                    "$set": {
                        "rating": avg_rating,
                        "reviewsCount": count,
                        "totalReviews": count,
                    }
                },
            )
            logger.info("Customer %s rating updated: %.1f from %d reviews", user_id, avg_rating, count)
        except Exception as exc:
            logger.exception("Failed to recalculate customer rating for %s: %s", user_id, exc)

    async def list_partner_reviews(self, partner_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        docs = await database.find_many(PARTNER_REVIEWS_COLLECTION, {"partnerId": partner_id})
        docs.sort(key=lambda d: d.get("createdAt", ""), reverse=True)
        return docs[:limit]

    async def list_rider_reviews(self, rider_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        docs = await database.find_many(RIDER_REVIEWS_COLLECTION, {"riderId": rider_id})
        docs.sort(key=lambda d: d.get("createdAt", ""), reverse=True)
        return docs[:limit]

    async def list_customer_reviews(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        docs = await database.find_many(CUSTOMER_REVIEWS_COLLECTION, {"userId": user_id})
        docs.sort(key=lambda d: d.get("createdAt", ""), reverse=True)
        return docs[:limit]

    async def list_all_reviews(self, limit: int = 100) -> List[Dict[str, Any]]:
        docs = await database.find_many(REVIEWS_COLLECTION, {})
        docs.sort(key=lambda d: d.get("createdAt", ""), reverse=True)
        return docs[:limit]


review_repository = ReviewRepository()

