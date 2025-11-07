// src/forgerock-config.js

export const FORGEROCK_CONFIG = {
  // Your authority from the provided configuration
  authority:
    "https://wfcssodev1.nhes.nh.gov/sso/oauth2/realms/root/realms/wfcnhes",

  // OAuth2 Client Configuration
  clientId: "reactClientPKCE",

  // Redirect URI after authentication
  redirectUri: "http://localhost:3000/callback",

  // OAuth2 parameters
  responseType: "code",
  scope: "openid profile email",

  // Advanced settings
  automaticSilentRenew: true,
  loadUserInfo: true,

  // ForgeRock specific
  realm: "wfcnhes",
  realmPath: "/realms/root/realms/wfcnhes",
  authServerUrl: "https://wfcssodev1.nhes.nh.gov/sso",
  sslRequired: "external",
  resource: "reactClientPKCE",
  publicClient: true,
  enableCors: true,

  // Authentication tree (journey)
  tree: "UsernamePassword",

  // Timeout in milliseconds
  timeout: 30000,
};

// SDK-specific configuration
export const SDK_CONFIG = {
  clientId: FORGEROCK_CONFIG.clientId,
  redirectUri: FORGEROCK_CONFIG.redirectUri,
  scope: FORGEROCK_CONFIG.scope,
  serverConfig: {
    baseUrl: FORGEROCK_CONFIG.authServerUrl,
    timeout: FORGEROCK_CONFIG.timeout,
  },
  realmPath: FORGEROCK_CONFIG.realmPath,
  tree: FORGEROCK_CONFIG.tree,
};
