"""FastAPI app entry point for the RiskSentinel backend."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from .services.ml_engine import MLEngine
from .services.cache import RiskCache
from .services.database import DatabaseManager
from .services.llm_agent import LLMAgent
from .routers import risk, evaluate, audit, analytics, copilot


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize app services once at startup and clean up on shutdown."""
    print("\n=== RiskSentinel AI v2.0 ===")
    print("Initializing services...")

    ml_engine = MLEngine(settings.ARTIFACTS_DIR)
    ml_engine.load_models()

    db = DatabaseManager(settings.DB_PATH)
    await db.init_db()
    print(f"  Database ready: {settings.DB_PATH}")

    cache = RiskCache(
        maxsize=settings.CACHE_MAX_SIZE,
        ttl=settings.CACHE_TTL_SECONDS,
    )
    print(f"  Cache ready: TTL={settings.CACHE_TTL_SECONDS}s, max={settings.CACHE_MAX_SIZE}")

    llm_agent = LLMAgent(
        api_key=settings.AIML_API_KEY,
        model_name=settings.LLM_MODEL_NAME,
    )

    from .services.razorpay_service import RazorpayService
    razorpay_service = RazorpayService(
        key_id=settings.RAZORPAY_KEY_ID,
        key_secret=settings.RAZORPAY_KEY_SECRET,
    )

    app.state.ml_engine = ml_engine
    app.state.db = db
    app.state.cache = cache
    app.state.llm_agent = llm_agent
    app.state.razorpay_service = razorpay_service
    app.state.settings = settings

    print("\nAll systems GO. Server ready.\n")
    yield
    print("\nRiskSentinel AI shutting down.")


app = FastAPI(
    title="RiskSentinel AI - Risk Management API",
    version="2.0",
    description="AI-powered fraud detection with XGBoost, Isolation Forest, and LLM threat intelligence.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "status": "ERROR",
            "message": "An internal error occurred. The risk engine has safely defaulted.",
            "detail": str(exc),
        },
    )


app.include_router(risk.router)
app.include_router(evaluate.router)
app.include_router(audit.router)
app.include_router(analytics.router)
app.include_router(copilot.router)


@app.get("/api/health", tags=["System"])
async def health_check():
    return {"status": "ok", "version": "2.0", "engine": "RiskSentinel AI"}
