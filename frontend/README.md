# 🛡️ RiskSentinel AI v2.0 — Command Center

---

## 📖 Table of Contents
1. [Project Overview](#project-overview)
2. [Problem Statement](#problem-statement)
3. [How It Works](#how-it-works)
4. [System Architecture](#system-architecture)
5. [Risk Tier Definitions](#risk-tier-definitions)
6. [Mitigation Strategies per Tier](#mitigation-strategies-per-tier)
7. [Getting Started & Running the Project](#getting-started--running-the-project)
8. [Future Roadmap & Improvements](#future-roadmap--improvements)
9. [User Prompt (the request that generated this README)](#user-prompt)

---

## 🎯 Project Overview
RiskSentinel AI is a **production‑grade, end‑to‑end fraud‑prevention platform** built for e‑commerce merchants. It combines:
- A **dual‑model ML engine** (supervised XGBoost + unsupervised Isolation Forest) to score every incoming payment transaction.
- An **interpretability layer** that turns raw SHAP values into plain‑English risk drivers.
- An **agentic LLM “RiskSentinel AI Investigator”** (white‑labeled, never mentions external model names) that generates threat‑intelligence reports.
- A **premium React + Vite UI** (dark‑theme, glassmorphism, micro‑animations) that visualises live risk scores, audit logs, and actionable buttons.

The system runs locally as two services: the FastAPI backend and the Vite React frontend. It needs an AIML API key for LLM-powered reports.

---

## ❓ Problem Statement
E‑commerce merchants constantly balance **security vs. friction**. Traditional fraud tools either:
- Produce cryptic ML scores that business owners cannot act on, **or**
- Block too many legitimate transactions, hurting revenue.

RiskSentinel solves both by:
1. Providing a **single risk score** derived from two complementary models.
2. Translating that score into **business‑friendly language** (e.g., “Large amount for a first‑time buyer from a high‑risk country”).
3. Offering **tiered responses** (auto‑approve, Smart 3DS step‑up, block & review) that keep the checkout experience smooth while protecting against fraud.

---

## ⚙️ How It Works
1. **Transaction arrives** → FastAPI endpoint `/api/assess-risk` receives the JSON payload.
2. **Cache check** (TTL in‑memory `cachetools`). If a recent identical payload exists, we return the cached result (< 1 ms).
3. **Feature preparation** using the persisted `preprocessor.pkl`.
4. **Dual‑engine scoring**:
   - **XGBoost** gives a supervised fraud probability.
   - **Isolation Forest** flags anomalous behaviour never seen before.
5. **Weighted combination** (`0.7 * XGBoost + 0.3 * Isolation Forest`).
6. **Risk tier gating** (see section below) decides the action.
7. **Explainability** – SHAP values are mapped to **human‑readable risk drivers**.
8. **LLM Report** – The white‑labeled LLM (Claude 3 Opus via AIML API) produces a threat report; if the API key is missing a template fallback is used.
9. **Audit log** – Async write to SQLite, exposed via `/api/audit`.
10. **Response** → UI updates in real time, showing badges and, for medium‑risk, a **Smart 3DS** button.

---

## 🏗️ System Architecture
```
[ Incoming Transaction Payload ]
            │
            ▼
[ FastAPI /api/assess-risk ]
            │
 ┌──────────┴───────────┐
 ▼                      ▼
[ Cache (TTL) ]   [ Feature Preprocess ]
      │                      │
      ├─► Hit (<1 ms) ──► Return   ▼
      │                           [ Dual‑Model Scoring ]
      └─► Miss ──► Continue ──►   • XGBoost (supervised)
                                   • Isolation Forest (unsupervised)
                                         │
                                         ▼
                               [ Weighted Risk Score ]
                                         │
           ┌─────────────────────────┼─────────────────────────┐
           │                         │                         │
   Risk < 0.30   0.30 ≤ Risk < 0.70          Risk ≥ 0.70
   (Low)          (Medium)                  (High)
           │                         │                         │
   Auto‑Approve   Smart 3DS Step‑Up          Block & Review
   (no UI cue)   (UI shows “Verify 3‑DS”)   (UI shows red badge)
           │                         │                         │
           ▼                         ▼                         ▼
   [ Razorpay Capture ]   [ Razorpay 3‑DS Flow ]   [ Block & Store ]
           │                         │                         │
           ▼                         ▼                         ▼
   [ Audit Log ]          [ Audit Log ]          [ Audit Log ]
           │                         │                         │
           └───────────────► JSON response ◄───────────────┘
```

---

## 📊 Risk Tier Definitions
| Tier | Score Range | Business Meaning | UI Indicator |
|------|------------|------------------|--------------|
| **Low** | `≤ 0.30` | Transaction is considered safe. | Green **Approved** badge. |
| **Medium** | `0.30 – 0.70` | Signals moderate fraud risk (e.g., atypical amount, new device). | Amber **Step‑Up Auth** badge + **Verify with 3‑DS** button. |
| **High** | `≥ 0.70` | Strong evidence of fraud (multiple high‑risk drivers). | Red **Blocked** badge; transaction is not captured.

---

## 🛡️ Mitigation Strategies per Tier
### Low‑Risk (Auto‑Approve)
- **Action**: Immediately call `payments.capture` on Razorpay.
- **Why**: The combined model predicts < 30 % fraud probability; no extra friction for the shopper.
- **LLM Role**: Generates a short confirmation note (e.g., “Low‑risk transaction approved automatically.”).

### Medium‑Risk (Smart 3‑DS Step‑Up)
- **Action**: UI shows a **Smart 3‑DS** button. When clicked, Razorpay initiates a challenge (OTP, biometric, or frictionless validation) with the issuing bank.
- **Flow**:
  1. Frontend calls Razorpay SDK with `threeDSecure: true`.
  2. Issuer returns success/failure via webhook.
  3. Backend records the result and updates the audit log.
- **Outcome**: If the customer passes the challenge, the payment is captured; otherwise it is blocked.
- **LLM Role**: Explains *why* step‑up is required in plain language (e.g., “The transaction amount is unusually high for a first‑time buyer; we ask the cardholder to confirm this purchase.”).

### High‑Risk (Block & Review)
- **Action**: Transaction is **not captured**; a red badge is shown and the record is stored for manual review.
- **LLM Role**: Generates a detailed Threat Intelligence Report, enumerating the high‑risk drivers, confidence level, and recommended manual actions.
- **Fallback**: If the LLM API is unavailable, a template report with the same structure is used.

---

## 💻 Getting Started & Running the Project
```bash
# Clone repo & cd into project root
git clone <repo-url>
cd razorpay-risk-sentinel

# Python environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r backend/requirements.txt

# Node environment (frontend)
cd frontend
npm install
cd ..

# Create .env (AIML API key is required for LLM reports)
cp backend/.env.example backend/.env   # then edit AIML_API_KEY

# Seed realistic dummy data (70% low, 20% medium, 10% high)
python seed_dummy_data.py

# Start the backend
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start the frontend in a second terminal
cd frontend
npm run dev
```
Open a browser at `http://localhost:5173` to view the Command Center.

---

## 🔮 Future Roadmap & Potential Improvements
- **TypeScript migration** for stricter front‑end contracts.
- **Redis + PostgreSQL** for distributed caching and durable audit logs.
- **Webhook subscription** for merchants to receive real‑time notifications.
- **Model‑drift monitoring** with automated retraining pipelines.
- **Multi‑language support** for global merchants.

---

## 🗒️ User Prompt (the request that generated this README)
> I want you to write down and fill the readme file with the information about the project, every single piece of information, like:
> - what the project is
> - how it works
> - what problems it solves
> - the architecture structure of the elements
> - the difference between low, medium, and high risk
> - what solution it has for it and how it works and also add this question or prompt I have given you to do these things.

---

*Prepared by the Antigravity‑IDE assistant on 2026‑08‑30.*
