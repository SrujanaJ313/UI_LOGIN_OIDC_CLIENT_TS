const IS_FORGE_ROCK_LIVE = process.env.REACT_APP_IS_FORGE_ROCK_LIVE === "true";

const pingOneConfig = {
  clientId: "98ce17ae-a0ee-4ecb-9b55-0c14f925eb82",
  redirectUri: "http://localhost:3000",
  scope: "openid profile email phone revoke",
  serverConfig: {
    wellknown:
      "https://auth.pingone.sg/59e310bf-7550-43e9-8f3e-91b0084e8efd/as/.well-known/openid-configuration",
    timeout: 3000,
  },
};

const forgerockOpenAMConfig = {
  clientId: "reactClientPKCE",
  redirectUri: "http://localhost:3000/callback",
  scope: process.env.REACT_APP_FORGEROCK_SCOPE || "openid profile email",
  serverConfig: {
    baseUrl: "https://wfcssodev1.nhes.nh.gov/sso",
    realmPath: "wfcnhes",
    timeout: 30000, // ⭐ IMPORTANT: Changed from 3000
  },
};

export const forgerockConfig = IS_FORGE_ROCK_LIVE
  ? forgerockOpenAMConfig
  : pingOneConfig;

export const isForgeRockLive = IS_FORGE_ROCK_LIVE;
export const providerName = IS_FORGE_ROCK_LIVE ? "ForgeRock OpenAM" : "PingOne";

console.log(`[${providerName} Config] Configuration loaded:`, {
  provider: providerName,
  isForgeRockLive: IS_FORGE_ROCK_LIVE,
  clientId: forgerockConfig.clientId,
  redirectUri: forgerockConfig.redirectUri,
  scope: forgerockConfig.scope,
  wellknown: forgerockConfig.serverConfig?.wellknown,
  baseUrl: forgerockConfig.serverConfig?.baseUrl,
  realmPath:
    forgerockConfig.serverConfig?.realmPath || forgerockConfig.realmPath,
  timeout: forgerockConfig.serverConfig?.timeout,
  tree: forgerockConfig.tree,
  publicClient: true,
  corsEnabled: true,
});

export default forgerockConfig;
