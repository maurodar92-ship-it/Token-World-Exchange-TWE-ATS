# 05 — Compliance, Regulatory Reporting, Surveillance and Identity

Status: Draft v1.0 · Owner: Compliance Engineering (with CCO) · Not legal advice; every mapping requires CCO/counsel sign-off.

## 1. Regulatory perimeter

| Item | TWE position |
|---|---|
| Exchange exemption | TWE ATS operates under Reg ATS (17 CFR 242.300–304) via the Rule 3a1-1(a)(2) exemption from the exchange definition; operated by a registered BD that is a FINRA member |
| Initial filing | **Form ATS** filed at least **20 calendar days before** commencing operations (Rule 301(b)(2)(i)) |
| Form ATS-N | Required only for **NMS Stock ATSs** (Rule 304). TWE trades non-NMS securities → files **Form ATS**, not ATS-N. As best practice TWE publishes ATS-N-equivalent disclosures (Part III-style: subscriber types, order types, segmentation, fees, order interaction, conflicts, use of confidential information, fair-access criteria) on its website |
| Amendments | Material changes: amendment ≥ 20 calendar days before implementation (301(b)(2)(ii)); other changes within 30 calendar days after quarter-end (301(b)(2)(iii)); cessation: promptly (301(b)(2)(v)) |
| Quarterly | **Form ATS-R** within 30 calendar days after each calendar quarter (Rule 301(b)(9)) |
| Records | Rule 301(b)(8), 302 (daily summaries, time-sequenced order records), 303 (preservation: generally ≥ 3 years, first 2 easily accessible; ATS-specific items for life of the ATS) plus BD Rules 17a-3/17a-4 (WORM or audit-trail alternative under the 2022 amendments) |
| Market data in securities | No SIP for non-NMS; reference prices from TWE book and venues |
| Order audit trail | **CAT** (Rule 613 / CAT NMS Plan; FINRA Rule 6800 series). **OATS was retired** (FINRA decommissioned OATS in 2021 after CAT reached full reporting); there is no OATS reporting |
| Trade reporting | FINRA **OTC Reporting Facility (ORF)** for OTC Equity Securities (FINRA Rule 6600 series), TRACE (6700 series) for TRACE-eligible debt tokens; ATS volume reporting under FINRA Rule 4552 where applicable |
| Quotations | Rule 15c2-11 + FINRA Rule 6432 (Form 211); FINRA 6400 series for quoting/trading OTC Equity Securities |
| Best execution | FINRA Rule 5310 (doc 02) |

### 1.1 Instrument classification (drives CAT / ORF / 15c2-11)

| Class | Example | CAT eligible? | ORF? | 15c2-11? |
|---|---|---|---|---|
| Restricted equity (Reg D 506(b)/(c), Reg S during DCP, Reg CF in 1-yr period, 144A) | Tokenized LP/LLC interests | Generally **no** — CAT "Eligible Security" = NMS securities + OTC Equity Securities; FINRA Rule 6420 excludes "restricted equity securities" from OTC Equity Security | Generally no | Not quoted publicly; 144A quotations have specific treatment |
| Unrestricted non-NMS equity (Reg A Tier 2 post-offering, post-Rule 144 holding period resales of a non-listed issuer) | Tokenized REIT shares | **Yes** (OTC Equity Security) | **Yes** | Yes, if TWE publishes quotations in a quotation medium |
| Debt tokens | Tokenized notes | Not CAT (CAT covers equities and listed options) | TRACE if TRACE-eligible | n/a |
| Non-security crypto (Module C) | BTC, ETH | n/a | n/a | n/a |

The `instruments.reporting_profile` column (doc 06) stores the classification; legal sign-off is required to change it.

### 1.2 Offering-exemption transfer controls (compliance gate rules)

| Exemption | Gate rule |
|---|---|
| Reg D 506(b) | Restricted securities; resale only under an exemption (Rule 144, 4(a)(7), 4(a)(1½)); buyer accreditation required on TWE for all secondary trades (policy) |
| Reg D 506(c) | Same as above; issuer verified accreditation at issuance — TWE re-verifies at secondary purchase (claim topic 3 not expired, ≤ 90 days old for third-party letters per policy) |
| Rule 144 holding period | **6 months** if issuer has been an Exchange Act reporting company for ≥ 90 days; **1 year** otherwise; measured from full payment by the acquirer from the issuer/affiliate; tacking permitted for non-affiliates; affiliates also subject to volume, manner-of-sale and Form 144 conditions |
| Reg S | Category 1/2/3 distribution compliance periods (Cat 2: 40 days; Cat 3 equity: 1 year, or 6 months for reporting issuers; Cat 3 debt: 40 days); during DCP, no offers/sales to US persons; buyer must hold NON_US_PERSON claim |
| Reg A Tier 1 | Up to $20M/12 months; state registration (no blue-sky preemption); secondary trading subject to state law → jurisdiction allowlist per instrument |
| Reg A Tier 2 | Up to $75M/12 months; non-accredited natural persons limited to 10% of greater of annual income or net worth for **offering** purchases (not secondary unless listed); securities unrestricted; state preemption for offerees/purchasers in the offering — secondary trading blue-sky still relevant (manual exemption or state-specific relief) |
| Reg CF | Up to $5M/12 months; 1-year transfer restriction (17 CFR 227.501) except to issuer, accredited investor, registered offering, family member/trust |
| Rule 144A | Buyer must be QIB (claim topic 6) |

## 2. Fair access (Rule 301(b)(5))

Threshold: fair-access obligations apply if, during at least 4 of the preceding 6 calendar months, the ATS had ≥ **5%** of average daily volume in an NMS stock, or in an equity security that is not an NMS stock and for which transactions are reported to an SRO (and analogous 5% thresholds for municipal and corporate debt). Confirm the threshold text at filing.

Controls (implemented regardless of threshold, so crossing it is a non-event):

* Written, objective access standards: BD/institutional/accredited categories, KYC/AML pass, eligible jurisdiction, signed subscriber agreement, technical certification for FIX.
* `fair_access_decisions` table: every grant, denial, limitation, with standard applied and approver. Denials: written notice with reasons; record kept; reported on Form ATS-R where required (301(b)(5)(ii)(B)–(C) and ATS-R content).
* Monitoring job computes monthly per-security volume share vs SRO-reported totals where available; alerts at 3%.
* Capacity/integrity (301(b)(6)) at 20% thresholds: TWE follows the systems-integrity program regardless (doc 01 §8).

## 3. Confidential treatment (Rule 301(b)(10))

Written safeguards and procedures to protect subscribers' confidential trading information, separating ATS functions from other activities of the BD:

* **Entitlement model**: subscriber order/trade data readable only by (a) the subscriber, (b) ATS operations staff with role `ATS_OPS`, (c) Compliance/Surveillance, (d) regulators. BD trading desk, SOR strategy team, and Module C staff have **no** access. Enforced by Postgres RLS (doc 06) and service-level authorization; SOR uses only TWE ATS public market data (same feed as any subscriber).
* **Access logging**: every read of non-public subscriber data writes `data_access_log(user, purpose, query_hash, rows)`. Monthly access review by Compliance.
* **Personnel**: list of persons with access, attestations, training; annual review.
* **Disclosure**: best-practice ATS-N-style disclosure of who can access what (Part III Item 10 analogue).

## 4. CAT reporting pipeline

### 4.1 Obligations

TWE BD and TWE ATS are CAT Industry Members (IMs). For CAT-eligible instruments (§1.1), TWE reports order events in its capacity as ATS (receiving orders), as router (BD routing to other venues), and Customer & Account Information via **CAIS** (FDID, large trader ID, customer records; PII handled per CAIS specifications). Deadline: by **8:00 a.m. ET on T+1** for events on trade date T; error repairs by **T+3** (confirm current CAT error-correction window in CAT IM Technical Specifications).

### 4.2 Event types used by TWE

Event type codes per the CAT Reporting Technical Specifications for Industry Members (Equities). Field-level conformance MUST be validated against the current spec version and CAT test environment.

| CAT event | Name | When TWE emits |
|---|---|---|
| `MENO` | New Order | TWE BD receives a customer order (portal/API) or originates a proprietary order |
| `MEOR` | Order Route | TWE BD routes an order to the TWE ATS or an external venue (`destination`, `routedOrderID`, `session`) |
| `MEOA` | Order Accepted | TWE ATS accepts an order routed by a subscriber BD (ATS-specific display fields where applicable) |
| `MEIR` | Order Internal Route Accepted | Order moves between desks/departments within TWE BD |
| `MECO` | Child Order | TWE BD creates a child order from a parent (SOR splitting) when not routed directly |
| `MEOM` | Order Modified | Replace (35=G) accepted |
| `MEOC` | Order Cancelled | Cancel (35=F) accepted, expiry, or STP cancel |
| `MEOJ` | Order Adjusted | System-initiated adjustment (e.g., price/qty adjustment from corporate action) |
| `MEOT` | Trade | Execution on TWE ATS (ATS reports trade with buy/sell details) |
| `MEOF` | Order Fulfillment | TWE BD fills a customer order from a representative/agency execution |
| `MEPA` / `MEAA` | Post-Trade Allocation / Amended Allocation | Allocation to customer accounts from average-price or omnibus executions |
| `MENQ` / `MEQR` / `MEQC` / `MEQS` | New Quote / Quote Received / Quote Cancelled / Quote Status | Only if TWE operates as an interdealer quotation system or quoting BD |

### 4.3 Pre-acceptance rejects

An order rejected by the compliance gate before acceptance is persisted as a `compliance_decisions` record. Whether a reportable event exists for a received-then-rejected order follows the CAT FAQs on rejected orders — the default implementation records the receipt timestamp and reject so either treatment can be produced; final behavior set by Compliance.

### 4.4 Pipeline

```
core output ring ──► Kafka 'cat.raw' ──► CAT Mapper (instrument profile filter, IMID/FDID enrichment, timestamp precision)
   ──► Validator (JSON schema per event type, linkage checks: every MEOR has orderKeyDate+orderID; every MEOT side refs MEOA)
   ──► Staging table cat_events (status=STAGED) ──► Batch builder (per file ≤ size limit, compressed)
   ──► Submitter (CAT SFTP / API; credentials in HSM-backed secret store) ──► Feedback ingester (file acceptance, record rejections, inter-firm linkage errors)
   ──► Repair queue (UI in admin console) ──► Resubmission (corrections) ──► Metrics: error rate target < 0.5%, late rate 0
```

Clock sync: business clocks synchronized to NIST within **50 ms** (CAT NMS Plan Section 6.8 / FINRA Rule 6820 for IMs; 100 µs tolerance is for exchanges — TWE targets PTP ≤ 100 µs anyway). Clock-drift log retained.

## 5. FINRA trade reporting

* **ORF** (OTC Equity Securities): report within **10 seconds** of execution during reporting hours (FINRA Rule 6622). For trades on an ATS, determine the reporting party per Rule 6622(b) and FINRA trade-reporting FAQs (generally the executing BD; ATS-operator arrangements must be documented). Fields: symbol, side, qty, price, execution time, modifiers (e.g., `.T` outside hours, `.W` weighted average, step-out indicators), ATS MPID.
* **TRACE** for TRACE-eligible debt tokens (Rule 6730: generally within 15 minutes, check current timeframe).
* **Rule 4552**: ATSs report weekly volume information for NMS stocks and OTC Equity Securities; TWE's job computes the weekly aggregates per security.

## 6. Rule 15c2-11 and Form 211

The 2020 amendments to Rule 15c2-11 (compliance from Sept. 2021) prohibit a BD from publishing or submitting a quotation for a security in a **quotation medium** unless the BD has reviewed specified current, publicly available issuer information (or an exception applies — e.g., piggyback with current information, certain ADTV/asset-test issuers, 144A securities, and a publication-of-unsolicited-quotes exception with conditions).

TWE controls:

1. If the TWE ATS displays BD quotations such that it is a "quotation medium" (interdealer quotation system), the first BD publishing a priced quotation in an OTC Equity Security must have filed **Form 211** with FINRA (Rule 6432) and received clearance, or TWE relies on an applicable exception documented per security.
2. `instrument_quotation_status` tracks: info source, review date, Form 211 status, exception relied upon, expiry of current-information status; the gate blocks priced quotes when status lapses (unsolicited customer orders may still be accepted where permitted).
3. Restricted securities traded only among accredited investors/QIBs: counsel to confirm 15c2-11 applicability per instrument (144A exception, non-OTC-Equity-Security status).

## 7. Surveillance

Streaming detectors run on the core output stream (orders, cancels, trades with beneficial-owner group IDs); batch detectors run nightly over Timescale hypertables. Alerts go to case management with evidence snapshot (book state replayed from WAL, doc 01 §6.2). Thresholds are **starting defaults**, calibrated per instrument liquidity tier (`tier ∈ {T1 liquid, T2, T3 illiquid}`) and reviewed quarterly. Rules apply to both Module A and C (Module C additionally: index-price manipulation of mark price).

### 7.1 Wash trading

```
for each trade t:
  if owner_group(t.buy) == owner_group(t.sell): alert WASH_SAME_BO (severity HIGH)   # STP should have prevented — indicates STP bypass
  window 24h per instrument:
    pairs = trades where {A,B} trade both directions with |net_qty_A| ≤ 5% of gross_qty_A
    if gross_qty_A ≥ max(3 × median_daily_vol, min_notional) and price drift between legs ≤ 0.5%:
       alert WASH_ROUNDTRIP (A,B)
  linked accounts: same IP/device fingerprint, same funding bank account, same wallet cluster → treat as one owner group for scoring
```

### 7.2 Spoofing

```
for each order o with size ≥ k × avg_top_of_book_size (k=5 T1, 3 T3) placed on side S:
  if o cancelled within Δ (2 s T1, 30 s T3) without fill ≥ 10%:
     and the same owner executed on opposite side −S within [o.ts, o.cancel_ts + Δ]:
     and mid moved toward the opposite execution's favor ≥ 1 tick while o rested:
       score += 1
alert SPOOFING if owner's score ≥ 3 in rolling 1 h, or ≥ 1 with order-to-trade ratio of large orders > 20:1
```

### 7.3 Layering

```
snapshot per owner per side every event:
  levels_owned = count distinct price levels where owner has resting non-marketable orders within 5 ticks of touch
  if levels_owned ≥ 3 and Σ qty ≥ 30% of side depth within 5 ticks:
     watch: if opposite-side execution by same owner occurs, then ≥ 80% of layered qty cancelled within 5 s:
        alert LAYERING
```

### 7.4 Front-running (BD desk vs customer orders)

```
for each customer order c received by TWE BD (MENO) of size ≥ block threshold:
  P = proprietary/affiliated-account orders same instrument, same side, ts in [c.recv − 0, c.route_ts + 60 s]
  if P exists and P executes before c at better price, and P later reverses within 1 day:
     alert FRONT_RUNNING (FINRA Rule 5270) — includes information-barrier breach check against data_access_log
```

### 7.5 Marking the close / ramping

```
close window W = last 10 min before official reference-price time (used for NAV, margin, valuations)
for each owner:
  share = owner_volume_in_W / total_volume_in_W
  impact = (close_px − vwap_pre_W) / vwap_pre_W
  if share ≥ 25% and |impact| ≥ 2% (T1) / 5% (T3) and owner holds position or derivative benefiting from move:
     alert MARKING_CLOSE
ramping (intraday): sequence of ≥ 5 aggressive same-side trades by owner within 15 min moving price ≥ 3% with
   trade sizes small relative to depth (each ≤ 10% of consumed level) → RAMPING
```

### 7.6 Price spike / erroneous trade

`|px − ref_px| / ref_px > band(tier)` (5% T1, 10% T2, 20% T3) → reject pre-trade (price band) or, post-trade, flag for clearly-erroneous review.

### 7.7 Case management

Alert → triage (L1, 24 h) → investigation (L2) → escalation (CCO) → disposition (no action / warning / access restriction under fair-access standards / SAR filing via FinCEN within 30 days of determination / regulatory referral). All steps audit-logged; alert-to-disposition SLA 30 days.

## 8. Identity gateway

### 8.1 W3C Verifiable Credentials Data Model 2.0

TWE accepts VCs conforming to VC Data Model 2.0 (W3C Recommendation, 2025) from trusted issuers (KYC providers, accreditation verifiers, TWE itself). Example accreditation credential:

```json
{
  "@context": ["https://www.w3.org/ns/credentials/v2", "https://tokenworld.exchange/ns/credentials/v1"],
  "id": "urn:uuid:4f6c9c0a-2c1d-4b5e-9a8f-3a8a1e7d2b10",
  "type": ["VerifiableCredential", "AccreditedInvestorCredential"],
  "issuer": "did:web:verifier.example.com",
  "validFrom": "2026-10-01T00:00:00Z",
  "validUntil": "2026-12-30T00:00:00Z",
  "credentialSubject": {
    "id": "did:pkh:eip155:1:0x5A0b54D5dc17e0AadC383d2db43B0a0D3E029c4c",
    "accreditationBasis": "INCOME_200K",
    "rule": "17 CFR 230.501(a)(6)",
    "verificationMethod": "506C_THIRD_PARTY_LETTER"
  },
  "credentialStatus": {
    "id": "https://verifier.example.com/status/3#94567",
    "type": "BitstringStatusListEntry",
    "statusPurpose": "revocation",
    "statusListIndex": "94567",
    "statusListCredential": "https://verifier.example.com/status/3"
  },
  "proof": { "type": "DataIntegrityProof", "cryptosuite": "ecdsa-rdfc-2019", "verificationMethod": "did:web:verifier.example.com#key-1", "proofPurpose": "assertionMethod", "created": "2026-10-01T00:00:00Z", "proofValue": "z..." }
}
```

Verification steps: context & schema check → issuer in `trusted_issuers` for the credential type → proof verify → `validFrom ≤ now < validUntil` → status list check (cached ≤ 1 h) → subject DID controls the wallet (SIWE / EIP-4361 challenge) → map to claim topic.

**Privacy**: PII never goes on-chain. On-chain claims carry only `data = keccak256(credential_id || salt)` and a URI to TWE's access-controlled resolver.

### 8.2 ERC-734 / ERC-735 (ONCHAINID)

* ERC-734 keys: purpose 1 MANAGEMENT, 2 ACTION, 3 CLAIM, 4 ENCRYPTION; key = `keccak256(abi.encode(address))`, key type 1 = ECDSA.
* ERC-735 claim: `{topic, scheme, issuer, signature, data, uri}`; `claimId = keccak256(abi.encode(issuer, topic))`. Scheme 1 = ECDSA. Signature by the issuer's claim key over `keccak256(abi.encode(identityAddress, topic, data))` (EIP-191 prefixed). Trusted issuer is itself an ONCHAINID-based ClaimIssuer contract supporting revocation (`isClaimValid`).

### 8.3 Claim topic mapping

| Topic ID | Name | Source credential | Expiry policy | Used by |
|---|---|---|---|---|
| 1 | KYC_VERIFIED | KYC provider VC (individual) / KYB VC (entity) | 24 months, or on risk event | All tokens |
| 2 | AML_SANCTIONS_CLEARED | Screening VC (OFAC SDN, EU, UK, UN) | 24 h freshness for trading; continuous screening | All |
| 3 | ACCREDITED_INVESTOR_US | Accreditation VC (Rule 501(a)) | 90 days for 506(c)-style verification letters (policy) | Reg D instruments |
| 4 | QUALIFIED_PURCHASER | QP VC (ICA §2(a)(51)) | 12 months | 3(c)(7) funds |
| 5 | NON_US_PERSON | Reg S status VC (Rule 902(k)) | 12 months | Reg S instruments during DCP |
| 6 | QUALIFIED_INSTITUTIONAL_BUYER | QIB VC (Rule 144A(a)(1)) | 12 months | 144A |
| 7 | JURISDICTION | Residency VC (ISO 3166-1 + subdivision) | 24 months | All (blue-sky allowlists) |
| 8 | ELIGIBLE_CONTRACT_PARTICIPANT | ECP VC (CEA §1a(18)) | 12 months | Module C derivatives |
| 9 | PROFESSIONAL_INVESTOR_EU | MiFID II professional client VC | 12 months | EU instruments |
| 10 | REG_CF_LIMIT_ATTESTATION | Investor attestation + TWE calc | per offering | Reg CF |
| 100+ | ISSUER_SPECIFIC_* | Issuer-defined | issuer-defined | Specific tokens |

The same topic IDs are used in `ITWEIdentityRegistry` and in Module C soulbound credential types (8, 9), so one identity pipeline serves all modules.
