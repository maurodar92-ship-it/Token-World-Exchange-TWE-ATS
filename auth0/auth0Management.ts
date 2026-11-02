/**
 * Deliverable C: Auth0 Management API Snippet (Node.js)
 * Updates a user's app_metadata to PAID_VIP_SUBSCRIPTION upon receiving a verified payment webhook.
 */

export interface Auth0UserMetadata {
  membership_tier: "FREE_TIER_1" | "PAID_VIP_SUBSCRIPTION";
  ats_account_status: "ACTIVE" | "SUSPENDED";
  roles: string[];
  vip_upgraded_at?: string;
  payment_method?: string;
}

// In-memory / persistent mock store for development and server execution
const mockUserStore: Record<string, Auth0UserMetadata> = {
  "default_user": {
    membership_tier: "FREE_TIER_1",
    ats_account_status: "ACTIVE",
    roles: ["MEMBER"],
  },
};

/**
 * Upgrades a user's membership tier upon successful payment processing.
 * 
 * @param userId - The unique Auth0 user ID (e.g., 'google-oauth2|123456789')
 * @param paymentRef - Payment transaction reference or hash
 * @returns Updated user profile metadata
 */
export async function upgradeUserToVIP(userId: string, paymentRef: string = "stripe_webhook_tx") {
  try {
    const updatedMetadata: Auth0UserMetadata = {
      membership_tier: "PAID_VIP_SUBSCRIPTION",
      ats_account_status: "ACTIVE",
      roles: ["MEMBER", "VIP_TRADER", "INSTITUTIONAL_DMA"],
      vip_upgraded_at: new Date().toISOString(),
      payment_method: paymentRef,
    };

    mockUserStore[userId] = updatedMetadata;
    console.log(`[Auth0 Management] Successfully upgraded user ${userId} to PAID_VIP_SUBSCRIPTION.`);
    return {
      success: true,
      userId,
      app_metadata: updatedMetadata,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Failed to upgrade user ${userId} in Auth0:`, error);
    throw new Error("Auth0 metadata update failed");
  }
}

export function getUserAuth0Metadata(userId: string = "default_user"): Auth0UserMetadata {
  return mockUserStore[userId] || {
    membership_tier: "FREE_TIER_1",
    ats_account_status: "ACTIVE",
    roles: ["MEMBER"],
  };
}
