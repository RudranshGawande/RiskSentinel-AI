"""
RiskSentinel AI v2.0 -- Fraud Ring Network Graph Service
=========================================================
Graph theory based velocity analysis to detect coordinated carding attacks.
Identifies networks of different user_ids sharing critical fraud attributes
within a dynamic velocity time window.
"""
import json
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from ..services.database import DatabaseManager


class FraudGraphService:
    """Builds fraud ring network graphs by identifying shared attributes across transactions."""

    # Attributes that define fraud ring connections
    FRAUD_ATTRIBUTES = {
        "ip_address": "IP Address",
        "card_bin": "Card BIN",
        "device_fingerprint": "Device Fingerprint",
        "shipping_address": "Shipping Address",
    }

    def __init__(self, db: DatabaseManager, velocity_window_hours: int = 24):
        self.db = db
        self.velocity_window_hours = velocity_window_hours

    async def build_network_graph(
        self,
        current_tx: dict,
        max_historical: int = 50,
        min_shared_attrs_for_cluster: int = 3,
    ) -> dict:
        """
        Build a network graph showing connections between the current transaction
        and historical transactions sharing fraud attributes.

        Args:
            current_tx: Current transaction payload (must include fraud attributes)
            max_historical: Maximum historical transactions to analyze
            min_shared_attrs_for_cluster: Minimum shared attributes to form a cluster

        Returns:
            Graph structure: {nodes: [], links: [], clusters: []}
        """
        # Extract fraud attributes from current transaction
        current_attrs = self._extract_fraud_attributes(current_tx)
        if not any(current_attrs.values()):
            return {"nodes": [], "links": [], "clusters": [], "metadata": {"message": "No fraud attributes provided"}}

        # Query historical transactions within velocity window
        historical_txs = await self._fetch_historical_transactions(
            current_tx.get("user_id", ""),
            current_attrs,
            max_historical,
        )

        # Build nodes and links
        nodes = []
        links = []
        cluster_map = defaultdict(list)  # attribute_value -> [tx_ids]

        # Central node (current transaction)
        central_id = current_tx.get("transaction_id", f"current_{int(time.time())}")
        nodes.append({
            "id": central_id,
            "label": central_id,
            "group": "central",
            "size": 25,
            "risk_score": current_tx.get("risk_score", 0),
            "risk_category": current_tx.get("risk_category", "UNKNOWN"),
            "action_taken": current_tx.get("action_taken", "UNKNOWN"),
            "amount": current_tx.get("order_amount", current_tx.get("amount", 0)),
            "timestamp": current_tx.get("timestamp", datetime.now().isoformat()),
            "attributes": current_attrs,
        })

        # Process historical transactions
        historical_nodes = []
        for hist_tx in historical_txs:
            hist_id = hist_tx.get("transaction_id", f"hist_{hist_tx.get('id')}")
            shared_attrs = self._find_shared_attributes(current_attrs, hist_tx)

            if not shared_attrs:
                continue

            # Determine node group based on historical outcome
            group = self._determine_node_group(hist_tx)

            # Calculate correlation strength
            correlation_strength = len(shared_attrs)
            link_width = 1 + correlation_strength  # 2 for 1 attr, 3 for 2, etc.

            hist_node = {
                "id": hist_id,
                "label": hist_id,
                "group": group,
                "size": 12 + correlation_strength * 2,
                "risk_score": hist_tx.get("risk_score", 0),
                "risk_category": hist_tx.get("risk_category", "UNKNOWN"),
                "action_taken": hist_tx.get("action_taken", "UNKNOWN"),
                "amount": hist_tx.get("order_amount", 0),
                "timestamp": hist_tx.get("timestamp", ""),
                "shared_attributes": shared_attrs,
            }
            historical_nodes.append(hist_node)
            nodes.append(hist_node)

            # Create links for each shared attribute
            for attr_key, attr_value in shared_attrs:
                link_label = self.FRAUD_ATTRIBUTES.get(attr_key, attr_key.replace("_", " ").title())
                if attr_value:
                    link_label += f": {attr_value}"

                links.append({
                    "source": central_id,
                    "target": hist_id,
                    "label": link_label,
                    "width": link_width,
                    "attribute": attr_key,
                    "value": attr_value,
                    "correlation_strength": correlation_strength,
                })

                # Track for clustering
                cluster_key = f"{attr_key}:{attr_value}"
                cluster_map[cluster_key].append(hist_id)

        # Identify clusters (groups sharing 3+ attributes)
        clusters = self._identify_clusters(cluster_map, central_id, min_shared_attrs_for_cluster)

        # Add velocity metadata
        velocity_metadata = self._calculate_velocity_metadata(current_tx, historical_nodes)

        return {
            "nodes": nodes,
            "links": links,
            "clusters": clusters,
            "metadata": {
                "central_transaction_id": central_id,
                "velocity_window_hours": self.velocity_window_hours,
                "total_connections": len(historical_nodes),
                "unique_ips": len(set(n.get("attributes", {}).get("ip_address") for n in nodes if n.get("attributes", {}).get("ip_address"))),
                "unique_bins": len(set(n.get("attributes", {}).get("card_bin") for n in nodes if n.get("attributes", {}).get("card_bin"))),
                "velocity_score": velocity_metadata["velocity_score"],
                "is_velocity_attack": velocity_metadata["is_velocity_attack"],
                "blocked_connections": velocity_metadata["blocked_connections"],
            },
        }

    def _extract_fraud_attributes(self, tx: dict) -> dict:
        """Extract fraud-relevant attributes from transaction."""
        return {
            "ip_address": tx.get("ip_address") or tx.get("ip", ""),
            "card_bin": tx.get("card_bin") or tx.get("bin", ""),
            "device_fingerprint": tx.get("device_fingerprint") or tx.get("device_id", ""),
            "shipping_address": tx.get("shipping_address") or tx.get("ship_address", ""),
        }

    async def _fetch_historical_transactions(
        self,
        current_user_id: str,
        current_attrs: dict,
        limit: int,
    ) -> list[dict]:
        """Fetch historical transactions sharing any fraud attribute within velocity window."""
        # Build WHERE clause for shared attributes
        conditions = []
        params = []

        cutoff_time = datetime.now() - timedelta(hours=self.velocity_window_hours)
        conditions.append("timestamp >= ?")
        params.append(cutoff_time.isoformat())

        # Exclude current user's own transactions to find cross-user rings
        if current_user_id:
            conditions.append("user_id != ?")
            params.append(current_user_id)

        # Add attribute matching conditions
        attr_conditions = []
        for attr_key, attr_value in current_attrs.items():
            if attr_value:
                # Map attribute keys to database columns
                db_col = self._map_attribute_to_column(attr_key)
                if db_col:
                    attr_conditions.append(f"{db_col} = ?")
                    params.append(attr_value)

        if attr_conditions:
            conditions.append(f"({' OR '.join(attr_conditions)})")

        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        params.append(limit)

        query = f"""
            SELECT * FROM risk_audit_log
            {where_clause}
            ORDER BY timestamp DESC
            LIMIT ?
        """

        async with self.db._get_connection() as conn:
            conn.row_factory = self.db._row_factory
            cursor = await conn.execute(query, params)
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    def _map_attribute_to_column(self, attr_key: str) -> str | None:
        """Map fraud attribute keys to database column names."""
        mapping = {
            "ip_address": "ip_address",
            "card_bin": "card_bin",
            "device_fingerprint": "device_fingerprint",
            "shipping_address": "shipping_address",
        }
        return mapping.get(attr_key)

    def _find_shared_attributes(self, current_attrs: dict, hist_tx: dict) -> list[tuple[str, str]]:
        """Find which attributes are shared between current and historical transaction."""
        shared = []
        hist_attrs = self._extract_fraud_attributes(hist_tx)

        for attr_key, current_value in current_attrs.items():
            if current_value and hist_attrs.get(attr_key) == current_value:
                shared.append((attr_key, current_value))

        return shared

    def _determine_node_group(self, hist_tx: dict) -> str:
        """Determine node group based on historical transaction outcome."""
        action = hist_tx.get("action_taken", "").upper()
        category = hist_tx.get("risk_category", "").upper()

        if action in ("BLOCK_AND_REVIEW", "BLOCK") or category == "HIGH_RISK":
            return "blocked"
        elif action in ("REQUIRE_STEP_UP_AUTH", "STEP_UP_AUTH") or category == "MEDIUM_RISK":
            return "step_up"
        else:
            return "approved"

    def _identify_clusters(
        self,
        cluster_map: dict[str, list[str]],
        central_id: str,
        min_shared_attrs: int,
    ) -> list[dict]:
        """Identify distinct fraud clusters from shared attribute groups."""
        clusters = []

        # Group transactions by number of shared attributes
        tx_shared_count = defaultdict(int)
        for attr_key, tx_ids in cluster_map.items():
            for tx_id in tx_ids:
                tx_shared_count[tx_id] += 1

        # Find transactions sharing min_shared_attrs+ attributes
        cluster_members = [
            tx_id for tx_id, count in tx_shared_count.items()
            if count >= min_shared_attrs
        ]

        if cluster_members:
            # Get the shared attributes for this cluster
            shared_attrs = []
            for attr_key, tx_ids in cluster_map.items():
                if any(tx_id in cluster_members for tx_id in tx_ids):
                    attr_name = self.FRAUD_ATTRIBUTES.get(
                        attr_key.split(":")[0],
                        attr_key.split(":")[0].replace("_", " ").title()
                    )
                    shared_attrs.append({
                        "attribute": attr_key.split(":")[0],
                        "value": attr_key.split(":")[1] if ":" in attr_key else "",
                        "display": attr_name,
                    })

            clusters.append({
                "id": f"cluster_{len(clusters) + 1}",
                "central_node": central_id,
                "members": cluster_members,
                "shared_attributes": shared_attrs,
                "severity": "HIGH" if len(cluster_members) >= 5 else "MEDIUM",
                "description": f"Fraud ring detected: {len(cluster_members)} transactions sharing {len(shared_attrs)} attributes",
            })

        return clusters

    def _calculate_velocity_metadata(self, current_tx: dict, historical_nodes: list[dict]) -> dict:
        """Calculate velocity attack indicators."""
        if not historical_nodes:
            return {"velocity_score": 0, "is_velocity_attack": False, "blocked_connections": 0}

        # Count transactions in last hour vs last 24 hours
        now = datetime.now()
        last_hour = sum(
            1 for n in historical_nodes
            if n.get("timestamp") and (now - datetime.fromisoformat(n["timestamp"].replace("Z", "+00:00"))).total_seconds() < 3600
        )
        last_24h = len(historical_nodes)

        # Count blocked connections
        blocked = sum(1 for n in historical_nodes if n["group"] == "blocked")

        # Velocity score: higher = more suspicious
        velocity_score = min(1.0, (last_hour * 0.3) + (last_24h * 0.02) + (blocked * 0.15))
        is_velocity_attack = velocity_score > 0.6 or (last_hour >= 3 and blocked >= 2)

        return {
            "velocity_score": round(velocity_score, 2),
            "is_velocity_attack": is_velocity_attack,
            "blocked_connections": blocked,
            "last_hour_count": last_hour,
            "last_24h_count": last_24h,
        }


# Monkey-patch DatabaseManager to add connection helper
async def _get_connection(self):
    """Get a raw database connection for complex queries."""
    import aiosqlite
    conn = await aiosqlite.connect(self.db_path)
    conn.row_factory = aiosqlite.Row
    return conn


def _row_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


DatabaseManager._get_connection = _get_connection
DatabaseManager._row_factory = _row_factory