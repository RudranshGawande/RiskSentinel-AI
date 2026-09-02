# RiskSentinel AI v2.0

**AI-powered fraud detection platform with dual-model ML, agentic LLM threat intelligence, and a modern command-center frontend.**

---

## Overview

RiskSentinel AI is a production-grade risk management platform that combines supervised and unsupervised machine learning with an autonomous LLM investigator to detect, explain, and prevent payment fraud in real time.

### Key Capabilities

| Capability | Technology |
|------------|------------|
| **Supervised Fraud Detection** | XGBoost (200 estimators, max_depth=6, AUC-PR optimized) |
| **Unsupervised Anomaly Detection** | Isolation Forest (contamination=0.02, trained on normal transactions only) |
| **Explainable AI** | SHAP TreeExplainer (per-transaction feature attribution) |
| **Agentic Threat Intelligence** | LLM-powered investigator (AIML API / Claude 3 Opus) |
| **Real-time API** | Async FastAPI with caching, audit trail, and analytics |
| **Modern Frontend** | React 18 + Vite + Tailwind CSS + Recharts |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React + Vite)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │ Command     │  │ Transaction │  │ Risk Co-Pilot│  │ Design System   │    │
│  │ Center      │  │ Evaluator   │  │ (Chat)      │  │ (Tailwind)      │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────────┘    │
└─────────┼────────────────┼────────────────┼────────────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Async FastAPI)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐    │
│  │ /api/       │  │ /api/audit  │  │ /api/       │  │ /api/copilot/   │    │
│  │ assess-risk │  │ (paginated) │  │ analytics   │  │ chat            │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘    │
└─────────┼────────────────┼────────────────┼──────────────────┼─────────────┘
          │                │                │                  │
          ▼                ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SERVICES LAYER                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │ ML Engine    │ │ LLM Agent    │ │ TTL Cache    │ │ Async SQLite     │   │
│  │ (XGBoost +   │ │ (Threat      │ │ (cachetools) │ │ (aiosqlite)      │   │
│  │  Isolation    │ │  Intel +     │ │ 5-min TTL,   │ │ Audit Trail +    │   │
│  │  Forest)     │ │  Chat)       │ │ 10K entries  │ │ Analytics        │   │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │                ▲                ▲                  ▲
          ▼                │                │                  │
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ML PIPELINE (Offline)                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ preprocess  │→ │ train_       │→ │ train_       │→ │ evaluate       │  │
│  │ .py         │  │ xgboost.py   │  │ anomaly.py   │  │ .py            │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  └────────────────┘  │
│         │                │                │                │               │
│         ▼                ▼                ▼                ▼               │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ ARTIFACTS: xgboost_model.pkl, isolation_forest.pkl, preprocessor.pkl,│  │
│  │           shap_explainer.pkl, feature_names.json                    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
razorpay-risk-sentinel/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app factory, CORS, lifespan
│   │   ├── config.py                  # Pydantic Settings (env vars, paths, thresholds)
│   │   │
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── risk.py                # POST /api/assess-risk (core endpoint)
│   │   │   ├── audit.py               # GET /api/audit (paginated log viewer)
│   │   │   ├── analytics.py           # GET /api/analytics/* (dashboard data)
│   │   │   └── copilot.py             # POST /api/copilot/chat (LLM chat)
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── ml_engine.py           # XGBoost + IsolationForest dual-scoring + SHAP
│   │   │   ├── llm_agent.py           # Agentic LLM threat investigator
│   │   │   ├── cache.py               # TTL in-memory cache (cachetools)
│   │   │   ├── database.py            # Async SQLite (aiosqlite) manager
│   │   │   └── razorpay_service.py    # Razorpay Payment Gateway integration
│   │   │
│   │   └── models/
│   │       ├── __init__.py
│   │       └── schemas.py             # All Pydantic request/response models
│   │
│   ├── ml/
│   │   ├── preprocess.py              # Enhanced preprocessing + saves preprocessor.pkl
│   │   ├── train_xgboost.py           # XGBoost training with class weighting
│   │   ├── train_anomaly.py           # Isolation Forest on normal transactions
│   │   └── evaluate.py                # Unified eval: metrics, financial impact, SHAP
│   │
│   ├── artifacts/                     # All saved model files (gitignored)
│   │   ├── xgboost_model.pkl
│   │   ├── isolation_forest.pkl
│   │   ├── preprocessor.pkl
│   │   ├── shap_explainer.pkl
│   │   └── feature_names.json
│   │
│   ├── audit_trail.db                 # SQLite audit database (gitignored)
│   ├── requirements.txt               # Python dependencies
│   └── run.py                         # Uvicorn launcher script
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   │
│   └── src/
│       ├── main.jsx                   # React entry point
│       ├── App.jsx                    # Root component + routing
│       ├── index.css                  # Tailwind + custom design tokens
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   └── Sidebar.jsx        # Navigation sidebar with status
│       │   │
│       │   ├── transaction/
│       │   │   ├── TransactionForm.jsx    # Transaction submission form
│       │   │   ├── RiskResultCard.jsx     # Risk assessment result display
│       │   │   └── ThreatReportCard.jsx   # Rendered threat intel report
│       │   │
│       │   └── copilot/
│       │       └── TxContextInput.jsx     # Transaction ID search input
│       │
│       ├── pages/
│       │   ├── CommandCenter.jsx      # Main dashboard (KPIs, charts, live feed)
│       │   ├── TransactionEval.jsx    # Single transaction evaluator
│       │   └── CoPilot.jsx            # Risk Co-Pilot chat page
│       │
│       ├── context/
│       │   └── CopilotContext.jsx     # Chat state + API integration
│       │
│       └── lib/
│           ├── api.js                 # API client (fetch wrapper)
│           └── constants.js           # Colors, thresholds, helpers
│
├── .gitignore
├── transactions.csv                   # Sample training data
└── README.md                          # This file
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- AIML API key (for LLM features) — [Get one here](https://aimlapi.com/)

### 1. Clone & Setup Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env  # See Environment Variables below
# Edit .env with your keys
```

### 2. Train Models (First Run Only)

```bash
cd backend/ml

# 1. Preprocess data & save fitted preprocessor
python preprocess.py

# 2. Train XGBoost fraud classifier
python train_xgboost.py

# 3. Train Isolation Forest anomaly detector
python train_anomaly.py

# 4. Evaluate both models
python evaluate.py
```

This generates artifacts in `backend/artifacts/`:
- `xgboost_model.pkl` — Supervised fraud classifier
- `isolation_forest.pkl` — Unsupervised anomaly detector
- `preprocessor.pkl` — Fitted ColumnTransformer (StandardScaler + OneHotEncoder)
- `shap_explainer.pkl` — SHAP TreeExplainer for explanations
- `feature_names.json` — Feature metadata

### 3. Start Backend Server

```bash
cd backend
python run.py
# Server runs at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 4. Start Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
# Frontend runs at http://localhost:5173
```

---

## Environment Variables

Create `backend/.env` and `frontend/.env`:

### Backend (`backend/.env`)

```env
# Required for LLM features (get from https://aimlapi.com/)
AIML_API_KEY=your_aiml_api_key_here
LLM_MODEL_NAME=anthropic/claude-3-opus-20240229

# Razorpay API (test keys provided, replace for production)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Risk thresholds
LOW_RISK_CEILING=0.30
HIGH_RISK_FLOOR=0.75

# Financial impact costs (INR)
FP_FRICTION_COST=1500
FN_FRAUD_LOSS=4000

# Model weighting
XGBOOST_WEIGHT=0.7
ANOMALY_WEIGHT=0.3

# Cache settings
CACHE_TTL_SECONDS=300
CACHE_MAX_SIZE=10000

# Paths (auto-resolved if not set)
ARTIFACTS_DIR=../artifacts
DB_PATH=../audit_trail.db
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:8000
```

---

## API Endpoints

### Core Risk Assessment

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/assess-risk` | Assess a single transaction |
| `GET` | `/api/health` | Health check |

**Request (`/api/assess-risk`):**
```json
{
  "transaction_id": "TXN_123456",
  "user_id": "USR_789",
  "amount": 5000.00,
  "account_age_days": 45,
  "total_transactions_user": 12,
  "avg_amount_user": 1200.00,
  "shipping_distance_km": 150.0,
  "promo_used": 0,
  "avs_match": 1,
  "cvv_result": 1,
  "three_ds_flag": 1,
  "country": "IN",
  "bin_country": "IN",
  "channel": "web",
  "merchant_category": "electronics",
  "transaction_time": "2024-01-15T14:30:00Z"
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "transaction_id": "TXN_123456",
  "risk_score": 0.78,
  "risk_category": "HIGH_RISK",
  "action_taken": "BLOCK_AND_REVIEW",
  "xgboost_score": 0.82,
  "anomaly_score": 0.68,
  "shap_explanations": {
    "amount": 0.156,
    "account_age_days": -0.023,
    "avs_match": -0.089,
    "shipping_distance_km": 0.067
  },
  "threat_report": "### Risk Summary\nTransaction **TXN_123456**..."
}
```

### Audit & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/audit?page=1&limit=25&category=HIGH_RISK` | Paginated audit log |
| `GET` | `/api/audit/{transaction_id}` | Single transaction detail |
| `GET` | `/api/analytics/summary` | KPI summary (totals, averages) |
| `GET` | `/api/analytics/financial-impact` | FP/FN cost totals |
| `GET` | `/api/analytics/risk-distribution` | Risk category breakdown |
| `GET` | `/api/analytics/timeline?limit=50` | Time-series risk data |

### Co-Pilot Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/copilot/chat` | Conversational risk analysis |

**Request:**
```json
{
  "message": "Why was this transaction blocked?",
  "transaction_id": "TXN_123456"
}
```

**Response:**
```json
{
  "response": "Transaction **TXN_123456** was **blocked** for manual review..."
}
```

---

## Frontend Pages

### 1. Command Center (`/`)
- **KPI Cards**: Total assessed, approved, step-up auth, blocked, avg latency
- **Live Transaction Feed**: Real-time streaming with risk badges
- **Transaction Detail Panel**: Click any transaction for full analysis
- **Risk Drivers**: Animated SHAP bar charts with impact percentages
- **Threat Report**: AI-generated threat intelligence

### 2. Transaction Evaluator (`/evaluate`)
- **Interactive Form**: All transaction fields with smart defaults
- **Real-time Assessment**: Submits to `/api/assess-risk`
- **Result Visualization**: Dual-engine scores, risk gauge, SHAP breakdown
- **Action Recommendation**: Auto-approve / Step-up / Block

### 3. Risk Co-Pilot (`/copilot`)
- **Chat Interface**: Natural language Q&A with AI investigator
- **Transaction Context**: Attach Transaction ID for focused analysis
- **Razorpay Integration**: Live gateway telemetry (order status, receipts)
- **Quick Starters**: Pre-built questions about models and features

---

## ML Pipeline Details

### Preprocessing (`backend/ml/preprocess.py`)
- `ColumnTransformer` with `StandardScaler` (numeric) + `OneHotEncoder` (categorical)
- Handles all 5 merchant categories & 10 countries from dataset
- Persists fitted preprocessor to `preprocessor.pkl` for inference consistency
- Saves `feature_names.json` for SHAP interpretability

### XGBoost Training (`backend/ml/train_xgboost.py`)
- `XGBClassifier`: `n_estimators=200`, `max_depth=6`, `learning_rate=0.1`
- `scale_pos_weight` calculated from class imbalance (~13.3:1)
- `eval_metric='aucpr'` (optimized for imbalanced fraud detection)
- Saves SHAP `TreeExplainer` for exact (not approximate) explanations

### Isolation Forest (`backend/ml/train_anomaly.py`)
- Trained **only on non-fraud transactions** (learns "normal" behavior)
- `contamination=0.02` matching ~2.2% fraud rate
- Provides second opinion on zero-day fraud patterns

### Evaluation (`backend/ml/evaluate.py`)
- Classification metrics: Precision, Recall, F1, AUC-PR, AUC-ROC
- Financial impact: FP friction cost (₹1,500) vs FN fraud loss (₹4,000)
- SHAP summary plots saved for dashboard

---

## Risk Scoring Logic

```
Combined Risk Score = 0.7 × XGBoost_Probability + 0.3 × Anomaly_Score

Risk Category:
├── LOW_RISK      → score < 0.30  → AUTO_APPROVE
├── MEDIUM_RISK   → 0.30 ≤ score < 0.75  → REQUIRE_STEP_UP_AUTH
└── HIGH_RISK     → score ≥ 0.75  → BLOCK_AND_REVIEW
```

### 3-Tier Adaptive Authentication (Smart 3DS)
- **Low Risk (<30%)**: Frictionless auto-approval
- **Medium Risk (30-75%)**: Step-Up Authentication (3DS OTP challenge) — protects revenue while verifying cardholder
- **High Risk (≥75%)**: Blocked for manual review — prevents chargeback losses

---

## LLM Agent (RiskSentinel AI Investigator)

### Capabilities
- **Automatic Threat Reports**: Generated for HIGH_RISK transactions
- **Conversational Chat**: Answer questions about any transaction
- **Razorpay Telemetry**: Live gateway order status, receipts, amounts
- **Historical Context**: User's prior transaction patterns
- **SHAP-Driven Explanations**: Human-readable risk factor analysis

### White-Label Identity
- **Name**: "RiskSentinel AI Investigator"
- **Never references**: Claude, Anthropic, Google, OpenAI, GPT, Gemini
- **Never uses ML jargon**: No "SHAP", "XGBoost", "Isolation Forest"
- **Terminology**: "Pattern Recognition Engine", "Behavioral Anomaly Engine"

### Fallback Mode
If no `AIML_API_KEY` is configured, generates structured template reports from SHAP values — still fully functional without LLM.

---

## Caching & Performance

- **TTL Cache**: 5-minute TTL, 10,000 entry max (cachetools)
- **Cache Key**: Hash of feature vector (not transaction_id)
- **Cache Hit**: <1ms response
- **Model Loading**: Once at startup via FastAPI lifespan

---

## Database Schema (SQLite)

```sql
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT UNIQUE NOT NULL,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    risk_score REAL NOT NULL,
    risk_category TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    xgboost_score REAL,
    anomaly_score REAL,
    shap_top_features TEXT,      -- JSON string
    threat_report TEXT,
    model_version TEXT DEFAULT '2.0',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_risk ON audit_log(risk_category);
CREATE INDEX idx_audit_time ON audit_log(timestamp);
```

---

## Development

### Running Tests

```bash
# Backend smoke test
cd backend
python -c "from app.main import app; print('Import OK')"

# Frontend lint
cd frontend
npm run lint
```

### Code Style

- **Python**: Black formatting, type hints throughout
- **JavaScript/React**: ESLint + Prettier (via oxlint)
- **Git**: Conventional commits recommended

---

## Deployment Notes

### Production Checklist
- [ ] Rotate all secrets (`.env` files were in git history briefly)
- [ ] Set `AIML_API_KEY` and `RAZORPAY_KEY_*` in production environment
- [ ] Use PostgreSQL instead of SQLite for audit trail
- [ ] Add Redis for distributed caching
- [ ] Enable HTTPS / TLS termination
- [ ] Configure rate limiting on `/api/assess-risk`
- [ ] Set up monitoring (Prometheus/Grafana)
- [ ] Run models on GPU if available (XGBoost supports `gpu_hist`)

### Docker (Example)

```dockerfile
# Backend
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend
COPY backend/artifacts/ ./artifacts
EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Security

- **No secrets in repo**: `.env` files gitignored
- **Input validation**: Pydantic v2 schemas with graceful defaults
- **Error handling**: Structured JSON errors, no stack traces leaked
- **CORS**: Configured for known frontend origins
- **SQL injection**: Parameterized queries via aiosqlite

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgments

- **XGBoost** — Gradient boosting framework
- **SHAP** — Explainable AI
- **scikit-learn** — Isolation Forest
- **FastAPI** — Modern async web framework
- **AIML API** — LLM inference
- **Razorpay** — Payment gateway integration
- **React + Vite + Tailwind** — Frontend stack

---

## Support

- **Issues**: [GitHub Issues](https://github.com/RudranshGawande/RiskSentinel-AI/issues)
- **Documentation**: This README + `/docs` endpoint when server running

**Built for hackathons, designed for production.**