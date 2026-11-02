# Token World ATS Deployment & Operational Runbook
**Sole Owner & Treasury Principal:** Mauro Lomibao Dar III  
**Headquarters:** 945 Westholme Ave, Los Angeles, CA 90024  
**Contact:** (310) 904-5646 | mdgodsiii@gmail.com  
**Regulatory Status:** SEC Alternative Trading System Sandbox / Reg ATS Compliance Framework  

---

## 1. Regulatory Guardrail & Execution Policy
The system is hard-coded with:
```bash
ENABLE_LIVE_TRADING=false
```
Live trading of securities can only be enabled following:
1. Approved FINRA Broker-Dealer New Member Application (NMA) under Rule 1014.
2. Effective SEC Form ATS or Form ATS-N filing with the Division of Trading and Markets.
3. Fully executed clearing/custody agreement with a Qualified Custodian and Transfer Agent (DTCC FAST #9450).

---

## 2. Infrastructure Architecture
- **Web/Institutional Trading Portal:** React 19 + TypeScript + Tailwind CSS (Port 3000)
- **High-Performance Order Matching Engine:** FastAPI + Uvicorn + Pydantic v2 (Port 8000)
- **DvP Settlement Bus:** Smart Contract Suite (`TokenWorldSecurityToken.sol`, `TokenWorldTreasury.sol`)
- **Depository Bridge:** DTCC FAST Transfer Agent Automated Reconciliation Script

---

## 3. Deployment Steps

### Step 1: Clone & Configure Environment
```bash
git clone https://github.com/tokenworld/tokenworld-ats.git
cd tokenworld-ats
cp .env.example .env
```
Ensure `ENABLE_LIVE_TRADING=false` is set in `.env`.

### Step 2: Install Dependencies
```bash
# Node.js dependencies
npm install --legacy-peer-deps

# Python dependencies
pip install fastapi uvicorn pydantic pytest httpx
```

### Step 3: Run Automated Test Suite
```bash
pytest test_ats.py -v
```
All matching engine and pre-trade control tests must pass with 100% success.

### Step 4: Launch via Docker Compose
```bash
docker-compose up --build -d
```
Access endpoints:
- Institutional Trading Portal: `http://localhost:3000`
- FastAPI Engine Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

---

## 4. Monitoring & Health Verification
1. **Health Ping:** `curl -s http://localhost:8000/health`
2. **Order Book Depth:** `curl -s http://localhost:8000/api/ats/depth`
3. **DTCC FAST Reconciliation Balance:** `curl -s http://localhost:8000/api/dtcc/reconciliation`
   - Master Total must equal `nysePublicFloatDtcShares + tokenWorldWrappedShares`.
   - Variance must strictly equal `0`.

---

## 5. Incident Response & Emergency Procedures
- **Circuit Breaker / Market Halt:** If volatility exceeds ±15% in a 5-minute rolling window, execute automated market halt.
- **Cancel-All-Orders Procedure:** Execute `POST /api/ats/admin/halt-and-cancel` to drain all unexecuted bids and asks.
- **Failover:** Disaster Recovery node active in secondary AWS us-east-1 region with synchronized state snapshots.
