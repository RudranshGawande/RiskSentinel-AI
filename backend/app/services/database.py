import json
from pathlib import Path

import aiosqlite


class DatabaseManager:
    """Async wrapper around the SQLite audit trail."""

    def __init__(self, db_path: Path):
        self.db_path = str(db_path)

    async def init_db(self):
        """Create tables and indexes on startup."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS risk_audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    transaction_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    order_amount REAL NOT NULL,
                    risk_score REAL NOT NULL,
                    xgboost_score REAL NOT NULL DEFAULT 0,
                    anomaly_score REAL NOT NULL DEFAULT 0,
                    risk_category TEXT NOT NULL,
                    action_taken TEXT NOT NULL,
                    explanation TEXT NOT NULL,
                    shap_top_features TEXT DEFAULT '{}',
                    threat_report TEXT,
                    model_version TEXT DEFAULT 'v2.0-xgboost',
                    execution_time_ms REAL NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    account_age_days INTEGER DEFAULT 0,
                    total_transactions_user INTEGER DEFAULT 0,
                    avg_amount_user REAL DEFAULT 0.0,
                    shipping_distance_km REAL DEFAULT 0.0,
                    promo_used INTEGER DEFAULT 0,
                    avs_match INTEGER DEFAULT 0,
                    cvv_result INTEGER DEFAULT 0,
                    three_ds_flag INTEGER DEFAULT 0,
                    country TEXT DEFAULT 'IN',
                    bin_country TEXT DEFAULT 'IN',
                    channel TEXT DEFAULT 'web',
                    merchant_category TEXT DEFAULT 'electronics',
                    ip_address TEXT DEFAULT '',
                    card_bin TEXT DEFAULT '',
                    device_fingerprint TEXT DEFAULT '',
                    shipping_address TEXT DEFAULT '',
                    payment_method TEXT DEFAULT 'card',
                    vpa_handle TEXT DEFAULT '',
                    device_binding_verified INTEGER DEFAULT 1,
                    vpa_age_verified INTEGER DEFAULT 1
                )
            """)
            migration_columns = {
                "account_age_days": "INTEGER DEFAULT 0",
                "total_transactions_user": "INTEGER DEFAULT 0",
                "avg_amount_user": "REAL DEFAULT 0.0",
                "shipping_distance_km": "REAL DEFAULT 0.0",
                "promo_used": "INTEGER DEFAULT 0",
                "avs_match": "INTEGER DEFAULT 0",
                "cvv_result": "INTEGER DEFAULT 0",
                "three_ds_flag": "INTEGER DEFAULT 0",
                "country": "TEXT DEFAULT 'IN'",
                "bin_country": "TEXT DEFAULT 'IN'",
                "channel": "TEXT DEFAULT 'web'",
                "merchant_category": "TEXT DEFAULT 'electronics'",
                "ip_address": "TEXT DEFAULT ''",
                "card_bin": "TEXT DEFAULT ''",
                "device_fingerprint": "TEXT DEFAULT ''",
                "shipping_address": "TEXT DEFAULT ''",
                "payment_method": "TEXT DEFAULT 'card'",
                "vpa_handle": "TEXT DEFAULT ''",
                "device_binding_verified": "INTEGER DEFAULT 1",
                "vpa_age_verified": "INTEGER DEFAULT 1",
            }
            cursor = await db.execute("PRAGMA table_info(risk_audit_log)")
            existing_cols = {row[1] for row in await cursor.fetchall()}
            for col_name, col_def in migration_columns.items():
                if col_name not in existing_cols:
                    await db.execute(
                        f"ALTER TABLE risk_audit_log ADD COLUMN {col_name} {col_def}"
                    )

            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_tx_id
                ON risk_audit_log(transaction_id)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_risk_cat
                ON risk_audit_log(risk_category)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_user_id
                ON risk_audit_log(user_id)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_ip_address
                ON risk_audit_log(ip_address)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_card_bin
                ON risk_audit_log(card_bin)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_device_fingerprint
                ON risk_audit_log(device_fingerprint)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_shipping_address
                ON risk_audit_log(shipping_address)
            """)
            await db.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp
                ON risk_audit_log(timestamp)
            """)
            await db.commit()

    # ── Write ────────────────────────────────────────────

    async def log_assessment(self, **kwargs):
        """Insert a new audit row. Duplicates are allowed (same tx re-assessed)."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO risk_audit_log
                (transaction_id, user_id, order_amount, risk_score, xgboost_score,
                 anomaly_score, risk_category, action_taken, explanation,
                 shap_top_features, threat_report, execution_time_ms,
                 account_age_days, total_transactions_user, avg_amount_user,
                 shipping_distance_km, promo_used, avs_match, cvv_result,
                 three_ds_flag, country, bin_country, channel, merchant_category,
                 ip_address, card_bin, device_fingerprint, shipping_address,
                 payment_method, vpa_handle, device_binding_verified, vpa_age_verified)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                kwargs["transaction_id"],
                kwargs["user_id"],
                kwargs["order_amount"],
                kwargs["risk_score"],
                kwargs["xgboost_score"],
                kwargs["anomaly_score"],
                kwargs["risk_category"],
                kwargs["action_taken"],
                kwargs["explanation"],
                kwargs.get("shap_top_features", "{}"),
                kwargs.get("threat_report"),
                kwargs["execution_time_ms"],
                kwargs.get("account_age_days", 0),
                kwargs.get("total_transactions_user", 0),
                kwargs.get("avg_amount_user", 0.0),
                kwargs.get("shipping_distance_km", 0.0),
                kwargs.get("promo_used", 0),
                kwargs.get("avs_match", 0),
                kwargs.get("cvv_result", 0),
                kwargs.get("three_ds_flag", 0),
                kwargs.get("country", "IN"),
                kwargs.get("bin_country", "IN"),
                kwargs.get("channel", "web"),
                kwargs.get("merchant_category", "electronics"),
                kwargs.get("ip_address", ""),
                kwargs.get("card_bin", ""),
                kwargs.get("device_fingerprint", ""),
                kwargs.get("shipping_address", ""),
                kwargs.get("payment_method", "card"),
                kwargs.get("vpa_handle", ""),
                kwargs.get("device_binding_verified", 1),
                kwargs.get("vpa_age_verified", 1),
            ))
            await db.commit()

    # ── Read (single) ────────────────────────────────────

    async def get_transaction(self, transaction_id: str) -> dict | None:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM risk_audit_log WHERE transaction_id = ? "
                "ORDER BY id DESC LIMIT 1",
                (transaction_id,),
            )
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def get_transaction_by_id(self, record_id: int) -> dict | None:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM risk_audit_log WHERE id = ? LIMIT 1",
                (record_id,),
            )
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def get_user_history(self, user_id: str, limit: int = 10) -> list[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT * FROM risk_audit_log WHERE user_id = ? "
                "ORDER BY timestamp DESC LIMIT ?",
                (user_id, limit),
            )
            return [dict(r) for r in await cursor.fetchall()]

    # ── Read (paginated list) ────────────────────────────

    async def get_audit_logs(
        self, page: int = 1, limit: int = 25, category: str | None = None
    ) -> dict:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row

            where = ""
            params: list = []
            if category:
                where = "WHERE risk_category = ?"
                params.append(category)

            cursor = await db.execute(
                f"SELECT COUNT(*) as cnt FROM risk_audit_log {where}", params
            )
            total = (await cursor.fetchone())["cnt"]

            offset = (page - 1) * limit
            cursor = await db.execute(
                f"SELECT * FROM risk_audit_log {where} "
                f"ORDER BY timestamp DESC LIMIT ? OFFSET ?",
                params + [limit, offset],
            )
            rows = [dict(r) for r in await cursor.fetchall()]

            return {"total": total, "page": page, "limit": limit, "data": rows}

    async def search_transactions(self, query: str = "", limit: int = 10) -> list[dict]:
        """Search transactions by transaction_id or user_id prefix/contains, or return recent ones."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            q = (query or "").strip()
            if q:
                like_param = f"%{q}%"
                cursor = await db.execute(
                    "SELECT transaction_id, user_id, order_amount, risk_score, risk_category, timestamp "
                    "FROM risk_audit_log "
                    "WHERE transaction_id LIKE ? OR user_id LIKE ? "
                    "ORDER BY id DESC LIMIT ?",
                    (like_param, like_param, limit),
                )
            else:
                cursor = await db.execute(
                    "SELECT transaction_id, user_id, order_amount, risk_score, risk_category, timestamp "
                    "FROM risk_audit_log "
                    "ORDER BY id DESC LIMIT ?",
                    (limit,),
                )
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    # ── Analytics aggregations ───────────────────────────

    async def get_analytics_summary(self) -> dict:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT
                    COUNT(*) as total_transactions,
                    SUM(CASE WHEN action_taken = 'AUTO_APPROVE' OR risk_category = 'LOW_RISK' THEN 1 ELSE 0 END) as approved_count,
                    SUM(CASE WHEN action_taken IN ('REQUIRE_STEP_UP_AUTH', 'STEP_UP_AUTH') OR risk_category = 'MEDIUM_RISK' THEN 1 ELSE 0 END) as step_up_count,
                    SUM(CASE WHEN action_taken IN ('BLOCK_AND_REVIEW', 'BLOCK') OR risk_category = 'HIGH_RISK' THEN 1 ELSE 0 END) as blocked_count,
                    COALESCE(AVG(execution_time_ms), 0) as avg_latency_ms
                FROM risk_audit_log
            """)
            row = await cursor.fetchone()
            return dict(row) if row else {}

    async def get_risk_distribution(self) -> dict:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT
                    SUM(CASE WHEN risk_category = 'LOW_RISK' THEN 1 ELSE 0 END) as low_risk,
                    SUM(CASE WHEN risk_category = 'MEDIUM_RISK' THEN 1 ELSE 0 END) as medium_risk,
                    SUM(CASE WHEN risk_category = 'HIGH_RISK' THEN 1 ELSE 0 END) as high_risk
                FROM risk_audit_log
            """)
            row = await cursor.fetchone()
            return dict(row) if row else {}

    async def get_recent_timeline(self, limit: int = 50) -> list[dict]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT id, transaction_id, risk_score, risk_category,
                       action_taken, order_amount, execution_time_ms, timestamp
                FROM risk_audit_log
                ORDER BY id DESC
                LIMIT ?
            """, (limit,))
            return [dict(r) for r in await cursor.fetchall()]

    async def get_financial_impact(self, fp_cost: int, fn_loss: int) -> dict:
        """Estimate financial impact from audit trail decisions."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("""
                SELECT
                    SUM(CASE WHEN risk_category = 'LOW_RISK' THEN order_amount ELSE 0 END) as approved_volume,
                    SUM(CASE WHEN risk_category = 'HIGH_RISK' THEN order_amount ELSE 0 END) as blocked_volume,
                    COUNT(CASE WHEN risk_category = 'HIGH_RISK' THEN 1 END) as blocked_count,
                    COUNT(CASE WHEN risk_category = 'LOW_RISK' THEN 1 END) as approved_count,
                    COUNT(CASE WHEN risk_category = 'MEDIUM_RISK' THEN 1 END) as step_up_count
                FROM risk_audit_log
            """)
            row = dict(await cursor.fetchone())

            blocked = row.get("blocked_count") or 0
            return {
                "total_fp_cost": float(row.get("step_up_count", 0) or 0) * fp_cost * 0.1,
                "total_fn_cost": 0.0,
                "money_saved": float(row.get("blocked_volume") or 0),
                "total_financial_impact": float(blocked * fn_loss),
            }
