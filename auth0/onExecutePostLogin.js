/**
 * Token World Exchange ATS - Auth0 Post-Login Action Script
 * Deliverable A: onExecutePostLogin
 * 
 * Runs automatically upon user authentication in Auth0 Universal Login / Social (Google/Gmail).
 * Checks if user metadata is initialized. If not, provisions default Free Tier 1 membership,
 * and injects custom namespaced claims into the Access Token and ID Token.
 * 
 * @param {Event} event - Details about the user and login context.
 * @param {Api} api - Methods to modify the token and login flow.
 */
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://tokenworldexchange.com/claims';
  
  // 1. Initialize default app_metadata if it doesn't exist (e.g., first social login via Google)
  let appMetadata = event.user.app_metadata || {};
  let isUpdated = false;

  if (!appMetadata.membership_tier) {
    appMetadata.membership_tier = 'FREE_TIER_1';
    isUpdated = true;
  }
  
  if (!appMetadata.ats_account_status) {
    appMetadata.ats_account_status = 'ACTIVE';
    isUpdated = true;
  }

  if (!appMetadata.roles) {
    appMetadata.roles = ['MEMBER'];
    isUpdated = true;
  }

  // Persist changes to Auth0 user profile if defaults were assigned
  if (isUpdated) {
    // Native Auth0 Actions API (persists synchronously without external API latency)
    if (api.user && typeof api.user.setAppMetadata === 'function') {
      api.user.setAppMetadata('membership_tier', appMetadata.membership_tier);
      api.user.setAppMetadata('ats_account_status', appMetadata.ats_account_status);
      api.user.setAppMetadata('roles', appMetadata.roles);
    }

    // Auth0 Management Client API (using event.secrets)
    if (event.secrets && event.secrets.auth0Domain) {
      try {
        const { ManagementClient } = require('auth0');
        const management = new ManagementClient({
          domain: event.secrets.auth0Domain,
          clientId: event.secrets.auth0ClientId,
          clientSecret: event.secrets.auth0ClientSecret,
        });

        await management.users.updateAppMetadata(
          { id: event.user.user_id },
          appMetadata
        );
      } catch (error) {
        console.error('Failed to initialize default user app_metadata via ManagementClient:', error);
      }
    }
  }

  // 2. Append custom claims to ID Token and Access Token
  api.accessToken.setCustomClaim(`${namespace}/membership_tier`, appMetadata.membership_tier);
  api.accessToken.setCustomClaim(`${namespace}/ats_account_status`, appMetadata.ats_account_status);
  api.accessToken.setCustomClaim(`${namespace}/roles`, appMetadata.roles);

  api.idToken.setCustomClaim(`${namespace}/membership_tier`, appMetadata.membership_tier);
  api.idToken.setCustomClaim(`${namespace}/ats_account_status`, appMetadata.ats_account_status);
  api.idToken.setCustomClaim(`${namespace}/roles`, appMetadata.roles);
};
