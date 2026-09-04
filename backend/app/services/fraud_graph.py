"""
RiskSentinel AI v2.0 -- Fraud Ring Network Graph Service
=========================================================
Analyzes connected transaction networks sharing IP addresses, Card BINs,
device fingerprints, and shipping addresses across velocity windows.
"""
from typing import Dict, List, Any
import aiosqlite


class FraudGraphService:
    """Fraud ring network analysis connecting transactions with shared entity attributes."""

    FRAUD_ATTRIBUTES = {
        "ip_address": "IP Address",
        "card_bin": "Card BIN",
        "device_fingerprint": "Device Fingerprint",
        "shipping_address": "Shipping Address",
    }

    def __init__(self, db, velocity_window_hours: int = 24):
        self.db = db
        self.velocity_window_hours = velocity_window_hours

    async def build_network_graph(self, current_tx: Dict[str, Any]) -> Dict[str, Any]:
        """Build node-link graph of related transactions based on shared attributes."""
        nodes: List[Dict[str, Any]] = []
        links: List[Dict[str, Any]] = []
        clusters: List[Dict[str, Any]] = []

        tx_id = str(current_tx.get("transaction_id", "current_tx"))
        user_id = str(current_tx.get("user_id", "unknown"))
        risk_score = float(current_tx.get("risk_score", 0.0))
        risk_category = str(current_tx.get("risk_category", "LOW_RISK"))

        # Current transaction node
        nodes.append({
            "id": tx_id,
            "label": f"{tx_id} ({user_id})",
            "type": "transaction",
            "is_current": True,
            "risk_score": risk_score,
            "risk_category": risk_category,
            "amount": float(current_tx.get("order_amount", current_tx.get("amount", 0.0))),
        })

        shared_ip = str(current_tx.get("ip_address", "") or "").strip()
        shared_bin = str(current_tx.get("card_bin", "") or "").strip()
        shared_fp = str(current_tx.get("device_fingerprint", "") or "").strip()
        shared_addr = str(current_tx.get("shipping_address", "") or "").strip()

        connected_tx_ids = set()
        blocked_count = 0

        # Query recent related transactions from SQLite
        async with aiosqlite.connect(self.db.db_path) as conn:
            conn.row_factory = aiosqlite.Row
            query = """
                SELECT transaction_id, user_id, risk_score, risk_category, action_taken,
                       order_amount, ip_address, card_bin, device_fingerprint, shipping_address
                FROM risk_audit_log
                WHERE transaction_id != ? AND (
                    (ip_address != '' AND ip_address = ?) OR
                    (card_bin != '' AND card_bin = ?) OR
                    (device_fingerprint != '' AND device_fingerprint = ?) OR
                    (shipping_address != '' AND shipping_address = ?)
                )
                ORDER BY id DESC LIMIT 25
            """
            cursor = await conn.execute(query, (tx_id, shared_ip, shared_bin, shared_fp, shared_addr))
            rows = await cursor.fetchall()

            for row in rows:
                other_id = row["transaction_id"]
                if other_id in connected_tx_ids:
                    continue
                connected_tx_ids.add(other_id)

                is_blocked = row["risk_category"] == "HIGH_RISK" or row["action_taken"] in ("BLOCK_AND_REVIEW", "BLOCK")
                if is_blocked:
                    blocked_count += 1

                nodes.append({
                    "id": other_id,
                    "label": f"{other_id} ({row['user_id']})",
                    "type": "transaction",
                    "is_current": False,
                    "risk_score": float(row["risk_score"] or 0.0),
                    "risk_category": row["risk_category"] or "LOW_RISK",
                    "amount": float(row["order_amount"] or 0.0),
                })

                # Check shared attributes
                if shared_ip and row["ip_address"] == shared_ip:
                    links.append({"source": tx_id, "target": other_id, "attribute": "ip_address", "value": shared_ip})
                if shared_bin and row["card_bin"] == shared_bin:
                    links.append({"source": tx_id, "target": other_id, "attribute": "card_bin", "value": shared_bin})
                if shared_fp and row["device_fingerprint"] == shared_fp:
                    links.append({"source": tx_id, "target": other_id, "attribute": "device_fingerprint", "value": shared_fp})
                if shared_addr and row["shipping_address"] == shared_addr:
                    links.append({"source": tx_id, "target": other_id, "attribute": "shipping_address", "value": shared_addr})

        total_connections = len(connected_tx_ids)
        velocity_score = min(1.0, total_connections / 10.0)
        is_velocity_attack = total_connections >= 3 and blocked_count >= 1

        if total_connections >= 2:
            clusters.append({
                "id": "cluster_1",
                "members": [tx_id] + list(connected_tx_ids),
                "severity": "HIGH" if is_velocity_attack else "MEDIUM",
                "description": f"Shared identity attributes detected across {total_connections + 1} transactions.",
                "shared_attributes": [
                    {"attribute": k, "display": self.FRAUD_ATTRIBUTES[k], "value": current_tx.get(k)}
                    for k in ("ip_address", "card_bin", "device_fingerprint", "shipping_address")
                    if current_tx.get(k)
                ]
            })

        return {
            "nodes": nodes,
            "links": links,
            "clusters": clusters,
            "metadata": {
                "velocity_window_hours": self.velocity_window_hours,
                "total_connections": total_connections,
                "blocked_connections": blocked_count,
                "velocity_score": velocity_score,
                "is_velocity_attack": is_velocity_attack,
            }
        }
