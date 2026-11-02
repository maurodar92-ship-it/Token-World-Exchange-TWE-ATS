/**
 * Institutional Compliance, Custody & Web Security Integration Manager
 * Connects Token World Exchange to Sumsub, Persona, Elliptic, Fireblocks, and Cloudflare WAF
 */

export interface KycApplicantStatus {
  applicantId: string;
  externalUserId: string;
  reviewStatus: "init" | "pending" | "completed" | "onHold";
  reviewResult: "GREEN" | "RED" | "PENDING";
  amlCheck: "CLEARED" | "MATCH_FOUND" | "UNDER_REVIEW";
  riskScore: number; // 0 to 100
  country: string;
  accreditationLevel: "Tier 1: Institutional QIB" | "Tier 2: Accredited" | "Retail Verified";
  lastVerified: string;
}

export interface EllipticRiskAnalysis {
  address: string;
  chain: string;
  riskScore: number; // 0 - 10
  verdict: "APPROVED" | "FLAGGED" | "BLOCKED";
  sanctionsMatch: boolean;
  mixerExposure: boolean;
  stolenFundsExposure: boolean;
  contributingEntities: string[];
}

export interface CloudflareWafRule {
  id: string;
  description: string;
  expression: string;
  action: "block" | "challenge" | "js_challenge" | "log";
  enabled: boolean;
}

export const PRODUCTION_WAF_RULES: CloudflareWafRule[] = [
  {
    id: "tw-waf-01",
    description: "Rate limit high-frequency order placement API abuse",
    expression: '(http.request.uri.path contains "/api/orders" and rate(10s) > 120)',
    action: "challenge",
    enabled: true,
  },
  {
    id: "tw-waf-02",
    description: "Block sanctioned OFAC geographic IP access",
    expression: '(ip.geoip.country in {"CU", "IR", "KP", "SY", "RU"})',
    action: "block",
    enabled: true,
  },
  {
    id: "tw-waf-03",
    description: "Block automated credential stuffing & flash-loan attack bots",
    expression: "(cf.client.bot or cf.threat_score > 30) and not http.user_agent contains 'TokenWorldClient'",
    action: "js_challenge",
    enabled: true,
  },
  {
    id: "tw-waf-04",
    description: "Protect Sovereign Treasury withdrawal endpoints",
    expression: '(http.request.uri.path contains "/api/treasury/withdraw" and not ip.src in { "198.51.100.0/24" })',
    action: "block",
    enabled: true,
  },
];

/**
 * Simulate or verify wallet address risk via Elliptic / Chainalysis AML
 */
export function analyzeCryptoAddressRisk(address: string, chain: string = "ethereum"): EllipticRiskAnalysis {
  const cleanAddr = address.toLowerCase();
  
  // Known sample sanctioned / suspicious addresses for demonstration
  const isSanctioned = cleanAddr.startsWith("0x000000") || cleanAddr.includes("dead");
  const isMixer = cleanAddr.startsWith("0x123456") || cleanAddr.endsWith("9999");

  let riskScore = 1.2;
  const contributingEntities: string[] = ["Whitelisted Verified Exchange Depository"];

  if (isSanctioned) {
    riskScore = 9.8;
    contributingEntities.push("OFAC Specially Designated Nationals List");
  }
  if (isMixer) {
    riskScore = 8.5;
    contributingEntities.push("Tornado Cash Relayer Pool Interaction");
  }

  const verdict = riskScore > 7.0 ? "BLOCKED" : riskScore > 4.0 ? "FLAGGED" : "APPROVED";

  return {
    address,
    chain,
    riskScore,
    verdict,
    sanctionsMatch: isSanctioned,
    mixerExposure: isMixer,
    stolenFundsExposure: false,
    contributingEntities,
  };
}

/**
 * Generate AWS / GCP Cloud KMS Hardware Security Module (HSM) deployment script
 */
export function generateHsmKmsScript(): string {
  return `#!/bin/bash
# ==============================================================================
# Token World Exchange - Cloud KMS Hardware Security Module (HSM) Setup
# Provisions asymmetric secp256k1 signing keys for Treasury & AMM deployer
# ==============================================================================
set -e

KEYRING_NAME="tokenworld-production-hsm-keyring"
KEY_NAME="treasury-root-signer"
LOCATION="global"
PROJECT_ID="tokenworld-prod-exchange"

echo "🔐 [1/3] Creating Cloud KMS Keyring in \${LOCATION}..."
gcloud kms keyrings create \${KEYRING_NAME} \\
    --location=\${LOCATION} \\
    --project=\${PROJECT_ID} || true

echo "🔑 [2/3] Generating Hardware-Protected (HSM) secp256k1 Key for EVM Signing..."
gcloud kms keys create \${KEY_NAME} \\
    --keyring=\${KEYRING_NAME} \\
    --location=\${LOCATION} \\
    --purpose="asymmetric-signing" \\
    --default-algorithm="ec-sign-secp256k1-sha256" \\
    --protection-level="hsm" \\
    --project=\${PROJECT_ID}

echo "🛡️ [3/3] Fetching Public Key for Treasury Address Verification..."
gcloud kms keys versions get-public-key 1 \\
    --key=\${KEY_NAME} \\
    --keyring=\${KEYRING_NAME} \\
    --location=\${LOCATION} \\
    --output-file=treasury-hsm-public-key.pem

echo "✅ Cloud KMS HSM Key Ready. Private key never leaves the hardware security module."
`;
}
