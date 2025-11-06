import { Config, OAuth2Client, TokenManager } from "@forgerock/javascript-sdk";
import storage from "../utils/storage";
import { jwtDecode } from "jwt-decode";

let accessToken = null;
let idToken = null;
let tokenRefreshTimerId = null;

const TOKEN_REFRESH_BUFFER_SECONDS = 5;

const scheduleTokenRefresh = () => {
  try {
    if (!accessToken || !accessToken.decoded) return;
    const exp = accessToken.decoded.payload && accessToken.decoded.payload.exp;
    if (!exp) return;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const secondsUntilExpiry = exp - nowSeconds;
    const refreshInMs = Math.max(
      (secondsUntilExpiry - TOKEN_REFRESH_BUFFER_SECONDS) * 1000,
      0
    );
    if (tokenRefreshTimerId) {
      clearTimeout(tokenRefreshTimerId);
      tokenRefreshTimerId = null;
    }
    console.log(
      `[Auth] Scheduling token refresh in ${Math.round(
        refreshInMs / 1000
      )}s (exp in ${secondsUntilExpiry}s)`
    );
    tokenRefreshTimerId = setTimeout(() => {
      console.log("[Auth] Token refresh timer fired");
      authService.refreshToken();
    }, refreshInMs);
  } catch (_) {}
};

const mapConfig = (cfg) => {
  // Handle ForgeRock config format
  const authority =
    cfg.authority ||
    cfg["auth-server-url"] ||
    cfg.authServerUrl ||
    cfg.issuer ||
    "";

  // Parse authority URL to extract baseUrl and realmPath
  // Example: https://wfcssodev1.nhes.nh.gov/sso/oauth2/realms/root/realms/wfcnhes
  let baseUrl = "";
  let realmPath = "";

  if (authority) {
    try {
      const url = new URL(authority);
      // Extract base URL (everything before /oauth2)
      const oauth2Index = url.pathname.indexOf("/oauth2");
      if (oauth2Index !== -1) {
        baseUrl = `${url.protocol}//${url.host}${url.pathname.substring(
          0,
          oauth2Index
        )}`;
        // Extract realm path (everything after /oauth2)
        realmPath = url.pathname.substring(oauth2Index + "/oauth2".length);
      } else {
        // Fallback: use host as base, path as realm
        baseUrl = `${url.protocol}//${url.host}`;
        realmPath = url.pathname;
      }
    } catch (e) {
      // Fallback parsing if URL parsing fails
      const match = authority.match(/^(https?:\/\/[^/]+)(\/.*)$/);
      if (match) {
        baseUrl = match[1];
        realmPath = match[2];
      }
    }
  }

  if (!authority) {
    console.warn(
      "[Auth] No authority provided in config; check forgeRock.json"
    );
  }
  console.log("[Auth] Parsed ForgeRock config", {
    baseUrl,
    realmPath,
    clientId: cfg.client_id || cfg.resource || cfg.clientId,
    redirectUri:
      cfg.redirect_uri ||
      cfg.redirectUri ||
      window.location.origin + "/callback",
  });

  return {
    clientId: cfg.client_id || cfg.resource || cfg.clientId,
    redirectUri:
      cfg.redirect_uri ||
      cfg.redirectUri ||
      window.location.origin + "/callback",
    scope: cfg.scope || "openid profile email",
    serverConfig: { baseUrl },
    realmPath: cfg.realmPath || cfg.realm || realmPath,
    // Enable PKCE (default in ForgeRock SDK, but explicit is better)
    tree: cfg.tree,
  };
};

const isAuthCodeCallbackFallback = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.has("code") && params.has("state");
  } catch (_) {
    return false;
  }
};

const initForgeRock = async (configOrPath, renderApp) => {
  try {
    let cfg = configOrPath;
    if (typeof configOrPath === "string") {
      console.log("[Auth] Fetching ForgeRock config from", configOrPath);
      const res = await fetch(configOrPath, { credentials: "include" });
      cfg = await res.json();
    }

    const frCfg = mapConfig(cfg || {});
    console.log("[Auth] Setting ForgeRock SDK config", frCfg);
    Config.set(frCfg);

    // If returning from the authorization server, exchange code for tokens
    // Avoid calling SDK helpers that may touch cross-origin frames; use safe URL check
    const isCallback = isAuthCodeCallbackFallback();
    if (isCallback) {
      console.log("[Auth] Handling auth code callback...");
      const tokens = await OAuth2Client.getTokens();
      if (tokens && tokens.accessToken) {
        accessToken = tokens.accessToken;
        idToken = tokens.idToken || null;
        storage.setToken(accessToken.value);
        scheduleTokenRefresh();
        console.log("[Auth] Tokens acquired on callback");
      }
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      if (typeof renderApp === "function") renderApp();
      return;
    }

    // Try to get existing tokens; if none, start authorization (SSO redirect)
    const tokens = await TokenManager.getTokens();
    if (!tokens || !tokens.accessToken) {
      console.warn(
        "[Auth] No existing tokens; redirecting for authorization..."
      );
      await OAuth2Client.authorize();
      return; // redirecting
    }

    accessToken = tokens.accessToken;
    idToken = tokens.idToken || null;

    // Persist raw access token for axios
    storage.setToken(accessToken.value);

    scheduleTokenRefresh();
    console.log("[Auth] Existing tokens loaded; rendering app");

    if (typeof renderApp === "function") renderApp();
  } catch (e) {
    console.error("ForgeRock initialization error:", e);
    // If anything fails, attempt auth redirect
    try {
      console.warn("[Auth] Attempting authorization after init failure...");
      await OAuth2Client.authorize();
    } catch (err) {
      console.error("ForgeRock authorization error:", err);
    }
  }
};

const doLogin = async () => {
  await OAuth2Client.authorize();
};

const doLogout = async () => {
  try {
    storage.clearToken();
    console.log("[Auth] Logging out via OAuth2Client.logout()");
    await OAuth2Client.logout();
  } catch (_) {}
};

const isLoggedIn = () => {
  return !!(accessToken && accessToken.value);
};

const getToken = () => {
  return (accessToken && accessToken.value) || storage.getToken();
};

const refreshToken = async (successCallback) => {
  try {
    console.log("[Auth] Forcing token renew...");
    const tokens = await TokenManager.getTokens({ forceRenew: true });
    if (tokens && tokens.accessToken) {
      accessToken = tokens.accessToken;
      idToken = tokens.idToken || idToken;
      storage.setToken(accessToken.value);
      scheduleTokenRefresh();
      console.log("[Auth] Token refresh successful");
      if (typeof successCallback === "function") successCallback();
    } else {
      console.warn(
        "[Auth] Token refresh returned no tokens; redirecting to authorize"
      );
      await OAuth2Client.authorize();
    }
  } catch (_) {
    console.error("[Auth] Token refresh failed; redirecting to authorize");
    await OAuth2Client.authorize();
  }
};

const getIdTokenPayload = () => {
  try {
    if (idToken && idToken.decoded && idToken.decoded.payload)
      return idToken.decoded.payload;
    const raw = storage.getToken();
    if (raw) return jwtDecode(raw);
  } catch (_) {}
  return {};
};

const getUserFullName = () => getIdTokenPayload().name;
const getLoginName = () =>
  getIdTokenPayload().preferred_username || getIdTokenPayload().email;
const getUserId = () => getIdTokenPayload().sub;

const getRoles = () => {
  const payload = getIdTokenPayload() || {};
  // Try common claim locations
  if (Array.isArray(payload.roles)) return payload.roles;
  if (payload.realm_access && Array.isArray(payload.realm_access.roles))
    return payload.realm_access.roles;
  return [];
};

const hasRole = (role) => {
  const roles = getRoles();
  return roles.includes(role);
};

const authService = {
  initForgeRock,
  initKeycloak: initForgeRock,
  doLogin,
  doLogout,
  isLoggedIn,
  getToken,
  refreshToken,
  getUserFullName,
  getLoginName,
  getUserId,
  getRoles,
  hasRole,
};

export default authService;
