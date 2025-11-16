const forgerockOpenAMConfig = {
  clientId: "reactClientPKCE",
  redirectUri: "http://localhost:3000/callback",
  scope: process.env.REACT_APP_FORGEROCK_SCOPE || "openid profile email",
  serverConfig: {
    baseUrl: "https://wfcssodev1.nhes.nh.gov/sso",
    realmPath: "wfcnhes",
    timeout: 30000,
  },
};

export const forgerockConfig = forgerockOpenAMConfig;

export const isForgeRockLive = true;
export const providerName = "ForgeRock OpenAM";

console.log(`[${providerName} Config] Configuration loaded:`, {
  provider: providerName,
  isForgeRockLive: true,
  clientId: forgerockConfig.clientId,
  redirectUri: forgerockConfig.redirectUri,
  scope: forgerockConfig.scope,
  baseUrl: forgerockConfig.serverConfig?.baseUrl,
  realmPath:
    forgerockConfig.serverConfig?.realmPath || forgerockConfig.realmPath,
  timeout: forgerockConfig.serverConfig?.timeout,
  tree: forgerockConfig.tree,
  publicClient: true,
  corsEnabled: true,
});

export default forgerockConfig;
