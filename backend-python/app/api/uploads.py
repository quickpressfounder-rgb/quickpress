"""Media upload API — Cloudinary.

    POST /api/uploads/customer/photo    customer profile photo
    POST /api/uploads/partner/logo      partner shop logo
    POST /api/uploads/partner/banner    partner shop banner
    POST /api/uploads/rider/photo       rider profile photo

Every route requires a bearer token, uploads through Cloudinary and stores
only the returned `secure_url` in MongoDB (`users` + the role collection).
"""

from __future__ import annotations

import uuid
from fastapi import APIRouter, Depends, HTTPException

from app.core.cloudinary import upload_image
from app.core.deps import current_user, require_roles
from app.db.client import database
from app.db.repositories import users
from app.models.media import ImageUploadPayload, MediaResponse
from app.models.user import ROLE_COLLECTIONS, Role, User, utcnow

router = APIRouter(prefix="/uploads", tags=["uploads"])


async def _store_on_role_profile(user: User, field: str, url: str) -> None:
    collection = database.collection(ROLE_COLLECTIONS[user.role])
    if user.role == Role.partner:
        partner_id = getattr(user, "linked_partner_id", None) or getattr(user, "linked_id", None)
        if not partner_id:
            account = await database.find_one("partners", {"user_id": user.id}) or {}
            partner_id = account.get("partner_id") or account.get("partnerId")
        if not partner_id:
            pdoc = await database.find_one("partner_profiles", {"userId": user.id})
            if pdoc:
                partner_id = pdoc.get("_id") or pdoc.get("partnerId")

        updates: dict = {
            field: url,
            "updated_at": utcnow().isoformat(),
            "updatedAt": utcnow().isoformat(),
        }
        if field in ("logo_url", "logo"):
            updates["logo_url"] = url
            updates["logoUrl"] = url
            updates["logo"] = url
            updates["image"] = url
        elif field in ("banner_url", "banner"):
            updates["banner_url"] = url
            updates["bannerUrl"] = url
            updates["banner"] = url
            updates["cover"] = url
            updates["coverImage"] = url

        filter_query = {
            "$or": [
                {"user_id": user.id},
                {"userId": user.id},
                *([{"_id": str(partner_id)}] if partner_id else []),
                *([{"partnerId": str(partner_id)}] if partner_id else []),
            ]
        }
        try:
            await database.collection("partner_profiles").update_many(filter_query, {"$set": updates})
        except Exception:
            pass
        try:
            await database.collection("partners").update_many(filter_query, {"$set": updates})
        except Exception:
            pass
    else:
        await collection.update_one(
            {"user_id": user.id},
            {"$set": {field: url, "updated_at": utcnow().isoformat()}},
            upsert=True,
        )


async def _upload_avatar(user: User, payload: ImageUploadPayload, kind: str) -> MediaResponse:
    url = await upload_image(payload.image, kind=kind, public_id=user.id)
    await users.update(user.id, {"photo_url": url})
    await _store_on_role_profile(user, "photo_url", url)
    return MediaResponse(url=url, field="photoUrl")


@router.post("/customer/photo", response_model=MediaResponse)
async def upload_customer_photo(
    payload: ImageUploadPayload, user: User = Depends(require_roles(Role.customer))
) -> MediaResponse:
    return await _upload_avatar(user, payload, "customer_photo")


@router.post("/rider/photo", response_model=MediaResponse)
async def upload_rider_photo(
    payload: ImageUploadPayload, user: User = Depends(require_roles(Role.rider))
) -> MediaResponse:
    return await _upload_avatar(user, payload, "rider_photo")


@router.post("/rider/document")
async def upload_rider_document(payload: dict) -> dict:
    image_data = payload.get("image") or payload.get("file") or payload.get("dataUrl") or ""
    doc_type = payload.get("documentType") or payload.get("type") or "rider_doc"
    doc_id = payload.get("riderId") or f"doc-{uuid.uuid4().hex[:8]}"
    if not image_data:
        raise HTTPException(status_code=400, detail="Image data is required")

    url = await upload_image(image_data, kind=f"rider_{doc_type}", public_id=f"{doc_id}-{doc_type}")
    return {"ok": True, "url": url, "documentType": doc_type, "field": doc_type}


@router.post("/document")
async def upload_general_document(payload: dict) -> dict:
    image_data = payload.get("image") or payload.get("file") or payload.get("dataUrl") or ""
    doc_type = payload.get("documentType") or payload.get("type") or "general_doc"
    if not image_data:
        raise HTTPException(status_code=400, detail="Image data is required")

    url = await upload_image(image_data, kind=f"doc_{doc_type}", public_id=f"doc-{uuid.uuid4().hex[:8]}")
    return {"ok": True, "url": url, "documentType": doc_type, "field": doc_type}


@router.post("/partner/logo", response_model=MediaResponse)
async def upload_partner_logo(
    payload: ImageUploadPayload, user: User = Depends(require_roles(Role.partner))
) -> MediaResponse:
    url = await upload_image(payload.image, kind="partner_logo", public_id=f"{user.id}-logo")
    await _store_on_role_profile(user, "logo_url", url)
    await users.update(user.id, {"photo_url": url})
    return MediaResponse(url=url, field="logoUrl")


@router.post("/partner/banner", response_model=MediaResponse)
async def upload_partner_banner(
    payload: ImageUploadPayload, user: User = Depends(require_roles(Role.partner))
) -> MediaResponse:
    url = await upload_image(payload.image, kind="partner_banner", public_id=f"{user.id}-banner")
    await _store_on_role_profile(user, "banner_url", url)
    return MediaResponse(url=url, field="bannerUrl")


@router.post("/partner/service", response_model=MediaResponse)
async def upload_partner_service_image(
    payload: ImageUploadPayload, user: User = Depends(require_roles(Role.partner))
) -> MediaResponse:
    url = await upload_image(payload.image, kind="service_image", public_id=f"{user.id}-svc-{utcnow().timestamp():.0f}")
    return MediaResponse(url=url, field="image")


@router.post("/partner/gallery", response_model=MediaResponse)
async def upload_partner_gallery_image(
    payload: ImageUploadPayload, user: User = Depends(require_roles(Role.partner))
) -> MediaResponse:
    photo_uid = uuid.uuid4().hex[:8]
    url = await upload_image(payload.image, kind="partner_gallery", public_id=f"{user.id}-gallery-{photo_uid}")

    partner_id = getattr(user, "linked_partner_id", None) or getattr(user, "linked_id", None)
    if not partner_id:
        account = await database.find_one("partners", {"user_id": user.id}) or {}
        partner_id = account.get("partner_id") or account.get("partnerId")
    if not partner_id:
        pdoc = await database.find_one("partner_profiles", {"userId": user.id})
        if pdoc:
            partner_id = pdoc.get("_id") or pdoc.get("partnerId")

    filter_query = {
        "$or": [
            {"userId": user.id},
            {"user_id": user.id},
            *([{"_id": str(partner_id)}] if partner_id else []),
            *([{"partnerId": str(partner_id)}] if partner_id else []),
        ]
    }
    try:
        await database.collection("partner_profiles").update_many(
            filter_query,
            {"$push": {"gallery": url}, "$set": {"updatedAt": utcnow().isoformat()}}
        )
    except Exception:
        pass

    return MediaResponse(url=url, field="gallery")


@router.get("/health")
async def uploads_health(user: User = Depends(current_user)) -> dict:
    from app.core.cloudinary import is_cloudinary_configured

    return {"cloudinary": is_cloudinary_configured(), "role": user.role.value}


# --- Deletion (replace = re-upload, which overwrites the same public_id) -----


async def _remove(user: User, *, kind: str, public_id: str, field: str, db_field: str) -> MediaResponse:
    from app.core.cloudinary import delete_image

    await delete_image(kind=kind, public_id=public_id)
    if db_field == "photo_url":
        await users.update(user.id, {"photo_url": ""})
    await _store_on_role_profile(user, db_field, "")
    return MediaResponse(url="", field=field)


@router.delete("/customer/photo", response_model=MediaResponse)
async def delete_customer_photo(user: User = Depends(require_roles(Role.customer))) -> MediaResponse:
    return await _remove(user, kind="customer_photo", public_id=user.id, field="photoUrl", db_field="photo_url")


@router.delete("/rider/photo", response_model=MediaResponse)
async def delete_rider_photo(user: User = Depends(require_roles(Role.rider))) -> MediaResponse:
    return await _remove(user, kind="rider_photo", public_id=user.id, field="photoUrl", db_field="photo_url")


@router.delete("/partner/logo", response_model=MediaResponse)
async def delete_partner_logo(user: User = Depends(require_roles(Role.partner))) -> MediaResponse:
    return await _remove(user, kind="partner_logo", public_id=f"{user.id}-logo", field="logoUrl", db_field="logo_url")


@router.delete("/partner/banner", response_model=MediaResponse)
async def delete_partner_banner(user: User = Depends(require_roles(Role.partner))) -> MediaResponse:
    return await _remove(user, kind="partner_banner", public_id=f"{user.id}-banner", field="bannerUrl", db_field="banner_url")
