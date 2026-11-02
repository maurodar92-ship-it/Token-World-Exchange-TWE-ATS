# Token World Alternative Trading System (ATS) Market Rulebook
**Principal & Sovereign Owner:** Mauro Lomibao Dar III  
**Headquarters:** 945 Westholme Ave, Los Angeles, CA 90024  
**Operating Regime:** SEC Regulation ATS (17 CFR § 242.300 - 304), FINRA ATS Rules  

---

## Chapter 1: General Provisions & Definitions
- **Rule 1.1 Scope:** These Rules govern all order routing, trading, matching, and settlement activities conducted through the Token World Alternative Trading System ("Token World ATS").
- **Rule 1.2 Status:** Token World ATS operates as an alternative trading system under Regulation ATS. Until full regulatory approval and effective Form ATS-N filing, the platform operates under `ENABLE_LIVE_TRADING=false` sandbox status.
- **Rule 1.3 Operator:** Operated by Token World LLC under the principal direction of Mauro Lomibao Dar III.

---

## Chapter 2: Participant Eligibility & Access
- **Rule 2.1 Eligible Subscribers:** Limited strictly to:
  1. Qualified Institutional Buyers (QIBs) pursuant to Rule 144A.
  2. Accredited Investors pursuant to Rule 501(a) of Regulation D.
  3. Non-U.S. Institutional entities pursuant to Regulation S.
- **Rule 2.2 KYC/AML Compliance:** All subscribers must complete identity verification, beneficial ownership certification (FinCEN CDD Rule), and OFAC sanctions screening.
- **Rule 2.3 Fair Access (Rule 301(b)(5)):** Token World provides fair and non-discriminatory access to all qualifying market participants adhering to published standards.

---

## Chapter 3: Trading Hours & Sessions
- **Rule 3.1 Regular Trading Hours (RTH):** 09:30:00 to 16:00:00 Eastern Time (ET), Monday through Friday, matching standard U.S. national exchange sessions.
- **Rule 3.2 Extended Sandbox Hours:** Continuous 24/7 matching available in demonstration and simulation modes.

---

## Chapter 4: Order Types & Execution Priority
- **Rule 4.1 Permissible Order Types:**
  - **Limit Orders:** Orders to buy or sell a specified quantity of shares at a specified price or better.
  - **Market Orders:** (Sandbox only) Orders to buy or sell immediately at the best available bid or offer.
- **Rule 4.2 Priority Algorithm:** Token World utilizes strict **Price-Time Priority**:
  - Highest buy price (bid) and lowest sell price (ask) have absolute precedence.
  - At the same price level, orders are executed in chronological sequence based on time of receipt.
- **Rule 4.3 No Internal Order Skewing:** Token World does not prioritize proprietary flow over subscriber orders.

---

## Chapter 5: Trading Halts, Circuit Breakers & Collar Controls
- **Rule 5.1 Regulatory Halts:** In the event of an SEC, FINRA, or primary market (NYSE) regulatory halt, Token World ATS immediately suspends all trading in affected symbols.
- **Rule 5.2 Limit Up / Limit Down (LULD) Bands:** Orders priced outside ±15% of the 5-minute rolling volume-weighted average price (VWAP) are rejected.
- **Rule 5.3 System Emergency Halts:** The Principal (Mauro Lomibao Dar III) or CCO may invoke an immediate emergency system halt if data integrity or clearing variance is detected.
