"""P0 regression — every authenticated /api/rider/* endpoint is rider-only.

Before this guard existed the rider router only depended on `current_user`
(authentication), so any signed-in customer, partner or admin could read rider
dashboards, orders, wallet and settings.

Policy (mirrors the admin router): the rider router allows Role.rider ONLY.
Admin oversight of riders lives under /api/admin/*, so admin is 403 here.

The pre-account onboarding endpoints (/api/rider/auth/*) stay public: they are
called before a rider user exists.
"""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.db.repositories import users as user_repository
from app.main import create_app
from app.models.user import Role, User, UserStatus

PUBLIC_RIDER_PATHS = {
    "/api/rider/auth/existing-numbers",
    "/api/rider/auth/registration",
    "/api/rider/onboarding/status",
    "/api/rider/surge/zones",
    "/api/rider/surge/check-location",
    "/api/rider/commission/guarantee",
}


async def _make_user(role: Role) -> User:
    return await user_repository.create(
        User(
            id=str(uuid.uuid4()),
            firebase_uid=f"uid-{uuid.uuid4().hex[:8]}",
            role=role,
            phone=f"+9190{uuid.uuid4().int % 100_000_000:08d}",
            email=None,
            display_name=f"Test {role.value}",
            photo_url=None,
            status=UserStatus.active,
            is_verified=True,
            is_onboarded=True,
        )
    )


def _token(user: User) -> str:
    token, _ = create_access_token(user.id, user.role.value)
    return token


@pytest.fixture()
def client():
    with TestClient(create_app()) as test_client:
        yield test_client


def _rider_get_paths(client: TestClient) -> list[str]:
    spec = client.get("/openapi.json").json()
    return [
        path
        for path, operations in sorted(spec["paths"].items())
        if path.startswith("/api/rider")
        and "{" not in path
        and "get" in operations
        and path not in PUBLIC_RIDER_PATHS
    ]


def test_representative_rider_endpoints_are_discovered(client):
    paths = _rider_get_paths(client)
    for expected in (
        "/api/rider/dashboard",
        "/api/rider/orders",
        "/api/rider/profile",
        "/api/rider/wallet",
        "/api/rider/notifications",
        "/api/rider/settings",
        "/api/rider/history",
    ):
        assert expected in paths, f"{expected} missing from the rider router"


def test_every_rider_get_route_rejects_anonymous(client):
    for path in _rider_get_paths(client):
        assert client.get(path).status_code == 401, path


def test_every_rider_get_route_rejects_non_rider_roles(client):
    import anyio

    paths = _rider_get_paths(client)
    assert paths, "no rider routes discovered — the rider router is not mounted"

    # Admin is intentionally included: the project policy scopes each domain
    # router to its own role, admin oversight lives under /api/admin/*.
    for role in (Role.customer, Role.partner, Role.admin):
        user = anyio.run(_make_user, role)
        headers = {"Authorization": f"Bearer {_token(user)}"}
        for path in paths:
            response = client.get(path, headers=headers)
            assert response.status_code == 403, f"{role.value} reached {path}"


def test_rider_write_endpoints_reject_non_rider_roles(client):
    import anyio

    write_paths = ["/api/rider/online", "/api/rider/location", "/api/rider/wallet/withdraw"]
    for role in (Role.customer, Role.partner, Role.admin):
        user = anyio.run(_make_user, role)
        headers = {"Authorization": f"Bearer {_token(user)}"}
        for path in write_paths:
            assert client.post(path, json={}, headers=headers).status_code == 403, path
            assert client.post(path, json={}).status_code == 401, path


def test_rider_role_is_not_blocked_by_the_guard(client):
    import anyio

    rider = anyio.run(_make_user, Role.rider)
    headers = {"Authorization": f"Bearer {_token(rider)}"}
    for path in _rider_get_paths(client):
        response = client.get(path, headers=headers)
        # A rider may still get 403 from business logic (no rider profile linked
        # to this brand-new user); what must never happen is the role guard
        # ("Forbidden") rejecting a genuine rider.
        if response.status_code == 403:
            assert response.json().get("detail") != "Forbidden", path


def test_public_rider_onboarding_endpoints_stay_public(client):
    assert client.get("/api/rider/auth/existing-numbers").status_code == 200
    assert client.post("/api/rider/auth/registration", json={"payload": {}}).status_code == 200
