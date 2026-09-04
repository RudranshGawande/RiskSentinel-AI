<div align="center">

# 🛡️ RiskSentinel AI v2.0

### **AI-Powered Real-Time Fraud Detection & Adaptive Authentication Platform**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Async-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_19-Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![XGBoost](https://img.shields.io/badge/XGBoost-Dual_ML-FF6F00?style=for-the-badge&logo=xgboost&logoColor=white)](https://xgboost.readthedocs.io)
[![Razorpay](https://img.shields.io/badge/Razorpay-Integrated-0C2451?style=for-the-badge&logo=razorpay&logoColor=white)](https://razorpay.com)
[![LLM](https://img.shields.io/badge/LLM-Agentic_AI-CC785C?style=for-the-badge&logo=anthropic&logoColor=white)](https://aimlapi.com)

---

**RiskSentinel AI** is an enterprise-grade fraud detection platform combining **dual-model Machine Learning**, an **Agentic LLM Investigator**, **Fraud Ring Network Analysis**, **UPI Risk Intelligence**, and **Live Razorpay Gateway Integration** into a real-time command dashboard.

[🚀 Quick Start](#-quick-start) · [🏗️ Architecture](#%EF%B8%8F-system-architecture) · [🧠 Core Features](#-core-features--innovations) · [🎨 Frontend](#-frontend-command-center)

</div>

---

## 📋 Table of Contents

- [🎯 Problem & Solution](#-problem--solution)
- [✨ Core Features & Innovations](#-core-features--innovations)
- [🏗️ System Architecture](#%EF%B8%8F-system-architecture)
- [🛠️ Tech Stack](#-tech-stack)
- [🧠 Fraud Detection Engine](#-fraud-detection-engine)
- [🤖 Agentic LLM Threat Investigator](#-agentic-llm-threat-investigator)
- [💳 Razorpay Payment Gateway Integration](#-razorpay-payment-gateway-integration)
- [🎨 Frontend Command Center](#-frontend-command-center)
- [📂 Project Structure](#-project-structure)
- [🚀 Quick Start](#-quick-start)
- [🔒 Security & Performance](#-security--performance)
- [👥 Team & License](#-team--license)

---

## 🎯 Problem & Solution

### ⚠️ The Challenge
- **$48B+ Global Loss**: Digital payment fraud costs merchants tens of billions annually.
- **India-Specific Fraud Vectors**: SIM swapping, device hijacking, velocity rings, and unverified VPAs exploit static rules.
- **High False Positives**: Legacy systems block legitimate buyers, causing high customer friction and lost revenue.

### 💡 The RiskSentinel Solution
- ⚡ **Sub-Second Decisions**: Real-time risk evaluation without introducing user checkout delay.
- 🧠 **Hybrid ML Architecture**: Combines supervised pattern learning with unsupervised zero-day anomaly detection.
- 🔍 **Explainable AI**: SHAP-driven feature attributions for transparent decision-making.
- 🇮🇳 **UPI Safeguards**: NPCI-compliant device binding and VPA age verification.
- 💳 **Razorpay Native**: Direct order creation with dynamic Smart 3DS routing.

---

## ✨ Core Features & Innovations

- 🧠 **Dual-Engine Machine Learning**:
  - Supervised **XGBoost** classifier trained on 200K+ transactions for known fraud patterns.
  - Unsupervised **Isolation Forest** detector to catch zero-day anomalies and unknown threats.
- 🔄 **Smart 3DS Adaptive Auth**:
  - **Low Risk (<30%)**: Frictionless auto-approval.
  - **Medium Risk (30–75%)**: Step-Up 3DS OTP challenge (recovers 15-25% lost revenue).
  - **High Risk (≥75%)**: Blocked to prevent chargeback losses.
- 🕸️ **Fraud Ring Radar**:
  - Graph-based clustering linking shared IPs, Device Fingerprints, Card BINs, and Addresses.
  - Real-time velocity attack detection.
- 🤖 **Autonomous LLM Threat Analyst**:
  - Automated threat dossier generation using **Claude 3 Opus**.
  - Natural language conversational Co-Pilot with live Razorpay order telemetry.
- 🇮🇳 **India-Specific UPI Intelligence**:
  - Risk boosting for failed SIM-device binding and newly created VPA handles.

---

## 🏗️ System Architecture

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19 + Vite + Tailwind CSS)                  │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Command      │  │ Transaction    │  │ Risk Co-Pilot│  │ Fraud Ring Radar   │  │
│  │ Center       │  │ Evaluator      │  │ (Chat)       │  │ (Network Graph)    │  │
│  └──────┬───────┘  └───────┬────────┘  └──────┬───────┘  └────────┬───────────┘  │
└─────────┼──────────────────┼──────────────────┼───────────────────┼───────────────┘
          │                  │                  │                   │
          ▼                  ▼                  ▼                   ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                       BACKEND (Async FastAPI + Uvicorn)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ Assess Risk  │  │ Audit Logs   │  │ Analytics    │  │ Co-Pilot Chat       │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────────┬──────────┘   │
└─────────┼──────────────────┼──────────────────┼───────────────────┼───────────────┘
          │                  │                  │                   │
          ▼                  ▼                  ▼                   ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           SERVICES LAYER                                          │
│  • ML Engine (XGBoost + Isolation Forest + SHAP)                                 │
│  • Risk Engine (3-Tier Adaptive Auth & Smart 3DS)                                │
│  • LLM Agent (Claude 3 Opus Threat Dossier Generator)                            │
│  • Fraud Graph Engine (Entity Clustering & Velocity Analysis)                    │
│  • Razorpay Integration Service (Order Creation & Telemetry)                     │
│  • Async SQLite Audit Database & TTL Cache                                       │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2, Async SQLite (`aiosqlite`)
- **Machine Learning**: XGBoost, scikit-learn (Isolation Forest), SHAP (TreeExplainer), Pandas, NumPy
- **AI Agent**: Claude 3 Opus via AIML API (OpenAI SDK wrapper with template fallbacks)
- **Payment Gateway**: Razorpay Python SDK (Test & Live Order Management)
- **Frontend**: React 19, Vite 8, Tailwind CSS, Recharts, Framer Motion, `react-force-graph-2d`, Lucide Icons

---

## 🧠 Fraud Detection Engine

- 🎯 **Supervised Pattern Engine (XGBoost)**:
  - 200 estimators, max depth 6, class-weighted for 2.2% fraud imbalance.
  - Outputs fraud probability $P(\text{fraud}) \in [0, 1]$.
- 🔮 **Unsupervised Anomaly Engine (Isolation Forest)**:
  - Contamination factor 0.02, trained on clean non-fraud transactions.
  - Sigmoid-normalized score detecting zero-day anomalies.
- ⚖️ **Combined Risk Scoring**:
  - $\text{Risk Score} = 0.7 \times \text{XGBoost Score} + 0.3 \times \text{Anomaly Score}$
- 🟢🟡🔴 **3-Tier Adaptive Auth (Smart 3DS)**:
  - **Low Risk (<30%)**: Frictionless checkout (`AUTO_APPROVE`).
  - **Medium Risk (30%–75%)**: Step-Up 3DS OTP challenge (`REQUIRE_STEP_UP_AUTH`).
  - **High Risk (≥75%)**: Blocked (`BLOCK_AND_REVIEW`).
- 🇮🇳 **UPI Intelligence Rules**:
  - Device Binding Failure: +35% risk boost.
  - VPA Handle Age < 30 Days: +20% risk boost.
  - High Amount (>₹25,000) with failed checks: +15% compound boost.
- 🕸️ **Fraud Ring Radar**:
  - Real-time graph clustering across IP, Card BIN, Device Fingerprint, and Address.
  - Interactive force-directed graph layout for visual network tracking.

---

## 🤖 Agentic LLM Threat Investigator

- 📑 **Autonomous Threat Reports**: Generated automatically for evaluated transactions with risk summaries, key indicators, and recommendations.
- 💬 **Interactive Co-Pilot**: Conversational AI assistant supporting context-aware transaction queries.
- 🏷️ **White-Label Persona**: Operates as "RiskSentinel AI Investigator" with non-technical business terminology.
- 🛡️ **Fail-Safe Fallbacks**: Dynamic template engine activates seamlessly if API keys are missing or offline.

---

## 💳 Razorpay Payment Gateway Integration

- 🚀 **Dynamic Order Generation**: Creates official Razorpay orders with customized 3DS flags based on risk evaluation.
- 📝 **Metadata Tracking**: Embeds risk scores, decision strategies, and transaction IDs directly into Razorpay order notes.
- 🔄 **Live Sync**: Pulls gateway order telemetry directly into the Co-Pilot investigation feed.

---

## 🎨 Frontend Command Center

- 📊 **Command Center Dashboard (`/`)**:
  - Real-time KPI summary counters (Total, Approved, Step-Up, Blocked).
  - Live transaction stream with risk badge indicators.
  - Interactive detail panel with SHAP bar charts and AI threat reports.
- 🎯 **Transaction Evaluator (`/evaluate`)**:
  - Interactive simulator for testing Card and UPI transactions.
  - Real-time gauge meters, SHAP breakdown, and force-directed fraud ring radar.
- 🤖 **Risk Co-Pilot (`/copilot`)**:
  - Chat interface for investigating transaction context and querying Razorpay order statuses.

---

## 📂 Project Structure

- 📂 `backend/`: Core FastAPI server, router modules, and risk engine services.
  - 📂 `app/routers/`: Endpoint handlers for risk assessment, analytics, audit, and copilot chat.
  - 📂 `app/services/`: ML engine, risk engine, LLM agent, fraud graph, and Razorpay client.
  - 📂 `ml/`: Model training and evaluation scripts (`preprocess.py`, `train_xgboost.py`, etc.).
  - 📂 `artifacts/`: Serialized model binaries (`xgboost_model.pkl`, `isolation_forest.pkl`, etc.).
- 📂 `frontend/`: React 19 + Vite dashboard application.
  - 📂 `src/components/`: Modular UI widgets (dashboard panels, transaction cards, copilot inputs).
  - 📂 `src/pages/`: Command Center, Transaction Evaluator, and CoPilot chat views.
- 📄 `start.py`: One-command launcher script to run both backend and frontend concurrently.
- 📄 `requirements.txt`: Python package dependencies.
- 📄 `.gitignore`: Optimized exclusion rules for virtual environments, caches, and databases.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Python**: 3.11 or higher
- **Node.js**: 18.0 or higher (with npm)

### 2. Environment Setup
```bash
# Clone repository
git clone https://github.com/RudranshGawande/RiskSentinel-AI.git
cd razorpay-risk-sentinel

# Configure backend environment
cp backend/.env.example backend/.env
```

### 3. Run Application (One Command)
```bash
# Install dependencies & launch both servers
python start.py
```

- 📡 **Backend API**: `http://localhost:8000`
- 🖥️ **Frontend Dashboard**: `http://localhost:5173`
- 📖 **Interactive API Docs**: `http://localhost:8000/docs`

---

## 🔒 Security & Performance

- 🛡️ **Zero Secret Leakage**: Environment variables and database files excluded via `.gitignore`.
- ⚡ **Sub-Second Latency**: TTL in-memory caching (`cachetools`) delivering <1ms responses for cached vectors.
- 🔐 **Safe SQL Queries**: Asynchronous parameterized queries (`aiosqlite`) preventing SQL injection.
- 📈 **Graceful Failover**: Seamless fallback mechanisms if LLM endpoints are unreachable.

---

## 👥 Team & License

- **Developer**: Rudransh Gawande
- **Repository**: [RiskSentinel-AI on GitHub](https://github.com/RudranshGawande/RiskSentinel-AI)
- **License**: MIT License

---

<div align="center">

**Built for hackathons. Designed for production. 🚀**

</div>