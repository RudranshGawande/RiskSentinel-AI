"""
RiskSentinel AI v2.0 -- Analytics Router
==========================================
GET /api/analytics/summary           (KPI cards)
GET /api/analytics/risk-distribution (chart data)
GET /api/analytics/financial-impact  (FP/FN costs)
GET /api/analytics/timeline          (recent assessments)
"""
from fastapi import APIRouter, Request, Query

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/summary")
async def analytics_summary(request: Request):
    """KPI summary for the Command Center dashboard."""
    db = request.app.state.db
    return await db.get_analytics_summary()


@router.get("/risk-distribution")
async def risk_distribution(request: Request):
    """Category breakdown for pie/bar charts."""
    db = request.app.state.db
    return await db.get_risk_distribution()


@router.get("/financial-impact")
async def financial_impact(request: Request):
    """Estimated financial impact from risk decisions."""
    db = request.app.state.db
    cfg = request.app.state.settings
    return await db.get_financial_impact(cfg.FP_FRICTION_COST, cfg.FN_FRAUD_LOSS)


@router.get("/timeline")
async def recent_timeline(request: Request, limit: int = Query(50, ge=1, le=200)):
    """Time-series of recent risk assessments."""
    db = request.app.state.db
    return await db.get_recent_timeline(limit=limit)


@router.get("/cache-stats")
async def cache_stats(request: Request):
    """Cache hit/miss statistics."""
    cache = request.app.state.cache
    return cache.stats
