"""QuickPress FastAPI application — Sprint 1 (Auth) + Sprint 2.1 (Customer Home)."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.addresses import router as addresses_router
from app.api.health import router as health_router
from app.api.admin import router as admin_router
from app.api.admin_emails import router as admin_emails_router
from app.api.email_tracking import router as email_tracking_router
from app.api.email_templates_api import router as email_templates_router
from app.api.email_campaigns_api import router as email_campaigns_router
from app.api.admin_payments import router as admin_payments_router
from app.api.public import router as public_router
from app.api.availability import router as availability_router
from app.api.auth import router as auth_router
from app.api.cart import router as cart_router
from app.api.checkout import router as checkout_router
from app.api.commission import router as commission_router
from app.api.earnings import router as earnings_router
from app.api.financial import router as financial_router
from app.api.finance_engine import router as finance_engine_router
from app.api.help import router as help_router
from app.api.home import router as home_router
from app.api.invoices import router as invoices_router
from app.api.maps import router as maps_router
from app.api.membership import router as membership_router
from app.api.loyalty import router as loyalty_router
from app.api.notifications import router as notifications_router
from app.api.orders import router as orders_router
# Sprint 5.2: partner domain (orders, profile, services, wallet, reviews).
from app.api.partner import public_router as partner_public_router
from app.api.partner import router as partner_router
from app.api.partners import router as partners_router
from app.api.payments import router as payments_router
from app.api.profile import router as profile_router
from app.api.razorpay import router as razorpay_router
from app.api.referral import router as referral_router
from app.api.reviews import router as reviews_router
from app.api.rider import public_router as rider_public_router
from app.api.rider import router as rider_router
from app.api.services import router as services_router
from app.api.uploads import router as uploads_router
from app.api.wallet import router as wallet_router
from app.api.wallet_ledger import router as wallet_ledger_router
from app.api.webhooks import router as webhooks_router
from app.api.whatsapp_api import router as whatsapp_api_router
from app.config import get_settings
from app.db.availability_seed import AVAILABILITY_SEED
from app.db.client import database
from app.db.catalog_repositories import catalog
from app.db.cms_repositories import cms_repo
from app.db.membership_repositories import MEMBERSHIP_SEED
from app.db.service_content import SERVICE_CONTENT_SEED
from app.db.support_repositories import SUPPORT_SEED

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    # Strict startup order — every step must succeed before the next one runs:
    #   a. connect to MongoDB
    #   b/c/d. schema migrations: backfill canonical identity fields and replace
    #          legacy plain unique indexes with partial unique indexes
    #   e. verify the migrated indexes
    #   f. seeds + align_partner_identities()
    #   g. serve traffic
    await database.connect()
    report = await database.run_migrations()
    await database.verify_migrations()
    if report:
        logger.info("Identity index migrations complete: %s", report)
    await database.ensure_indexes()
    # Background Routine: Preserve Super Admin Access
    async def _run_startup_seeds() -> None:
        try:
            from app.core.admin_security import ensure_super_admin_seed
            await ensure_super_admin_seed()
            logger.info("Super Admin authentication initialized successfully.")
        except Exception as err:
            logger.warning("Startup routine warning: %s", err)

    # Start Background Order Timeline SLA Engine (5m Partner SLA / 2m Rider SLA)
    from app.services.order_timeline_engine import order_timeline_engine
    order_timeline_engine.start(interval_seconds=5)

    yield
    order_timeline_engine.stop()
    await database.disconnect()



def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="QuickPress API", version="1.0.0", lifespan=lifespan)
    from fastapi.middleware.gzip import GZipMiddleware
    from app.core.security_headers import SecurityHeadersMiddleware
    from app.core.rate_limiter import GlobalRateLimiterMiddleware
    from app.core.sanitizer import InputSanitizerMiddleware

    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(GlobalRateLimiterMiddleware)
    app.add_middleware(InputSanitizerMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=500)
    is_prod = (settings.app_env or "development").strip().lower() == "production"

    # Optional Sentry Threat & Error Monitoring
    if settings.sentry_dsn.strip():
        try:
            import sentry_sdk
            sentry_sdk.init(
                dsn=settings.sentry_dsn,
                traces_sample_rate=0.2,
                environment=settings.app_env,
            )
            logger.info("Sentry threat & error monitoring initialized.")
        except Exception as exc:
            logger.warning("Sentry monitoring init warning: %s", exc)

    if is_prod:
        # Strict Production CORS: Whitelist only verified QuickPress frontends
        prod_origins = list(settings.cors_origin_list)
        app.add_middleware(
            CORSMiddleware,
            allow_origins=prod_origins,
            allow_origin_regex=r"^https://([a-zA-Z0-9-]+\.)?(quickpress\.com|withquickpress\.com|quickpress\.online|quickpress\.in|vercel\.app)$",
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["*"],
            expose_headers=["*"],
        )
    else:
        # Development: Allow verified origins and local development hosts
        dev_origins = [
            "http://localhost:8080",
            "http://localhost:8081",
            "http://localhost:8082",
            "http://localhost:8083",
            "http://localhost:8084",
            "http://localhost:5173",
            "http://localhost:3000",
            "http://127.0.0.1:8080",
            "http://127.0.0.1:8081",
            "http://127.0.0.1:8082",
            "http://127.0.0.1:8083",
            "http://127.0.0.1:8084",
            "http://127.0.0.1:5173",
        ]
        allowed_origins = list(set(settings.cors_origin_list + dev_origins))
        app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
            expose_headers=["*"],
        )
    app.include_router(auth_router, prefix=settings.api_prefix)
    # Sprint 2.6: profile / photo / settings. Registered before the home router
    # so its richer GET /api/profile wins over the Home header projection.
    app.include_router(profile_router, prefix=settings.api_prefix)
    app.include_router(home_router, prefix=settings.api_prefix)
    # Registered after home so `/partners/nearby` keeps matching before `/partners/{id}`.
    app.include_router(partners_router, prefix=settings.api_prefix)
    # Sprint 2.3: service details + smart cart.
    app.include_router(services_router, prefix=settings.api_prefix)
    app.include_router(cart_router, prefix=settings.api_prefix)
    # Sprint 2.4: checkout, address book and order creation.
    app.include_router(checkout_router, prefix=settings.api_prefix)
    app.include_router(addresses_router, prefix=settings.api_prefix)
    app.include_router(orders_router, prefix=settings.api_prefix)
    # Sprint 2.12: availability engine, service areas and smart reorder history.
    app.include_router(availability_router, prefix=settings.api_prefix)
    # Sprint 2.7: notification engine.
    app.include_router(notifications_router, prefix=settings.api_prefix)
    # Sprint 2.8: referral & rewards system.
    app.include_router(referral_router, prefix=settings.api_prefix)
    # Sprint 2.9: membership plans, subscriptions and benefits.
    app.include_router(membership_router, prefix=settings.api_prefix)
    # Sprint 2.10: wallet, add funds, payment methods, payments and refunds.
    app.include_router(wallet_router, prefix=settings.api_prefix)
    # Sprint 2.15: Loyalty program (Scratch cards & points to wallet conversion)
    app.include_router(loyalty_router, prefix=settings.api_prefix)
    # Production integration: Cloudinary-backed media uploads.
    app.include_router(maps_router, prefix=settings.api_prefix)
    app.include_router(uploads_router, prefix=settings.api_prefix)
    app.include_router(payments_router, prefix=settings.api_prefix)
    # Sprint 2.11: GST invoices and the Help Center (FAQs + support tickets).
    app.include_router(invoices_router, prefix=settings.api_prefix)
    app.include_router(help_router, prefix=settings.api_prefix)
    app.include_router(reviews_router, prefix=settings.api_prefix)
    # Sprint 5.2: partner domain — dashboard, profile, orders, services, wallet.
    app.include_router(partner_public_router, prefix=settings.api_prefix)
    app.include_router(partner_router, prefix=settings.api_prefix)
    # Sprint 5.2: rider domain (dashboard, orders, wallet, notifications).
    app.include_router(rider_public_router, prefix=settings.api_prefix)
    app.include_router(rider_router, prefix=settings.api_prefix)
    # Sprint 5.2: admin domain — dashboard, orders, customers, partners, riders.
    app.include_router(admin_router, prefix=settings.api_prefix)
    # QuickPress Email Surveillance, Tracking, Template Studio & Campaigns
    app.include_router(email_templates_router, prefix=settings.api_prefix)
    app.include_router(email_campaigns_router, prefix=settings.api_prefix)
    app.include_router(email_tracking_router, prefix=settings.api_prefix)
    app.include_router(admin_emails_router, prefix=settings.api_prefix)
    # QuickPress WhatsApp Cloud API & Multi-Channel SMS Gateway
    app.include_router(whatsapp_api_router)
    # Sprint 5.6 (P0 #2): production payment rails. Registered AFTER the legacy
    # Sprint 2.10 routers so existing paths (/payments, /refunds, /wallet,
    # /partner/earnings, /rider/earnings) keep their current handlers; only the
    # gateway-specific paths below are added.
    app.include_router(razorpay_router, prefix=settings.api_prefix)
    app.include_router(wallet_ledger_router, prefix=settings.api_prefix)
    app.include_router(admin_payments_router, prefix=settings.api_prefix)
    app.include_router(earnings_router, prefix=settings.api_prefix)
    app.include_router(financial_router, prefix=settings.api_prefix)
    app.include_router(finance_engine_router, prefix=settings.api_prefix)
    # Razorpay server-to-server webhooks (HMAC verified, unauthenticated by design).
    app.include_router(webhooks_router, prefix=settings.api_prefix)

    # QuickPress Commission Engine across 3 apps (Customer, Partner, Rider, Admin).
    app.include_router(commission_router)

    # QuickPress Public Website routes.
    app.include_router(public_router, prefix=settings.api_prefix)

    # Health check + meta (countries list) mounted exactly once under /api.
    app.include_router(health_router, prefix=settings.api_prefix)  # → /api/health, /api/countries

    # Root health endpoint for probes → /health and /
    @app.get("/health", tags=["health"], summary="Health check (root)")
    @app.get("/", tags=["health"], summary="Root endpoint")
    async def root_health() -> dict:
        from app.api.health import health as get_health_status  # noqa: PLC0415
        return await get_health_status()

    from fastapi.responses import JSONResponse
    from fastapi.exceptions import RequestValidationError

    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        logger.exception("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
        origin = request.headers.get("origin") or "*"
        response = JSONResponse(
            status_code=500,
            content={"detail": f"Internal Server Error: {str(exc)}"},
        )
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request, exc):
        origin = request.headers.get("origin") or "*"
        response = JSONResponse(
            status_code=422,
            content={"detail": exc.errors()},
        )
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    return app


fastapi_app = create_app()

from app.services.socket_service import sio
import socketio

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="/socket.io")
