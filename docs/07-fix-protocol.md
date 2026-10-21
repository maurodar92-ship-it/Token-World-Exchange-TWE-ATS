# 07 — FIX Protocol and Market Data Gateway Specification

Status: Draft v1.0 · Owner: Connectivity · Applies to: Module A (TWE ATS order entry), Module B (drop copy / routing), Module C (crypto order entry)

## 1. Overview

* **Protocol**: FIX 4.4 over TCP with TLS 1.3 (mutual TLS) or over cross-connect/IPsec. FIXT.1.1 + FIX 5.0 SP2 offered from v2 (§8).
* **Roles**: TWE is the *acceptor*. `TargetCompID(56)=TWEATS` for Module A order entry, `TWEDC` for drop copy, `TWECX` for Module C.
* **Encoding**: ASCII tag=value, SOH (`0x01`) delimiter. In this document SOH is rendered as `|`.
* **The sandbox prototype** implements the encoder for 35=D and 35=8 with computed BodyLength and CheckSum; the samples below were generated and then independently re-verified by a script, so they are byte-exact if `|` is replaced by SOH.

### 1.1 BodyLength (9) and CheckSum (10)

* **BodyLength** = number of bytes after the SOH that terminates `9=…` up to and including the SOH immediately preceding `10=`.
* **CheckSum** = (sum of all bytes from `8=` up to and including the SOH preceding `10=`) mod 256, rendered as exactly 3 digits (zero-padded).

```ts
const SOH = '\x01';
export function encode(fields: Array<[number, string | number]>): string {
  const body = fields.map(([t, v]) => `${t}=${v}${SOH}`).join('');
  const head = `8=FIX.4.4${SOH}9=${Buffer.byteLength(body, 'ascii')}${SOH}`;
  let sum = 0; for (const b of Buffer.from(head + body, 'ascii')) sum = (sum + b) & 0xff;
  return `${head}${body}10=${String(sum).padStart(3, '0')}${SOH}`;
}
```

Field order: header `8, 9, 35` MUST be first three; TWE emits `34, 49, 52, 56` next. Body tags may arrive in any order except within repeating groups, where the NoXXX count tag precedes the group and the first field of each instance is the delimiter field.

## 2. Session layer

| MsgType | Name | Notes |
|---|---|---|
| `A` | Logon | `98=0` (no encryption; TLS handles it), `108` HeartBtInt 30 s (allowed 10–60), `141=Y` ResetSeqNumFlag only at start of trading day (weekly reset optional by agreement), `553/554` Username/Password optional when mTLS client cert is bound to CompID |
| `0` | Heartbeat | Sent when no message sent for HeartBtInt; echo `112` when replying to TestRequest |
| `1` | TestRequest | Sent by either side after HeartBtInt + 20% with no inbound traffic |
| `2` | ResendRequest | `7` BeginSeqNo, `16` EndSeqNo (0 = infinity). TWE retains 7 days of outbound messages per session |
| `4` | SequenceReset | GapFill (`123=Y`) for admin messages on resend; Reset mode only by ops |
| `3` | Reject | Session-level reject (`373` SessionRejectReason, `371` RefTagID) |
| `5` | Logout | Graceful; TWE sends at session end (21:00 UTC default for Module A) |
| `j` | BusinessMessageReject | Application-level unsupported MsgType or conditionally required field missing |

Session rules: duplicate logon for an active CompID → reject + logout of new connection; `34` too low without `43=Y` (PossDupFlag) → logout; on reconnect after failover (doc 01 §8) sequence numbers persist — client SHOULD issue ResendRequest for gaps.

### 2.1 Logon (client → TWE)

```
8=FIX.4.4|9=97|35=A|34=1|49=TWECLIENT01|52=20261021-14:30:00.000|56=TWEATS|98=0|108=30|141=Y|553=desk7.trader01|10=203|
```

### 2.2 Logon acknowledgement (TWE → client)

```
8=FIX.4.4|9=78|35=A|34=1|49=TWEATS|52=20261021-14:30:00.012|56=TWECLIENT01|98=0|108=30|141=Y|10=003|
```

### 2.3 TestRequest and Heartbeat

```
8=FIX.4.4|9=72|35=1|34=2|49=TWEATS|52=20261021-14:30:31.000|56=TWECLIENT01|112=TR-0001|10=015|
8=FIX.4.4|9=72|35=0|34=2|49=TWECLIENT01|52=20261021-14:30:31.004|56=TWEATS|112=TR-0001|10=018|
```

### 2.4 Logout

```
8=FIX.4.4|9=74|35=5|34=8|49=TWECLIENT01|52=20261021-21:00:00.000|56=TWEATS|58=End of day|10=193|
```

## 3. TWE custom tags (5000–9999 user-defined range)

| Tag | Name | Type | Dir | Values / Notes |
|---|---|---|---|---|
| 5001 | RegExemption | String | In/Out | `REGISTERED`, `REGD506B`, `REGD506C`, `REGS`, `REGATIER1`, `REGATIER2`, `REGCF`, `RULE144`, `RULE144A` — exemption under which the seller holds / buyer acquires; validated against instrument |
| 5002 | InvestorClaimHash | String(66) | In | `0x` + keccak256 hex of the investor's ONCHAINID claim bundle; lets TWE confirm the subscriber's view of eligibility matches the registry |
| 5003 | InvestorJurisdiction | String | In | ISO 3166-2 (e.g., `US-NY`); must match identity record |
| 5004 | AccreditationStatus | char | In | `A` accredited, `Q` QP, `I` QIB, `N` non-US person, `0` none |
| 5005 | SettlementMode | String | In/Out | `ONCHAIN_DVP`, `ONCHAIN_AGENT`, `OFFCHAIN_T0`, `OFFCHAIN_T1` |
| 5006 | SettlementWallet | String(42) | In | EIP-55 checksummed address registered to the investor |
| 5007 | LockupExpiry | UTCDate | Out | Earliest transferable date of the lot when restricted |
| 5008 | CATFirmDesignatedID | String | In | FDID for CAT linkage (subscriber-provided) |
| 5009 | CashSettlementAsset | String | In/Out | `USD`, `USDC`, `EURC`, `USDS` |
| 5010 | SettlementID | String | Out | TWE settlement reference (maps to on-chain `settlementId`) |
| 5011 | DvPState | String | Out | `PENDING`, `ESCROW_LOCKED`, `SETTLED`, `FAILED`, ... (doc 04 §2) |
| 5012 | ComplianceRejectCode | String | Out | `LOCKUP_ACTIVE`, `NOT_ACCREDITED`, `JURISDICTION_BLOCKED`, `SANCTIONS_HIT`, `WALLET_FROZEN`, `INVESTOR_FROZEN`, `HOLDER_CAP_REACHED`, `CREDENTIAL_REQUIRED`, `ONCHAIN_RESTRICTION_<n>` |
| 5013 | OwnerGroupID | String | In | Beneficial-owner group for STP (else derived) |
| 5014 | STPMode | char | In | `N` cancel newest, `O` cancel oldest, `B` both, `D` decrement |
| 5020 | EngineSeqNo | SeqNum | Out | Core sequencer number (doc 01 §6) — enables replay correlation |
| 5021 | StateDigest | String | Out (drop copy) | Periodic digest for subscriber-side reconciliation |

Custom tag ranges reserved: 5000–5099 compliance/identity, 5100–5199 settlement, 5200–5299 crypto/margin (Module C), 9000–9999 internal test only. TWE will not reuse a retired tag number.

## 4. NewOrderSingle (35=D)

Required: `11` ClOrdID (unique per CompID per day), `1` Account, `55` Symbol and/or `48`+`22` (SecurityIDSource 4=ISIN, 1=CUSIP), `54` Side (1 buy, 2 sell), `60` TransactTime, `38` OrderQty, `40` OrdType (1 market, 2 limit), `44` Price (if limit), `59` TimeInForce (0 day, 1 GTC, 3 IOC, 4 FOK, 6 GTD + `126`), `5001`, `5005`. Conditionally required: `5002` and `5003` for restricted instruments; `5006` for on-chain settlement; `21` HandlInst accepted but ignored on ATS.

```
8=FIX.4.4|9=365|35=D|34=3|49=TWECLIENT01|52=20261021-14:31:05.120|56=TWEATS|1=ACCT-88231|11=CL-20261021-0001|21=1|22=4|38=500|40=2|44=101.25|48=US0000TWE012|54=1|55=TWRE-A|59=0|60=20261021-14:31:05.118|15=USD|5001=REGD506C|5002=0x9f2c4e1ab37d55e0c1f8a6b2d4e7093c5a1b8e6f2d0c9a7b3e5f1d4c8a2b6e90|5003=US-NY|5005=ONCHAIN_DVP|5006=0x5A0b54D5dc17e0AadC383d2db43B0a0D3E029c4c|5009=USDC|10=149|
```

## 5. ExecutionReport (35=8)

FIX 4.4 semantics: `150` ExecType `0` New, `F` Trade (partial and full fills — FIX 4.4 replaced ExecType 1/2 with `F`), `4` Canceled, `5` Replaced, `8` Rejected, `C` Expired, `H` Trade Cancel (trade break). `39` OrdStatus `0` New, `1` Partially filled, `2` Filled, `4` Canceled, `8` Rejected. Invariant: `14 CumQty + 151 LeavesQty = 38 OrderQty` unless order is terminal (then `151=0`).

### 5.1 New

```
8=FIX.4.4|9=252|35=8|34=3|49=TWEATS|52=20261021-14:31:05.131|56=TWECLIENT01|1=ACCT-88231|6=0|11=CL-20261021-0001|14=0|17=EX-000001|22=4|37=TWE-O-7731001|38=500|39=0|40=2|44=101.25|48=US0000TWE012|54=1|55=TWRE-A|59=0|60=20261021-14:31:05.130|150=0|151=500|5020=1042337|10=243|
```

### 5.2 Partial fill (`150=F`, `39=1`, `851=1` added liquidity)

```
8=FIX.4.4|9=326|35=8|34=4|49=TWEATS|52=20261021-14:31:07.402|56=TWECLIENT01|1=ACCT-88231|6=101.25|11=CL-20261021-0001|14=200|17=EX-000002|22=4|31=101.25|32=200|37=TWE-O-7731001|38=500|39=1|40=2|44=101.25|48=US0000TWE012|54=1|55=TWRE-A|59=0|60=20261021-14:31:07.401|150=F|151=300|851=1|5010=STL-20261021-000417|5011=ESCROW_LOCKED|5020=1042391|10=106|
```

### 5.3 Fill (`150=F`, `39=2`)

```
8=FIX.4.4|9=324|35=8|34=5|49=TWEATS|52=20261021-14:31:09.877|56=TWECLIENT01|1=ACCT-88231|6=101.25|11=CL-20261021-0001|14=500|17=EX-000003|22=4|31=101.25|32=300|37=TWE-O-7731001|38=500|39=2|40=2|44=101.25|48=US0000TWE012|54=1|55=TWRE-A|59=0|60=20261021-14:31:09.876|150=F|151=0|851=1|5010=STL-20261021-000418|5011=ESCROW_LOCKED|5020=1042455|10=050|
```

### 5.4 Rejected (compliance gate) (`150=8`, `39=8`, `103=99` Other, `5012`)

```
8=FIX.4.4|9=311|35=8|34=6|49=TWEATS|52=20261021-14:32:00.015|56=TWECLIENT01|1=ACCT-88231|6=0|11=CL-20261021-0002|14=0|17=EX-000004|22=4|37=NONE|38=1000|39=8|40=2|44=101.30|48=US0000TWE012|54=2|55=TWRE-A|58=COMPLIANCE: Rule 144 holding period active until 20270301|60=20261021-14:32:00.014|103=99|150=8|151=0|5012=LOCKUP_ACTIVE|10=086|
```

Reject messages never echo PII; `58` Text is safe for logs. Compliance rejects are not counted against the subscriber's message-rate limits.

## 6. OrderCancelRequest (35=F) and cancel confirmation

`41` OrigClOrdID identifies the order to cancel; `11` is a new ClOrdID; `37` OrderID optional but recommended. Unknown or already-terminal orders → `35=9` OrderCancelReject with `434=1`, `102` CxlRejReason (`0` too late, `1` unknown order).

```
8=FIX.4.4|9=198|35=F|34=6|49=TWECLIENT01|52=20261021-14:33:10.000|56=TWEATS|1=ACCT-88231|11=CL-20261021-0004|37=TWE-O-7731002|38=250|41=CL-20261021-0003|48=US0000TWE012|22=4|54=1|55=TWRE-A|60=20261021-14:33:09.998|10=207|
8=FIX.4.4|9=237|35=8|34=8|49=TWEATS|52=20261021-14:33:10.009|56=TWECLIENT01|1=ACCT-88231|6=0|11=CL-20261021-0004|14=0|17=EX-000006|22=4|37=TWE-O-7731002|38=250|39=4|41=CL-20261021-0003|48=US0000TWE012|54=1|55=TWRE-A|60=20261021-14:33:10.008|150=4|151=0|10=164|
```

OrderCancelReplaceRequest (35=G) follows the same pattern (`150=5`, `39` reflects post-replace status); price change or quantity increase loses time priority.

## 7. Market data (35=V / 35=W / 35=X)

MarketDataRequest `263` SubscriptionRequestType (0 snapshot, 1 snapshot+updates, 2 unsubscribe), `264` MarketDepth (0 full, 1 top, N levels), `267`/`269` entry types (0 bid, 1 offer, 2 trade). Snapshot `35=W`; incremental `35=X` with `279` MDUpdateAction (0 new, 1 change, 2 delete).

```
8=FIX.4.4|9=144|35=V|34=7|49=TWECLIENT01|52=20261021-14:34:00.000|56=TWEATS|262=MDR-01|263=0|264=5|267=3|269=0|269=1|269=2|146=1|55=TWRE-A|48=US0000TWE012|22=4|10=113|
8=FIX.4.4|9=276|35=W|34=9|49=TWEATS|52=20261021-14:34:00.004|56=TWECLIENT01|262=MDR-01|55=TWRE-A|48=US0000TWE012|22=4|268=5|269=0|270=101.20|271=1200|290=1|269=0|270=101.15|271=800|290=2|269=1|270=101.30|271=600|290=1|269=1|270=101.40|271=1500|290=2|269=2|270=101.25|271=300|273=14:31:09.876|10=102|
```

Market data via FIX is Module A only; high-volume Module C market data is served via WebSocket (§9) or binary multicast (v2).

## 8. FIXT.1.1 / FIX 5.0 SP2 differences

| Aspect | FIX 4.4 | FIXT.1.1 + FIX 5.0 SP2 |
|---|---|---|
| BeginString (8) | `FIX.4.4` | `FIXT.1.1` (session transport decoupled from application version) |
| App version | Implied by BeginString | `1137` DefaultApplVerID on Logon (`9` = FIX50SP2); per-message `1128` ApplVerID override |
| Session messages | Part of FIX 4.4 spec | Defined by FIXT.1.1, reusable under any application version |
| ExecType | `F` Trade (1/2 deprecated) | Same; additional ExecTypes (e.g., `L` Triggered/activated) |
| Parties | `453` NoPartyIDs | Extended party roles and `2376` PartyRoleQualifier etc. — useful for CAT-style party attribution |
| Market data | 35=W/X | Adds `1021` MDBookType (top-of-book / price-depth / order-depth), `1500` MDStreamID, application sequencing `1180/1181` ApplID/ApplSeqNum for gap recovery |
| Regulatory | — | Extension packs (EPs) for MiFID II flags, trade reporting — relevant for EU expansion |
| Encodings | tag=value | Same, plus FIXML / SBE / FAST mappings maintained alongside |

TWE plan: v2 accepts both 4.4 and FIXT.1.1/5.0SP2 sessions; custom tags 5000–9999 unchanged; application sequencing (`1181`) maps to `5020` EngineSeqNo.

## 9. WebSocket market data gateway

Endpoint: `wss://md.tokenworld.exchange/v1` (Module A) and `wss://md-cx.tokenworld.exchange/v1` (Module C). Auth: short-lived JWT (`Sec-WebSocket-Protocol: twe.v1, bearer.<jwt>`). Messages are JSON text frames; numbers that represent prices/quantities are **strings** (decimal) to avoid float rounding.

Subscription:

```json
{ "op": "subscribe", "id": "c1", "channels": [ { "name": "l2", "symbol": "TWRE-A", "depth": 20 } ] }
```

### 9.1 Common envelope (JSON Schema, draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://tokenworld.exchange/schemas/md/envelope.json",
  "type": "object",
  "required": ["channel", "type", "symbol", "seq", "ts"],
  "properties": {
    "channel": { "enum": ["l1", "l2", "l3", "trades"] },
    "type": { "enum": ["snapshot", "update", "heartbeat", "gap"] },
    "symbol": { "type": "string" },
    "seq": { "type": "integer", "minimum": 1, "description": "Per-symbol, per-channel gapless sequence" },
    "engineSeq": { "type": "integer", "description": "Core sequencer number (FIX 5020)" },
    "ts": { "type": "string", "format": "date-time", "description": "Engine event time, RFC 3339 with ns precision" }
  }
}
```

### 9.2 L1 (top of book)

```json
{
  "$id": "https://tokenworld.exchange/schemas/md/l1.json",
  "allOf": [{ "$ref": "envelope.json" }],
  "properties": {
    "bid": { "$ref": "#/$defs/level" }, "ask": { "$ref": "#/$defs/level" },
    "last": { "type": "object", "properties": { "px": { "$ref": "#/$defs/dec" }, "qty": { "$ref": "#/$defs/dec" } } },
    "status": { "enum": ["OPEN", "HALTED", "CLOSED", "AUCTION"] }
  },
  "$defs": {
    "dec": { "type": "string", "pattern": "^-?[0-9]+(\\.[0-9]+)?$" },
    "level": { "type": ["object", "null"], "required": ["px", "qty"], "properties": { "px": { "$ref": "#/$defs/dec" }, "qty": { "$ref": "#/$defs/dec" }, "orders": { "type": "integer" } } }
  }
}
```

Example: `{"channel":"l1","type":"update","symbol":"TWRE-A","seq":881,"engineSeq":1042455,"ts":"2026-10-21T14:31:09.876000000Z","bid":{"px":"101.20","qty":"1200","orders":3},"ask":{"px":"101.30","qty":"600","orders":1},"last":{"px":"101.25","qty":"300"},"status":"OPEN"}`

### 9.3 L2 (aggregated price levels)

```json
{
  "$id": "https://tokenworld.exchange/schemas/md/l2.json",
  "allOf": [{ "$ref": "envelope.json" }],
  "properties": {
    "bids": { "type": "array", "items": { "$ref": "#/$defs/pl" } },
    "asks": { "type": "array", "items": { "$ref": "#/$defs/pl" } },
    "checksum": { "type": "integer", "description": "CRC32 of top-N levels 'px:qty' joined by ':' bids then asks; client verifies after applying update" }
  },
  "$defs": {
    "pl": { "type": "array", "prefixItems": [ { "type": "string" }, { "type": "string" }, { "type": "integer" } ], "minItems": 3, "maxItems": 3,
            "description": "[px, qty, orderCount]; qty \"0\" in an update deletes the level" }
  }
}
```

Updates carry only changed levels. On `seq` gap the client MUST discard state and resubscribe (server sends `type:"gap"` if it detects a slow consumer and drops it).

### 9.4 L3 (order-by-order)

Available to subscribers only (not public), **without** subscriber identity — order IDs are per-session-salted pseudonyms so L3 does not leak confidential subscriber information (Rule 301(b)(10)).

```json
{
  "$id": "https://tokenworld.exchange/schemas/md/l3.json",
  "allOf": [{ "$ref": "envelope.json" }],
  "properties": {
    "events": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["e", "oid", "side"],
        "properties": {
          "e": { "enum": ["add", "modify", "delete", "exec"] },
          "oid": { "type": "string", "description": "Pseudonymous order id" },
          "side": { "enum": ["B", "S"] },
          "px": { "type": "string" }, "qty": { "type": "string" },
          "execQty": { "type": "string" }, "tradeId": { "type": "string" },
          "priority": { "type": "integer", "description": "Engine seq that sets time priority" }
        }
      }
    }
  }
}
```

### 9.5 Trades

`{"channel":"trades","type":"update","symbol":"TWRE-A","seq":77,"ts":"…","tradeId":"T-55120","px":"101.25","qty":"300","aggressor":"S"}` — trade breaks published as `{"type":"update","break":true,"tradeId":"T-55120"}`.

### 9.6 Rate limits and conflation

* 50 subscriptions per connection; 10 inbound msgs/s.
* L1 may be conflated to 100 ms for web clients (`"conflate":100`); L2/L3 never conflated (gap → resubscribe).
* Heartbeat every 5 s per connection (`{"type":"heartbeat"}`); client ping/pong per RFC 6455.
