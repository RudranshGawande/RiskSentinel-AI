"""
RiskSentinel AI v2.0 -- Razorpay API Integration Service
==========================================================
Fetches live order telemetry, payment statuses, and notes from Razorpay API.
"""
import logging
import razorpay
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


class RazorpayService:
    """Async/Sync helper to query Razorpay API for live order & payment context."""

    def __init__(self, key_id: str = "", key_secret: str = ""):
        self.key_id = key_id
        self.key_secret = key_secret
        self.client = None
        if key_id and key_secret:
            try:
                self.client = razorpay.Client(auth=(key_id, key_secret))
                logger.info("RazorpayService initialized successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize Razorpay Client: {e}")

    def fetch_recent_orders(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Fetch recent orders from Razorpay API."""
        if not self.client:
            return []
        try:
            res = self.client.order.all({"count": limit})
            items = res.get("items", [])
            orders = []
            for item in items:
                orders.append({
                    "order_id": item.get("id"),
                    "amount_inr": (item.get("amount", 0) or 0) / 100.0,
                    "status": item.get("status"),
                    "attempts": item.get("attempts"),
                    "receipt": item.get("receipt"),
                    "notes": item.get("notes", {}),
                    "created_at": item.get("created_at"),
                })
            return orders
        except Exception as e:
            logger.error(f"Error fetching Razorpay orders: {e}")
            return []

    def fetch_order_by_tx_id(self, transaction_id: str) -> Optional[Dict[str, Any]]:
        """Search Razorpay orders matching transaction_id, receipt, or order_id."""
        if not self.client:
            return None
        # Check if direct order_id (e.g. order_TVbufK4TwAUgSy)
        if str(transaction_id).startswith("order_"):
            try:
                item = self.client.order.fetch(transaction_id)
                if item:
                    return {
                        "order_id": item.get("id"),
                        "amount_inr": (item.get("amount", 0) or 0) / 100.0,
                        "status": item.get("status"),
                        "attempts": item.get("attempts"),
                        "receipt": item.get("receipt"),
                        "notes": item.get("notes", {}),
                        "created_at": item.get("created_at"),
                    }
            except Exception:
                pass

        orders = self.fetch_recent_orders(limit=20)
        for order in orders:
            tx_id_note = order.get("notes", {}).get("transaction_id")
            receipt = order.get("receipt", "")
            if tx_id_note == transaction_id or receipt == f"receipt_{transaction_id}" or order.get("order_id") == transaction_id:
                return order
        return None
