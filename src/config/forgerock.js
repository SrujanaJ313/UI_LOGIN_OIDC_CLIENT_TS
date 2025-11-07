/**
 * ForgeRock Configuration
 * This configuration object is compatible with Config.get() from @forgerock/javascript-sdk
 *
 * IMPORTANT: All values below must be obtained from your ForgeRock server administrator
 * or configured in your ForgeRock Identity Cloud/AM instance.
 *
 * Organization Configuration Reference:
 * - OIDC Authority: https://wfcssodev1.nhes.nh.gov/sso/oauth2/realms/root/realms/wfcnhes
 * - Realm: wfcnhes
 * - Auth Server URL: https://wfcssodev1.nhes.nh.gov/sso/
 * - Public Client: true (PKCE flow)
 * - CORS: Enabled
 */
export const forgerockConfig = {
  /**
   * Client ID (REQUIRED FROM SERVER)
   * - This is the OAuth2/OIDC client identifier registered in ForgeRock
   * - Must match the client ID configured in ForgeRock's OAuth2 client settings
   * - Typically configured in: ForgeRock AM > Applications > OAuth 2.0 > Clients
   * - Organization Value: "reactClientPKCE"
   * - Server Location: ForgeRock AM Console > Applications > OAuth 2.0 > Clients > [Your Client] > Core tab
   */
  clientId: "reactClientPKCE",

  /**
   * Redirect URI (REQUIRED FROM SERVER)
   * - This is the callback URL where ForgeRock redirects after authentication
   * - Must exactly match one of the redirect URIs configured in ForgeRock client settings
   * - Must be registered in ForgeRock's allowed redirect URIs list
   * - Format: "http://localhost:3000/callback" (development) or "https://yourdomain.com/callback" (production)
   * - Organization Value: "http://localhost:3000/callback"
   * - Server Location: ForgeRock AM Console > Applications > OAuth 2.0 > Clients > [Your Client] > Core tab > Redirect URIs
   * - NOTE: For production, update this to your production domain
   */
  redirectUri: "http://localhost:3000/callback",

  /**
   * OAuth2 Scopes (REQUIRED FROM SERVER)
   * - Space-separated list of OAuth2 scopes to request during authentication
   * - "openid" - Required for OpenID Connect (OIDC) authentication
   * - "profile" - Requests user profile information (name, etc.)
   * - "email" - Requests user email address
   * - Additional scopes may be available based on server configuration
   * - Organization Value: "openid profile email"
   * - Server Location: ForgeRock AM Console > Applications > OAuth 2.0 > Clients > [Your Client] > Advanced tab > Scopes
   * - NOTE: Ensure these scopes are enabled/allowed for your client in ForgeRock
   */
  scope: "openid profile email",

  /**
   * Server Configuration (REQUIRED FROM SERVER)
   */
  serverConfig: {
    /**
     * Base URL (REQUIRED FROM SERVER)
     * - The base URL of your ForgeRock Access Management (AM) server
     * - This is the root URL where ForgeRock AM is hosted
     * - Format: "https://your-forgerock-server.com/am" or "https://your-forgerock-server.com/sso"
     * - Do NOT include the realm path here (use realmPath below)
     * - Organization Value: "https://wfcssodev1.nhes.nh.gov/sso"
     * - Server Location: Provided by your ForgeRock administrator
     * - NOTE: This matches the auth-server-url from organization config
     */
    baseUrl: "https://wfcssodev1.nhes.nh.gov/sso",
  },

  /**
   * Realm Path (REQUIRED FROM SERVER)
   * - The ForgeRock realm path where your OAuth2 client is configured
   * - Realms are used to organize and isolate authentication configurations
   * - Format: "/realms/root/realms/[realm-name]" or "/realms/[realm-name]"
   * - Default realm is typically "/realms/root" or "/"
   * - Organization Value: "/realms/root/realms/wfcnhes"
   * - Organization Realm Name: "wfcnhes"
   * - Server Location: ForgeRock AM Console > Realms > [Your Realm] > Name
   * - NOTE: The realm path must match where your client is registered
   */
  realmPath: "/realms/root/realms/wfcnhes",

  /**
   * Authentication Tree/Journey (OPTIONAL - FROM SERVER)
   * - The name of the authentication tree/journey to use for login
   * - If undefined, ForgeRock will use the default authentication flow
   * - Only required if your server uses custom authentication journeys
   * - Server Location: ForgeRock AM Console > Authentication > Trees > [Your Tree Name]
   * - Example: "UsernamePassword", "MultiFactorAuth", "SocialLogin", etc.
   * - NOTE: Leave as undefined if using default authentication flow
   */
  tree: undefined, // Add your journey/tree name here if needed
};

/**
 * OIDC Configuration Reference (for documentation)
 * These values are provided by the organization and used for OIDC authentication:
 *
 * Full OIDC Authority URL: https://wfcssodev1.nhes.nh.gov/sso/oauth2/realms/root/realms/wfcnhes
 * - This is the complete OIDC issuer URL (baseUrl + /oauth2 + realmPath)
 *
 * Response Type: "code" (OAuth2 Authorization Code flow with PKCE)
 * - This is the standard response type for PKCE flow
 *
 * Server Configuration:
 * - Realm: "wfcnhes"
 * - Auth Server URL: "https://wfcssodev1.nhes.nh.gov/sso/"
 * - Public Client: true (PKCE client, no client secret required)
 * - CORS: Enabled (allows cross-origin requests)
 * - SSL Required: External (HTTPS required for external access)
 */

// Log configuration when module is loaded (for debugging)
console.log("[ForgeRock Config] Configuration loaded:", {
  clientId: forgerockConfig.clientId,
  redirectUri: forgerockConfig.redirectUri,
  scope: forgerockConfig.scope,
  baseUrl: forgerockConfig.serverConfig?.baseUrl,
  realmPath: forgerockConfig.realmPath,
  hasTree: !!forgerockConfig.tree,
  oidcAuthority: `${forgerockConfig.serverConfig?.baseUrl}/oauth2${forgerockConfig.realmPath}`,
  realm: "wfcnhes",
  publicClient: true,
  corsEnabled: true,
});

export default forgerockConfig;
