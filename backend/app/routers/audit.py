"""
RiskSentinel AI v2.0 -- Audit Trail Router
============================================
GET /api/audit          (paginated log)
GET /api/audit/{tx_id}  (single transaction detail)
"""
from fastapi import APIRouter, Request, Query

router = APIRouter(prefix="/api", tags=["Audit Trail"])


@router.get("/audit")
async def list_audit_logs(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    category: str | None = Query(None),
):
    """Paginated, filterable audit trail."""
    db = request.app.state.db
    return await db.get_audit_logs(page=page, limit=limit, category=category)


@router.get("/audit/{identifier}")
async def get_transaction_detail(identifier: str, request: Request):
    """Fetch full detail for a single transaction by ID or transaction_id."""
    db = request.app.state.db
    if identifier.isdigit():
        result = await db.get_transaction_by_id(int(identifier))
        if result is not None:
            return result
    result = await db.get_transaction(identifier)
    if result is None:
        return {"status": "NOT_FOUND", "transaction_id": identifier}
    return result
