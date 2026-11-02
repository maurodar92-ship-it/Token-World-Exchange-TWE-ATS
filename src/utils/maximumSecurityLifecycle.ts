/**
 * Maximum Security Lifecycle Engine for Token World
 * Sole Owner & Principal: Mauro Lomibao Dar III
 * Headquarters: 945 Westholme Ave, Los Angeles, CA 90024
 *
 * Covers End-to-End Enterprise Maximum Security Lifecycle:
 * 1. Infrastructure-as-Code & Policy-as-Code (Terraform & Ansible for Zero Trust, Micro-segmentation, WORM storage)
 * 2. SIEM Telemetry & Metric Tracking (MTTD, MTTR, BAS Validation, Third-Party SLA, UEBA)
 * 3. Breach & Attack Simulation (BAS) against MITRE ATT&CK
 * 4. Active Deception Layer (Canary tokens, honeypot contracts, tripwires)
 * 5. Supply Chain Security (SBOM CycloneDX/SPDX, signed firmware/images, provenance)
 * 6. Insider Threat Detection (UEBA behavior baselines & anomaly triggers)
 * 7. Executive Crisis Playbooks & Legal Disclosures (SEC 8-K 4-day, NYDFS 72h, GDPR, FINRA Reg SCI)
 * 8. WORM Storage Compliance (SEC Rule 17a-4, FINRA 4511 immutable records)
 */

export interface SecurityMetricKpi {
  id: string;
  name: string;
  value: string;
  numericValue: number;
  unit: string;
  target: string;
  status: "optimal" | "acceptable" | "degraded" | "breached";
  trend: "improving" | "stable" | "declining";
  description: string;
  category: "detection" | "response" | "simulation" | "governance" | "resilience";
}

export interface SiemEventRecord {
  id: string;
  timestamp: string;
  severity: "INFO" | "NOTICE" | "WARNING" | "CRITICAL";
  sourceSubsystem: "ZeroTrust-IAM" | "eBPF-Microsegmentation" | "WORM-Storage" | "UEBA-Engine" | "ActiveDeception" | "SBOM-SupplyChain" | "ATS-Engine";
  eventType: string;
  actor: string;
  targetResource: string;
  actionTaken: "BLOCKED_INSTANTLY" | "DECOYED_TO_HONEYPOT" | "TOKEN_QUARANTINED" | "VERIFIED_COMPLIANT" | "ALERT_ESCALATED";
  mitreTechniqueId?: string;
  cryptographicHash: string;
  details: string;
}

export interface BasTestCase {
  id: string;
  name: string;
  mitreId: string;
  tactic: string;
  description: string;
  targetComponent: string;
  expectedBehavior: string;
  status: "PASSED" | "FAILED" | "RUNNING" | "PENDING";
  lastRunTimestamp: string;
  passRate: number;
  remediationAction: string;
}

export interface CanaryAsset {
  id: string;
  type: "AWS_STS_KEY" | "HONEYPOT_SMART_CONTRACT" | "CANARY_TOKEN_FILE" | "DECOY_RPC_NODE" | "DATABASE_CREDENTIAL";
  label: string;
  location: string;
  tripwireStatus: "ARMED" | "TRIPPED" | "QUARANTINED";
  probesDeflected: number;
  lastProbeTimestamp: string | null;
  alertChannel: string;
}

export interface UebaSubjectProfile {
  id: string;
  identity: string;
  role: string;
  normalHours: string;
  authorizedSubnets: string[];
  baselinePrivilegeLevel: string;
  currentRiskScore: number; // 0 - 100
  riskLevel: "LOW" | "ELEVATED" | "CRITICAL";
  anomalyFlags: string[];
  lastActive: string;
}

export interface SbomComponentRecord {
  id: string;
  name: string;
  version: string;
  ecosystem: "npm" | "cargo" | "pip" | "container" | "solidity";
  license: string;
  signatureVerified: boolean;
  sigstoreCosignStatus: "VALID_COSIGN_SIGNATURE" | "REVOKED" | "UNVERIFIED";
  vulnerabilitiesCount: number;
  provenanceAttestation: string;
}

export interface LegalDisclosureFramework {
  regulation: string;
  authority: string;
  timeframeHours: number;
  mandatoryTriggers: string[];
  statutoryReference: string;
  designatedSignatory: string;
  disclosureTemplate: string;
}

/* =========================================================================
   1. INFRASTRUCTURE AS CODE & POLICY AS CODE TEMPLATES
   ========================================================================= */

export const IAC_TERRAFORM_ZERO_TRUST = `# =========================================================================
# TOKEN WORLD ATS - ZERO TRUST IDENTITY & WORKLOAD MAPPING
# Sole Owner & Principal: Mauro Lomibao Dar III
# Standard: NIST SP 800-207 Zero Trust Architecture & SPIFFE/SPIRE Workload Attestation
# =========================================================================

terraform {
  required_version = ">= 1.8.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.45.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.29.0"
    }
  }
}

variable "environment" {
  type    = string
  default = "production"
}

variable "compliance_officer" {
  type    = string
  default = "Mauro Lomibao Dar III"
}

# 1. Zero Trust Workload Identity Provider (OIDC & SPIFFE)
resource "aws_iam_openid_connect_provider" "ats_zero_trust_oidc" {
  url             = "https://oidc.eks.us-west-2.amazonaws.com/id/TOKENWORLD_ATS_ZTA"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["9e99a48a9960b14926cc7f3b02e22da2b0ab7280"]

  tags = {
    Owner       = var.compliance_officer
    Environment = var.environment
    Policy      = "NIST-SP-800-207-Zero-Trust"
  }
}

# 2. Least-Privilege IAM Role for ATS Matching Engine
resource "aws_iam_role" "ats_matching_engine_role" {
  name = "tokenworld-ats-matching-engine-zta"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.ats_zero_trust_oidc.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "oidc.eks.us-west-2.amazonaws.com/id/TOKENWORLD_ATS_ZTA:sub" = "system:serviceaccount:tokenworld-core:matching-engine-sa"
            "oidc.eks.us-west-2.amazonaws.com/id/TOKENWORLD_ATS_ZTA:aud" = "sts.amazonaws.com"
          }
        }
      }
    ]
  })
}

# 3. KMS Customer-Managed Key with Cryptographic Multi-Party Control
resource "aws_kms_key" "ats_audit_worm_key" {
  description             = "Dedicated CMK for Token World WORM immutable audit logs (SEC Rule 17a-4)"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootIAMManagement"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::104399930570:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "DenyUntrustedPrincipals"
        Effect = "Deny"
        Principal = "*"
        Action = [
          "kms:ScheduleKeyDeletion",
          "kms:DisableKey"
        ]
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:PrincipalArn" = "arn:aws:iam::104399930570:user/MauroLomibaoDarIII"
          }
        }
      }
    ]
  })

  tags = {
    Owner     = var.compliance_officer
    Integrity = "SEC-17a-4-WORM-KMS"
  }
}

output "zero_trust_oidc_arn" {
  value       = aws_iam_openid_connect_provider.ats_zero_trust_oidc.arn
  description = "Verified Zero Trust OIDC Identity Provider ARN"
}
`;

export const IAC_TERRAFORM_MICROSEGMENTATION = `# =========================================================================
# TOKEN WORLD ATS - NETWORK MICRO-SEGMENTATION (CILIUM / CALICO eBPF)
# Sole Owner & Principal: Mauro Lomibao Dar III
# Standard: Zero Trust Default-Deny, Calico GlobalNetworkPolicy, eBPF L7 Inspection
# =========================================================================

apiVersion: crd.projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: tokenworld-ats-default-deny-microsegmentation
spec:
  order: 10
  selector: all()
  types:
    - Ingress
    - Egress
  # Default Deny all ingress & egress unless explicitly permitted by policy
  ingress: []
  egress:
    - action: Allow
      protocol: UDP
      destination:
        ports: [53] # DNS egress only to internal CoreDNS cluster
        selector: k8s-app == "kube-dns"

---
apiVersion: crd.projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: isolate-matching-engine-microsegmentation
  namespace: tokenworld-core
spec:
  order: 50
  selector: app == "ats-matching-engine"
  types:
    - Ingress
    - Egress
  ingress:
    # Only authenticated API Gateway with mutual TLS (mTLS SPIFFE identity) can reach port 8443
    - action: Allow
      protocol: TCP
      source:
        selector: app == "ats-gateway-mtls"
      destination:
        ports: [8443]
  egress:
    # Allow matching engine to commit settled trades strictly to PostgreSQL Double-Entry Ledger & WORM S3
    - action: Allow
      protocol: TCP
      destination:
        selector: app == "postgres-ledger-cluster"
        ports: [5432]
    - action: Allow
      protocol: TCP
      destination:
        selector: app == "worm-audit-collector"
        ports: [9000]

---
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: ebpf-l7-treasury-guard
  namespace: tokenworld-treasury
spec:
  endpointSelector:
    matchLabels:
      app: treasury-custody-vault
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: ats-settlement-worker
      toPorts:
        - ports:
            - port: "9443"
              protocol: TCP
          rules:
            http:
              # Strict L7 HTTP verb & path filtering enforced in Linux kernel eBPF
              - method: POST
                path: "/v1/settlement/commit"
                headers:
                  - "X-TokenWorld-Signature: *"
                  - "X-Compliance-Principal: Mauro Lomibao Dar III"
`;

export const IAC_TERRAFORM_WORM_STORAGE = `# =========================================================================
# TOKEN WORLD ATS - WORM (WRITE ONCE, READ MANY) STORAGE INFRASTRUCTURE
# Sole Owner & Principal: Mauro Lomibao Dar III
# Standard: SEC Rule 17a-4(f) & FINRA Rule 4511 Immutable Records Preservation
# =========================================================================

resource "aws_s3_bucket" "ats_audit_worm_bucket" {
  bucket        = "tokenworld-ats-audit-worm-records-production"
  force_destroy = false # Prevent accidental or malicious bucket destruction

  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Owner              = "Mauro Lomibao Dar III"
    ComplianceStandard = "SEC-Rule-17a-4-WORM"
    Classification     = "IMMUTABLE_FINANCIAL_AUDIT"
  }
}

# 1. Enable S3 Object Lock (Write Once, Read Many) in COMPLIANCE Mode
# Compliance mode ensures NO ONE (not even the AWS root account) can delete or overwrite logs
resource "aws_s3_bucket_object_lock_configuration" "ats_worm_lock" {
  bucket = aws_s3_bucket.ats_audit_worm_bucket.id

  rule {
    default_retention {
      mode  = "COMPLIANCE"
      years = 7 # SEC Rule 17a-4 7-year regulatory retention statutory requirement
    }
  }
}

# 2. Strict Bucket Policy Denying Tampering, Policy Alterations, and Unencrypted Transport
resource "aws_s3_bucket_policy" "ats_worm_enforce_policy" {
  bucket = aws_s3_bucket.ats_audit_worm_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnforceTLSRequestsOnly"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.ats_audit_worm_bucket.arn,
          "\${aws_s3_bucket.ats_audit_worm_bucket.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid       = "DenyOverwritesAndDeletions"
        Effect    = "Deny"
        Principal = "*"
        Action = [
          "s3:DeleteObject",
          "s3:DeleteObjectVersion",
          "s3:PutObjectRetention",
          "s3:PutObjectLegalHold"
        ]
        Resource = "\${aws_s3_bucket.ats_audit_worm_bucket.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-object-lock-mode" = "COMPLIANCE"
          }
        }
      }
    ]
  })
}

# 3. Server-Side Encryption with Customer Managed Key (CMK)
resource "aws_s3_bucket_server_side_encryption_configuration" "ats_worm_crypto" {
  bucket = aws_s3_bucket.ats_audit_worm_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.ats_audit_worm_key.arn
      sse_algorithm     = "aws:kms"
    }
    bucket_key_enabled = true
  }
}
`;

export const IAC_ANSIBLE_NODE_HARDENING = `# =========================================================================
# TOKEN WORLD ATS - ANSIBLE NODE HARDENING & ZERO TRUST ENFORCEMENT
# Sole Owner & Principal: Mauro Lomibao Dar III
# Standard: CIS Benchmark Level 2 Hardening & Linux Kernel eBPF Telemetry
# =========================================================================

- name: Token World ATS Maximum Security Production Hardening
  hosts: ats_production_nodes
  become: yes
  vars:
    compliance_officer: "Mauro Lomibao Dar III"
    audit_retention_days: 2555 # 7 Years

  tasks:
    - name: Enforce kernel sysctl network security parameters
      sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        state: present
        reload: yes
      loop:
        - { key: "net.ipv4.conf.all.rp_filter", value: "1" }
        - { key: "net.ipv4.conf.default.rp_filter", value: "1" }
        - { key: "net.ipv4.conf.all.accept_source_route", value: "0" }
        - { key: "net.ipv4.conf.all.send_redirects", value: "0" }
        - { key: "net.ipv4.icmp_echo_ignore_broadcasts", value: "1" }
        - { key: "net.ipv4.tcp_syncookies", value: "1" }
        - { key: "kernel.dmesg_restrict", value: "1" }
        - { key: "kernel.kptr_restrict", value: "2" }
        - { key: "kernel.unprivileged_bpf_disabled", value: "1" }

    - name: Lock down SSH Daemon to hardware MFA & key-only authentication
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: "^PermitRootLogin", line: "PermitRootLogin no" }
        - { regexp: "^PasswordAuthentication", line: "PasswordAuthentication no" }
        - { regexp: "^X11Forwarding", line: "X11Forwarding no" }
        - { regexp: "^MaxAuthTries", line: "MaxAuthTries 3" }
      notify: Restart SSHD

    - name: Install and configure Linux auditd for SEC Rule 17a-4 immutable tracking
      package:
        name:
          - auditd
          - audispd-plugins
          - wireguard
        state: present

    - name: Configure immutable audit rules (/etc/audit/rules.d/audit.rules)
      copy:
        dest: /etc/audit/rules.d/ats-compliance.rules
        content: |
          # Token World Compliance Auditd Rules
          -w /etc/passwd -p wa -k identity_tamper
          -w /etc/shadow -p wa -k identity_tamper
          -w /opt/tokenworld/keys/ -p rwa -k treasury_key_access
          -w /var/log/audit/ -p wa -k audit_log_tamper
          # Set audit configuration into IMMUTABLE mode
          -e 2
      notify: Restart Auditd

  handlers:
    - name: Restart SSHD
      service:
        name: sshd
        state: restarted

    - name: Restart Auditd
      command: service auditd restart
`;

export const IAC_ANSIBLE_ACTIVE_DECEPTION = `# =========================================================================
# TOKEN WORLD ATS - ACTIVE DECEPTION & CANARY TRIPWIRE DEPLOYMENT
# Sole Owner & Principal: Mauro Lomibao Dar III
# Standard: MITRE ATT&CK Deception Matrix & High-Fidelity Canary Sensors
# =========================================================================

- name: Deploy Active Deception Honeypots & Canary Sensors
  hosts: ats_deception_fleet
  become: yes
  vars:
    owner: "Mauro Lomibao Dar III"

  tasks:
    - name: Deploy canary AWS STS token in decoy environment configuration
      copy:
        dest: /root/.aws/credentials.canary
        content: |
          [default]
          # CANARY TRIPWIRE DO NOT TOUCH
          aws_access_key_id = AKIATOKENWORLDDECOY104399
          aws_secret_access_key = CANARY_V3_SECRET_TOKENWORLD_ALERT_TRIGGER
        mode: '0600'

    - name: Deploy simulated high-value RPC listener honeypot on TCP 8545
      copy:
        dest: /etc/systemd/system/tokenworld-rpc-honeypot.service
        content: |
          [Unit]
          Description=Token World Deceptive RPC Honeypot Listener
          After=network.target

          [Service]
          ExecStart=/usr/local/bin/tokenworld-deception-daemon --port 8545 --alarm-channel SIEM
          Restart=always
          User=nobody

          [Install]
          WantedBy=multi-user.target
      notify: Reload Deception Daemon

  handlers:
    - name: Reload Deception Daemon
      systemd:
        daemon_reload: yes
        name: tokenworld-rpc-honeypot
        state: started
        enabled: yes
`;

/* =========================================================================
   2. INITIAL METRICS, EVENT STREAMS & TEST DATA
   ========================================================================= */

export const INITIAL_SECURITY_KPIS: SecurityMetricKpi[] = [
  {
    id: "mttd",
    name: "Mean Time to Detect (MTTD)",
    value: "1.8",
    numericValue: 1.8,
    unit: "mins",
    target: "< 5.0 mins",
    status: "optimal",
    trend: "improving",
    description: "Average latency from initial adversarial probe/anomaly to SIEM tripwire alert generation.",
    category: "detection",
  },
  {
    id: "mttr",
    name: "Mean Time to Respond (MTTR)",
    value: "4.2",
    numericValue: 4.2,
    unit: "mins",
    target: "< 15.0 mins",
    status: "optimal",
    trend: "improving",
    description: "Automated isolation, token quarantine, and administrative containment turnaround time.",
    category: "response",
  },
  {
    id: "bas_pass_rate",
    name: "BAS Validation Pass Rate",
    value: "99.4",
    numericValue: 99.4,
    unit: "%",
    target: "> 98.0%",
    status: "optimal",
    trend: "stable",
    description: "Continuous automated Breach and Attack Simulation validation against MITRE ATT&CK vectors.",
    category: "simulation",
  },
  {
    id: "third_party_remediation",
    name: "3rd-Party Risk SLA Remediation",
    value: "1.4",
    numericValue: 1.4,
    unit: "days",
    target: "< 3.0 days",
    status: "optimal",
    trend: "improving",
    description: "Mean time to patch or isolate newly discovered supply chain or upstream vendor CVE vulnerabilities.",
    category: "governance",
  },
  {
    id: "ueba_anomaly_score",
    name: "UEBA Anomaly Confidence",
    value: "14",
    numericValue: 14,
    unit: "/ 100",
    target: "< 25 (Normal)",
    status: "optimal",
    trend: "stable",
    description: "User & Entity Behavior Analytics dynamic deviation metric across all privileged operators.",
    category: "detection",
  },
  {
    id: "worm_immutable_count",
    name: "WORM Immutable Storage Records",
    value: "48,219",
    numericValue: 48219,
    unit: "records",
    target: "100% Sealed",
    status: "optimal",
    trend: "improving",
    description: "Total cryptographic audit events sealed into SEC Rule 17a-4 compliant Write Once Read Many storage.",
    category: "resilience",
  },
  {
    id: "deception_probes",
    name: "Canary Probes Deflected",
    value: "18",
    numericValue: 18,
    unit: "deflections",
    target: "Zero Breaches",
    status: "optimal",
    trend: "stable",
    description: "Adversarial probes lured into isolated honeypots without touching production custody nodes.",
    category: "detection",
  },
];

export const INITIAL_SIEM_EVENTS: SiemEventRecord[] = [
  {
    id: "siem-evt-101",
    timestamp: "2026-10-10T05:51:14Z",
    severity: "INFO",
    sourceSubsystem: "ZeroTrust-IAM",
    eventType: "SPIFFE_WORKLOAD_ATTESTATION_SUCCESS",
    actor: "system:serviceaccount:tokenworld-core:matching-engine-sa",
    targetResource: "spiffe://tokenworld.local/ns/core/sa/matching-engine",
    actionTaken: "VERIFIED_COMPLIANT",
    cryptographicHash: "0x78ab91e4cf288d019f85c182da4432091c7849301290e8a71b29d71cfa0981e1",
    details: "X.509 SVID renewed via SPIRE Agent; cryptographic key rotation compliant with NIST 800-207.",
  },
  {
    id: "siem-evt-102",
    timestamp: "2026-10-10T05:51:48Z",
    severity: "NOTICE",
    sourceSubsystem: "WORM-Storage",
    eventType: "SEC_17a4_BATCH_RECORD_SEALED",
    actor: "tokenworld-ats-settlement-daemon",
    targetResource: "s3://tokenworld-ats-audit-worm-records-production/2026/10/10/batch-994.log",
    actionTaken: "VERIFIED_COMPLIANT",
    cryptographicHash: "0x3e11a2f909dc88716503cba71d600109927bca5540192837f40192ea0183acbd",
    details: "Object Lock COMPLIANCE retention mode confirmed for 2,555 days (7-year statutory window).",
  },
  {
    id: "siem-evt-103",
    timestamp: "2026-10-10T05:52:30Z",
    severity: "WARNING",
    sourceSubsystem: "ActiveDeception",
    eventType: "CANARY_TOKEN_ACCESS_PROBE",
    actor: "external-scanner-ip-198.51.100.44",
    targetResource: "honeypot://0xDecoyTreasuryVault/deposit()",
    actionTaken: "DECOYED_TO_HONEYPOT",
    mitreTechniqueId: "T1552 - Unsecured Credentials",
    cryptographicHash: "0x9180ab234c9103847e11243100baecff2198031254601928301726aef1029384",
    details: "Attacker tripped decoy honeypot contract. Telemetry captured, originating ASN rate-limited at Cloudflare WAF.",
  },
  {
    id: "siem-evt-104",
    timestamp: "2026-10-10T05:53:02Z",
    severity: "CRITICAL",
    sourceSubsystem: "eBPF-Microsegmentation",
    eventType: "UNAUTHORIZED_LATERAL_EGRESS_PREVENTED",
    actor: "compromised-sandbox-pod:ns/untrusted",
    targetResource: "tcp://10.244.2.14:5432 (Postgres-Ledger)",
    actionTaken: "BLOCKED_INSTANTLY",
    mitreTechniqueId: "T1021 - Lateral Movement",
    cryptographicHash: "0x510928374a9bc019283471019283740192837410928374019283741092837401",
    details: "Calico eBPF default-deny rule triggered in Linux kernel. Direct socket drop within 14 microseconds.",
  },
  {
    id: "siem-evt-105",
    timestamp: "2026-10-10T05:53:45Z",
    severity: "INFO",
    sourceSubsystem: "SBOM-SupplyChain",
    eventType: "COSIGN_SIGNATURE_VERIFIED",
    actor: "ci-cd-github-actions-builder",
    targetResource: "ghcr.io/tokenworld/ats-engine:v3.8.4",
    actionTaken: "VERIFIED_COMPLIANT",
    cryptographicHash: "0xaa01928374615201928374615201928374615201928374615201928374615201",
    details: "Container digest verified against Sigstore Fulcio root certificate and Cosign keyless signature.",
  },
];

export const INITIAL_BAS_TESTS: BasTestCase[] = [
  {
    id: "bas-01",
    name: "Credential Spraying & Zero Trust MFA",
    mitreId: "T1078",
    tactic: "Initial Access",
    description: "Simulates password spraying and OAuth token replay against ATS Administrative Endpoints.",
    targetComponent: "ZeroTrust OIDC Provider",
    expectedBehavior: "Adaptive risk-based challenge issued; session invalidated upon 3rd failed challenge.",
    status: "PASSED",
    lastRunTimestamp: "2026-10-10T05:40:00Z",
    passRate: 100,
    remediationAction: "Enforced FIDO2 WebAuthn requirement across all administrative routes.",
  },
  {
    id: "bas-02",
    name: "Lateral Movement via Microsegmentation Breach",
    mitreId: "T1021",
    tactic: "Lateral Movement",
    description: "Attempts direct cross-namespace TCP routing from low-trust Sandbox pod to Treasury Custody node.",
    targetComponent: "Calico eBPF GlobalNetworkPolicy",
    expectedBehavior: "Immediate kernel-level packet drop without ICMP reply; zero lateral traversal.",
    status: "PASSED",
    lastRunTimestamp: "2026-10-10T05:42:15Z",
    passRate: 100,
    remediationAction: "Calico GlobalNetworkPolicy order 10 default-deny active.",
  },
  {
    id: "bas-03",
    name: "Kernel Privilege Escalation & Container Escape",
    mitreId: "T1068",
    tactic: "Privilege Escalation",
    description: "Executes synthetic dirty-cred / overlayfs exploit payloads within a test container runtime.",
    targetComponent: "Cilium Tetragon eBPF Runtime Sensor",
    expectedBehavior: "SIGKILL delivered to parent process within 2ms of unauthorized sys_ptrace or cap_sys_admin invocation.",
    status: "PASSED",
    lastRunTimestamp: "2026-10-10T05:44:30Z",
    passRate: 98.8,
    remediationAction: "Tetragon tracingpolicy enforces cap_drop: [ALL] with seccomp profile default.",
  },
  {
    id: "bas-04",
    name: "Cryptographic Audit Log Deletion Attempt",
    mitreId: "T1565",
    tactic: "Impact / Tamper",
    description: "Attempts S3 DeleteObject and PutBucketLifecycleConfiguration API calls against WORM compliance storage.",
    targetComponent: "AWS S3 Object Lock Compliance Mode",
    expectedBehavior: "AWS API returns 403 AccessDenied due to statutory COMPLIANCE retention lock.",
    status: "PASSED",
    lastRunTimestamp: "2026-10-10T05:46:10Z",
    passRate: 100,
    remediationAction: "Root account lockdown & Multi-Factor Authentication delete protection enabled.",
  },
  {
    id: "bas-05",
    name: "Insider Exfiltration via Abnormal Off-Hours Volume",
    mitreId: "T1048",
    tactic: "Exfiltration",
    description: "Simulates operator exporting >500k encrypted order records at 03:00 AM from unapproved IP.",
    targetComponent: "UEBA Anomaly Baseline Engine",
    expectedBehavior: "Threshold deviation score spikes to 95/100; automated token freeze & P1 emergency escalation.",
    status: "PASSED",
    lastRunTimestamp: "2026-10-10T05:48:50Z",
    passRate: 97.5,
    remediationAction: "Dynamic rate throttling & dual-custody authorization required for bulk CSV/JSON dumps.",
  },
  {
    id: "bas-06",
    name: "Canary Token Tripwire Exposure Test",
    mitreId: "T1552",
    tactic: "Credential Access",
    description: "Simulates adversary accessing decoy git secret or fake AWS credential in staging repository.",
    targetComponent: "Active Deception Canary Layer",
    expectedBehavior: "Canary token triggers webhook within 200ms with attacker IP, headers, and user-agent string.",
    status: "PASSED",
    lastRunTimestamp: "2026-10-10T05:50:00Z",
    passRate: 100,
    remediationAction: "Real-time SIEM escalation and automatic firewall IP blacklisting.",
  },
];

export const INITIAL_CANARY_ASSETS: CanaryAsset[] = [
  {
    id: "canary-01",
    type: "HONEYPOT_SMART_CONTRACT",
    label: "Decoy Treasury Vault (0xDecoy...789)",
    location: "Base Sepolia Testnet & Mainnet Shadow",
    tripwireStatus: "ARMED",
    probesDeflected: 8,
    lastProbeTimestamp: "2026-10-10T05:22:10Z",
    alertChannel: "SIEM & Mauro Lomibao Dar III Direct Pager",
  },
  {
    id: "canary-02",
    type: "AWS_STS_KEY",
    label: "Canary AWS Access Key (AKIATOKENWORLD...)",
    location: "/root/.aws/credentials.canary & Staging Config",
    tripwireStatus: "ARMED",
    probesDeflected: 4,
    lastProbeTimestamp: "2026-10-09T18:14:00Z",
    alertChannel: "AWS CloudWatch & PagerDuty",
  },
  {
    id: "canary-03",
    type: "DECOY_RPC_NODE",
    label: "Shadow RPC Node Listener (Port 8545)",
    location: "VPC Perimeter Decoy Subnet",
    tripwireStatus: "ARMED",
    probesDeflected: 6,
    lastProbeTimestamp: "2026-10-10T02:04:15Z",
    alertChannel: "Cloudflare WAF Automated Blacklist",
  },
  {
    id: "canary-04",
    type: "DATABASE_CREDENTIAL",
    label: "Decoy Read-Only Database User (db_canary_audit)",
    location: "Internal Postgres Environment Secrets",
    tripwireStatus: "ARMED",
    probesDeflected: 0,
    lastProbeTimestamp: null,
    alertChannel: "Postgres Audit Log Stream",
  },
];

export const INITIAL_UEBA_PROFILES: UebaSubjectProfile[] = [
  {
    id: "ueba-01",
    identity: "Mauro Lomibao Dar III",
    role: "Sole Owner, Principal & Compliance Super-Admin",
    normalHours: "06:00 - 23:00 PST",
    authorizedSubnets: ["10.0.0.0/16", "945 Westholme Ave Dedicated Fiber"],
    baselinePrivilegeLevel: "ROOT_SUPER_ADMIN_MULTI_SIG",
    currentRiskScore: 4,
    riskLevel: "LOW",
    anomalyFlags: [],
    lastActive: "Active Now (Session #MLD-2026-10)",
  },
  {
    id: "ueba-02",
    identity: "ats-settlement-worker-01",
    role: "Automated Central Limit Order Book Settlement Operator",
    normalHours: "24/7 Continuous Automated",
    authorizedSubnets: ["10.244.1.0/24"],
    baselinePrivilegeLevel: "SERVICE_ACCOUNT_LEDGER_WRITE",
    currentRiskScore: 8,
    riskLevel: "LOW",
    anomalyFlags: [],
    lastActive: "1 min ago",
  },
  {
    id: "ueba-03",
    identity: "devops-contract-auditor",
    role: "Smart Contract Verification & Static Analysis Runner",
    normalHours: "08:00 - 18:00 PST",
    authorizedSubnets: ["10.244.4.0/24"],
    baselinePrivilegeLevel: "READ_ONLY_BYTECODE_INSPECTOR",
    currentRiskScore: 18,
    riskLevel: "LOW",
    anomalyFlags: ["Mild heuristic scan frequency increase"],
    lastActive: "12 mins ago",
  },
];

export const INITIAL_SBOM_COMPONENTS: SbomComponentRecord[] = [
  {
    id: "sbom-01",
    name: "ethers",
    version: "6.17.0",
    ecosystem: "npm",
    license: "MIT",
    signatureVerified: true,
    sigstoreCosignStatus: "VALID_COSIGN_SIGNATURE",
    vulnerabilitiesCount: 0,
    provenanceAttestation: "npm provenance build verified via GitHub Actions OIDC",
  },
  {
    id: "sbom-02",
    name: "tokenworld-core-contracts",
    version: "3.8.2",
    ecosystem: "solidity",
    license: "MIT / Proprietary Mauro Lomibao Dar III",
    signatureVerified: true,
    sigstoreCosignStatus: "VALID_COSIGN_SIGNATURE",
    vulnerabilitiesCount: 0,
    provenanceAttestation: "Formal verification via Slither, Echidna & Certora prover",
  },
  {
    id: "sbom-03",
    name: "cilium-tetragon",
    version: "1.1.2",
    ecosystem: "container",
    license: "Apache-2.0",
    signatureVerified: true,
    sigstoreCosignStatus: "VALID_COSIGN_SIGNATURE",
    vulnerabilitiesCount: 0,
    provenanceAttestation: "Signed via Cosign with Fulcio OIDC keyless transparency log",
  },
  {
    id: "sbom-04",
    name: "express",
    version: "4.21.2",
    ecosystem: "npm",
    license: "MIT",
    signatureVerified: true,
    sigstoreCosignStatus: "VALID_COSIGN_SIGNATURE",
    vulnerabilitiesCount: 0,
    provenanceAttestation: "Audited against OpenSSF Scorecard; Score: 9.2/10",
  },
  {
    id: "sbom-05",
    name: "d3",
    version: "7.9.0",
    ecosystem: "npm",
    license: "ISC",
    signatureVerified: true,
    sigstoreCosignStatus: "VALID_COSIGN_SIGNATURE",
    vulnerabilitiesCount: 0,
    provenanceAttestation: "Verified upstream tag & cryptographic release tarball hash",
  },
];

export const LEGAL_DISCLOSURE_FRAMEWORKS: LegalDisclosureFramework[] = [
  {
    regulation: "SEC Form 8-K (Item 1.05 Material Cybersecurity Incidents)",
    authority: "U.S. Securities and Exchange Commission (SEC)",
    timeframeHours: 96, // 4 Business Days
    mandatoryTriggers: [
      "Material compromise of Token World ATS Central Limit Order Book or Trading Engine",
      "Unauthorized disruption of TREE3 digital asset settlement or liquidity reserves",
      "Exfiltration of subscriber non-public personal information (NPI) exceeding 500 accounts",
      "Any incident determined by the Board/Sole Owner to have material impact on operations or financial condition"
    ],
    statutoryReference: "17 CFR § 249.308, Item 1.05 & Release Nos. 33-11216; 34-97989",
    designatedSignatory: "Mauro Lomibao Dar III, Sole Owner & Principal",
    disclosureTemplate: `UNITED STATES SECURITIES AND EXCHANGE COMMISSION
Washington, D.C. 20549
FORM 8-K - CURRENT REPORT PURSUANT TO SECTION 13 OR 15(d) OF THE SECURITIES EXCHANGE ACT OF 1934
Date of Report: [INCIDENT_DATE]
TOKEN WORLD ALTERNATIVE TRADING SYSTEM (ATS)
Headquarters: 945 Westholme Ave, Los Angeles, CA 90024

Item 1.05 Material Cybersecurity Incidents.
On [DISCOVERY_DATE], Token World ATS identified an information security incident affecting [IMPACTED_SYSTEMS]. Upon discovery, Token World immediately activated its Maximum Security Incident Playbook under the direction of Sole Owner and Principal Mauro Lomibao Dar III.

Nature and Scope:
The incident involved [INCIDENT_SUMMARY]. Remediation controls, including micro-segmentation isolation and Zero Trust token revocation, were executed within [MTTR_MINUTES] minutes. Audit records preserved under SEC Rule 17a-4 WORM storage confirm that core ledger state and cryptographic asset reserves remain uncompromised.`,
  },
  {
    regulation: "NYDFS 23 NYCRR 500.17 Cybersecurity Event Notice",
    authority: "New York State Department of Financial Services (NYDFS)",
    timeframeHours: 72,
    mandatoryTriggers: [
      "Any cybersecurity event of which notice is required to any government or self-regulatory agency",
      "Any event with a reasonable likelihood of materially harming any normal operation of the entity",
      "Any ransomware deployment targeting financial infrastructure"
    ],
    statutoryReference: "23 NYCRR § 500.17(a)",
    designatedSignatory: "Mauro Lomibao Dar III, Chief Compliance Officer",
    disclosureTemplate: `TO: New York State Department of Financial Services (NYDFS) Cybersecurity Division
SUBJECT: 72-Hour Formal Notice of Cybersecurity Event (23 NYCRR § 500.17)
ENTITY: Token World ATS / Enterprise Reserve Network
PRINCIPAL: Mauro Lomibao Dar III

Please be advised that on [TIMESTAMP], Token World ATS registered a cybersecurity incident triggering 72-hour regulatory notification thresholds. Containment has been achieved via kernel-level eBPF isolation and WORM cryptographic audit record immutability. Formal forensic addendum will follow pursuant to Section 500.17.`,
  },
  {
    regulation: "GDPR Article 33 Personal Data Breach Notification",
    authority: "European Data Protection Board / Lead Supervisory Authority",
    timeframeHours: 72,
    mandatoryTriggers: [
      "Breach leading to accidental or unlawful destruction, loss, alteration, unauthorized disclosure of or access to personal data",
      "Likely risk to the rights and freedoms of natural persons"
    ],
    statutoryReference: "Regulation (EU) 2016/679, Article 33",
    designatedSignatory: "Mauro Lomibao Dar III, Data Protection Officer",
    disclosureTemplate: `FORMAL NOTIFICATION OF A PERSONAL DATA BREACH TO THE SUPERVISORY AUTHORITY (GDPR Art. 33)
Controller: Token World ATS (Headquarters: 945 Westholme Ave, Los Angeles, CA 90024)
Designated Contact: Mauro Lomibao Dar III
Nature of breach: [BREACH_DETAILS]
Categories of data subjects: [SUBSCRIBERS_COUNT]
Mitigating measures applied: Immediate encryption re-keying, ZTA credential invalidation, and WORM forensic preservation.`,
  },
  {
    regulation: "FINRA Rule 4530 & SEC Reg SCI Immediate Disruption Notice",
    authority: "FINRA Market Regulation & SEC Division of Trading and Markets",
    timeframeHours: 24,
    mandatoryTriggers: [
      "Systems disruption, systems compliance issue, or systems intrusion affecting ATS trading execution",
      "Order entry latency anomaly exceeding 500ms or order book matching disruption"
    ],
    statutoryReference: "FINRA Rule 4530(a) & 17 CFR § 242.1002 (Reg SCI)",
    designatedSignatory: "Mauro Lomibao Dar III, Principal Executive Officer",
    disclosureTemplate: `REGULATORY NOTICE: SEC REG SCI / FINRA RULE 4530 IMMEDIATE NOTIFICATION
Venue: Token World ATS
Principal: Mauro Lomibao Dar III
Event Type: Reg SCI Systems Safeguard Activation
Timestamp: [TIMESTAMP]
Description: Systems intrusion attempt thwarted by synchronous eBPF micro-segmentation and Zero Trust access filters. All subscriber order book transactions remain intact with zero financial slippage.`,
  },
];

/* =========================================================================
   3. EXPORT HELPERS AND ACTION SIMULATORS
   ========================================================================= */

export function generateSec8kDraft(incidentSummary: string, systemsImpacted: string): string {
  const template = LEGAL_DISCLOSURE_FRAMEWORKS[0].disclosureTemplate;
  const now = new Date().toISOString();
  return template
    .replace("[INCIDENT_DATE]", now.split("T")[0])
    .replace("[DISCOVERY_DATE]", now)
    .replace("[IMPACTED_SYSTEMS]", systemsImpacted)
    .replace("[INCIDENT_SUMMARY]", incidentSummary)
    .replace("[MTTR_MINUTES]", "4.2");
}

export function generateExecutiveBriefingReport(kpis: SecurityMetricKpi[], events: SiemEventRecord[]): string {
  const dateStr = new Date().toISOString();
  return `TOKEN WORLD ATS - MAXIMUM SECURITY LIFECYCLE EXECUTIVE BRIEFING
=================================================================================
Report Generated: ${dateStr}
Sole Owner & Principal: Mauro Lomibao Dar III
Headquarters: 945 Westholme Ave, Los Angeles, CA 90024
Operating Posture: Maximum Security Active & Fully Deployed

EXECUTIVE TELEMETRY DASHBOARD SUMMARY
---------------------------------------------------------------------------------
• Mean Time to Detect (MTTD): ${kpis.find((k) => k.id === "mttd")?.value} mins (Target < 5.0m) [OPTIMAL]
• Mean Time to Respond (MTTR): ${kpis.find((k) => k.id === "mttr")?.value} mins (Target < 15.0m) [OPTIMAL]
• Breach & Attack Simulation (BAS) Pass Rate: ${kpis.find((k) => k.id === "bas_pass_rate")?.value}% [OPTIMAL]
• 3rd-Party Risk SLA Remediation: ${kpis.find((k) => k.id === "third_party_remediation")?.value} days [OPTIMAL]
• UEBA Anomaly Score: ${kpis.find((k) => k.id === "ueba_anomaly_score")?.value} / 100 [NORMAL BASELINE]
• WORM Immutable Records Sealed: ${kpis.find((k) => k.id === "worm_immutable_count")?.value} [COMPLIANT]
• Active Deception Deflections: ${kpis.find((k) => k.id === "deception_probes")?.value} Probes Neutralized

POLICY AS CODE & INFRASTRUCTURE BASELINE
---------------------------------------------------------------------------------
1. Zero Trust Identity Mapping: OIDC + SPIFFE/SPIRE Workload Attestation [AUDITED & ACTIVE]
2. Microsegmentation: Calico GlobalNetworkPolicy + Cilium eBPF L7 Filters [ENFORCED]
3. WORM Storage: AWS S3 Object Lock Compliance Mode (7-Year Statutory Hold) [SEALED]
4. Node Hardening: CIS Benchmark Level 2 + Immutable Auditd Rules [ACTIVE]
5. Supply Chain Verification: Sigstore Cosign + CycloneDX/SPDX SBOM [VERIFIED]

RECENT SIEM TELEMETRY AUDIT TRAIL (LAST 5 EVENTS)
---------------------------------------------------------------------------------
${events.map((e) => `[${e.timestamp}] [${e.severity}] ${e.sourceSubsystem} -> ${e.eventType} | Action: ${e.actionTaken} | Hash: ${e.cryptographicHash.slice(0, 18)}...`).join("\n")}

LEGAL & CRISIS GOVERNANCE MANDATES
---------------------------------------------------------------------------------
• SEC Form 8-K Item 1.05 4-Day Trigger: Standing ready, zero material breaches
• NYDFS 72-Hour Notice: Standing ready
• GDPR Article 33: Standing ready
• Reg SCI / FINRA 4530: Automated incident telemetry linked to compliance log

AUTHORIZATION & ATTESTATION:
Signed: Mauro Lomibao Dar III
Sole Owner, Principal & Compliance Super-Admin
=================================================================================`;
}
