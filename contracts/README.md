# TWE Smart-Contract Interfaces

Solidity `^0.8.24` **interfaces only** (no implementations), NatSpec-documented. They define the on-chain surface that TWE services (compliance gate, DvP orchestrator, identity sync worker, corporate-actions engine, Module C credential checks) code against. Implementations will be developed separately, audited twice, and formally verified for the escrow invariants before mainnet deployment (docs/09 §2, A4).

| File | Interfaces | Purpose | Spec reference |
|---|---|---|---|
| `IERC20.sol` | `IERC20`, `IERC20Metadata` | Shared minimal ERC-20 base | EIP-20 |
| `IERC734.sol` | `IERC734` | Key manager (MANAGEMENT/ACTION/CLAIM/ENCRYPTION keys) | ERC-734 as used by ONCHAINID |
| `IERC735.sol` | `IERC735` | Claim holder (topic, scheme, issuer, signature, data, uri) | ERC-735 as used by ONCHAINID |
| `IERC3643.sol` | `IIdentity`, `IClaimIssuer`, `IClaimTopicsRegistry`, `ITrustedIssuersRegistry`, `IIdentityRegistryStorage`, `IERC3643IdentityRegistry`, `IERC3643Compliance`, `IERC3643` | T-REX permissioned token suite with identity registry and modular compliance | ERC-3643 (T-REX) |
| `IERC1404.sol` | `IERC1404`, `TWERestrictionCodes` | Simple restricted token; TWE restriction code table | ERC-1404 |
| `IDSToken.sol` | `IDSRegistryService`, `IDSComplianceService`, `IDSToken` | **Approximation** of Securitize DS Protocol shape for adapter design/mocks only — confirm against Securitize's official ABI | docs/03 §3 |
| `ITWEIdentityRegistry.sol` | `ITWEIdentityRegistry` | ERC-3643-compatible registry + investor-level wallets/freeze, topic-specific eligibility, claim expiry | docs/05 §8 |
| `ITWEDvPEscrow.sol` | `ITWEDvPEscrow` | Atomic DvP escrow with hashlock/timelock, refund, guardian cancel/pause | docs/04 §2–§3 |
| `ITWECorporateActions.sol` | `ITWECorporateActions` | Dividends, coupons, rent distributions; push or Merkle-claim | docs/03 §11 |
| `ITWESoulboundCredential.sol` | `IERC5192`, `IERC721Minimal`, `ITWESoulboundCredential` | Non-transferable credentials gating permissioned pairs | ERC-5192; docs/04 §8.6 |

## Design notes

* **No PII on-chain.** Identity data is represented by ONCHAINID claims whose `data` is a hash/expiry tuple; investor keys are salted hashes of TWE investor UUIDs.
* **Claim topics** are shared across all modules (docs/05 §8.3); `ITWESoulboundCredential.credentialType` uses the same IDs.
* **Roles** referenced in NatSpec (`AGENT`, `SETTLER_ROLE`, `GUARDIAN_ROLE`, `ISSUER_ROLE`, `CA_AGENT`) are implemented with OpenZeppelin `AccessControl` (or T-REX `AgentRole`) in the implementations; privileged keys are HSM/MPC-held and every privileged call is preceded by an off-chain dual-control approval (docs/08 §3.1). Protective actions (freeze, pause) are single-approver; restorative actions (unfreeze, unpause) require quorum.
* **Escrow and ERC-3643**: the escrow contract must be registered in the token's identity registry (as a TWE settlement-agent identity) or exempted by a compliance module; `settle` re-checks buyer eligibility so a compliance change mid-settlement reverts and leaves funds for `refund`.
* **Upgradeability**: implementations SHOULD be deployed behind UUPS or transparent proxies with a timelocked upgrade admin (≥ 48 h) except for emergency pause paths.
* **Sandbox prototype**: does not deploy contracts; its DvP state machine simulates the escrow events defined in `ITWEDvPEscrow` (same state names) so the orchestrator can switch to real chain observers without changing its state model.

## Compiling

These are interfaces; any `solc >= 0.8.24` compiles them standalone (imports are relative within this folder). No build tooling is included in this repository by design.
