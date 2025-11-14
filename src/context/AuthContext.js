import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Config,
  OAuth2Client,
  TokenManager,
  UserManager,
  FRUser,
} from "@forgerock/javascript-sdk";
import { useNavigate } from "react-router-dom";
import forgerockConfig, {
  isForgeRockLive,
  providerName,
} from "../config/forgerock";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  /**
   * Generate random state for OAuth security
   */
  const generateRandomState = () => {
    const randomPart = Math.random().toString(36).substring(2, 15);
    const timePart = Date.now().toString(36);
    return `${randomPart}${timePart}`;
  };

  /**
   * Generate PKCE code verifier (43-128 characters)
   */
  const generateCodeVerifier = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let result = "";
    for (let i = 0; i < 128; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  /**
   * Generate PKCE code challenge (S256 - SHA256)
   */
  const generateCodeChallenge = async (codeVerifier) => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);

      return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
    } catch (error) {
      console.error(
        `[${providerName} Auth] Error generating code challenge:`,
        error
      );
      return "";
    }
  };

  // ========================================
  // AUTHENTICATION FUNCTIONS
  // ========================================

  /**
   * Load user information from UserManager
   */
  const loadUserInfo = async () => {
    try {
      console.log(`[${providerName} Auth] Loading user info...`);
      const userInfo = await UserManager.getCurrentUser();
      if (userInfo) {
        console.log(`[${providerName} Auth] User info loaded successfully:`, {
          email: userInfo.email,
          name: userInfo.name,
          id: userInfo.id,
        });
        setIsAuthenticated(true);
        setUser(userInfo);
        setEmail(userInfo.email || userInfo.name || "");
        console.log(`[${providerName} Auth] User authenticated successfully`);
        return true;
      } else {
        console.warn(
          `[${providerName} Auth] No user info returned from UserManager`
        );
        setIsAuthenticated(false);
        setUser(null);
        setEmail("");
        return false;
      }
    } catch (error) {
      console.error(`[${providerName} Auth] Error loading user info:`, error);
      console.error(`[${providerName} Auth] Error details:`, {
        message: error.message,
        stack: error.stack,
      });
      setIsAuthenticated(false);
      setUser(null);
      setEmail("");
      return false;
    }
  };

  /**
   * Handle OAuth callback - exchange code for tokens
   */
  const handleOAuthCallback = async (code, state) => {
    try {
      console.log(
        `[${providerName} Auth] Getting tokens from OAuth callback...`
      );

      const tokens = await OAuth2Client.getTokens();

      if (tokens && tokens.accessToken) {
        console.log(
          `[${providerName} Auth] Tokens received successfully from OAuth callback`
        );

        // Load and validate user info
        try {
          const userLoaded = await loadUserInfo();
          if (userLoaded) {
            console.log(`[${providerName} Auth] User info loaded successfully`);
            setIsAuthenticated(true);
          }
        } catch (userInfoError) {
          console.warn(
            `[${providerName} Auth] Could not load user info, but tokens are valid:`,
            userInfoError.message
          );
          // Still consider user authenticated even if user info fails
          setIsAuthenticated(true);
        }

        // Clean up URL parameters
        try {
          const cleanPath = window.location.pathname || "/";
          window.history.replaceState({}, document.title, cleanPath);
          console.log(
            `[${providerName} Auth] URL cleaned up after successful authentication`
          );
        } catch (error) {
          console.warn(
            `[${providerName} Auth] Could not clean up URL:`,
            error.message
          );
        }

        // Wait for state to update before navigation
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Navigate to home
        console.log(
          `[${providerName} Auth] Authentication successful, redirecting to home...`
        );
        navigate("/", { replace: true });
      } else {
        console.warn(
          `[${providerName} Auth] No access token in OAuth callback response`
        );
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error(
        `[${providerName} Auth] Error handling OAuth callback:`,
        error
      );
      console.error(`[${providerName} Auth] OAuth callback error details:`, {
        message: error.message,
        stack: error.stack,
        code: code?.substring(0, 10) + "...",
        state: state?.substring(0, 10) + "...",
        errorType: error.constructor?.name,
      });

      // Log specific error conditions
      if (error.message?.includes("redirect_uri_mismatch")) {
        console.error(
          `[${providerName} Auth] ❌ REDIRECT URI MISMATCH - Verify redirect_uri in ForgeRock config matches exactly with registered URI`
        );
      }
      if (error.message?.includes("invalid_client")) {
        console.error(
          `[${providerName} Auth] ❌ INVALID CLIENT - Verify client_id is correct and registered`
        );
      }
      if (
        error.message?.includes("timeout") ||
        error.message?.includes("network")
      ) {
        console.error(
          `[${providerName} Auth] ❌ NETWORK/TIMEOUT ERROR - Check ForgeRock server availability`
        );
      }

      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  /**
   * Check for existing tokens and restore session, or redirect to login
   */
  const checkAndRestoreTokensOrRedirect = async (redirectUri) => {
    try {
      console.log(
        `[${providerName} Auth] Attempting to restore existing session...`
      );

      let tokens = null;

      if (!isForgeRockLive) {
        // PingOne: Use Promise.race to avoid iframe-based token renewal issues
        try {
          tokens = await Promise.race([
            TokenManager.getTokens(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Token check timeout")), 2000)
            ),
          ]);
        } catch (timeoutError) {
          console.log(
            `[${providerName} Auth] Token check timed out (PingOne) - will redirect to login`
          );
          tokens = null;
        }
      } else {
        // ForgeRock: Direct token check
        tokens = await TokenManager.getTokens();
      }

      if (tokens && tokens.accessToken) {
        console.log(
          `[${providerName} Auth] Found existing valid tokens - restoring session...`
        );

        try {
          const userLoaded = await loadUserInfo();
          if (userLoaded) {
            console.log(
              `[${providerName} Auth] User info loaded from existing session`
            );
            setIsAuthenticated(true);
            setIsLoading(false);
          } else {
            throw new Error("Failed to load user info");
          }
        } catch (userInfoError) {
          console.warn(
            `[${providerName} Auth] Could not load user info with existing tokens:`,
            userInfoError.message
          );
          // Token exists but user info failed - might be expired
          // Mark as authenticated but will need to refresh
          setIsAuthenticated(true);
          setIsLoading(false);
        }
      } else {
        console.log(
          `[${providerName} Auth] No valid existing tokens - redirecting to ForgeRock login...`
        );
        setIsAuthenticated(false);
        setIsLoading(false);

        // AUTOMATIC REDIRECT TO FORGEROCK LOGIN
        await redirectToForgeRockLogin(redirectUri);
      }
    } catch (error) {
      console.log(
        `[${providerName} Auth] Token restoration failed:`,
        error.message
      );
      console.log(`[${providerName} Auth] Redirecting to ForgeRock login...`);
      setIsAuthenticated(false);
      setIsLoading(false);

      // AUTOMATIC REDIRECT TO FORGEROCK LOGIN
      await redirectToForgeRockLogin(redirectUri);
    }
  };

  /**
   * Redirect user to ForgeRock login page
   */
  const redirectToForgeRockLogin = async (redirectUri) => {
    try {
      console.log(
        `[${providerName} Auth] Initiating login redirect to ForgeRock...`
      );

      // Try using SDK's authorize method first
      try {
        console.log(
          `[${providerName} Auth] Attempting to use SDK authorize method...`
        );
        const loginResult = await OAuth2Client.authorize({
          redirectUri: redirectUri,
        });
        console.log(`[${providerName} Auth] SDK authorize method initiated`);
        return;
      } catch (sdkError) {
        console.log(
          `[${providerName} Auth] SDK authorize failed, using fallback redirect:`,
          sdkError.message
        );
      }

      // FALLBACK: Manual redirect to authorize endpoint
      const baseUrl = forgerockConfig.serverConfig?.baseUrl;
      const realmPath =
        forgerockConfig.serverConfig?.realmPath || forgerockConfig.realmPath;

      if (!baseUrl || !realmPath) {
        console.error(
          `[${providerName} Auth] Cannot build authorize URL - missing baseUrl or realmPath`
        );
        return;
      }

      // Generate state and PKCE challenge for security
      const state = generateRandomState();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store state and code verifier in sessionStorage for callback validation
      sessionStorage.setItem(`${providerName}_state`, state);
      sessionStorage.setItem(`${providerName}_codeVerifier`, codeVerifier);

      const authParams = new URLSearchParams({
        client_id: forgerockConfig.clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: forgerockConfig.scope,
        state: state,
        code_challenge_method: "S256",
        code_challenge: codeChallenge,
      });

      // Add auth_chain (tree) if configured
      if (isForgeRockLive && forgerockConfig.tree) {
        authParams.append("auth_chain", forgerockConfig.tree);
      }

      const authorizeUrl = `${baseUrl}/oauth2/realms/root/realms/${realmPath}/authorize?${authParams}`;

      console.log(
        `[${providerName} Auth] Redirecting to ForgeRock authorize endpoint...`
      );
      console.log(
        `[${providerName} Auth] Authorize URL:`,
        authorizeUrl.substring(0, 100) + "..."
      );

      // Perform browser redirect - this will load ForgeRock login page
      window.location.href = authorizeUrl;
    } catch (error) {
      console.error(
        `[${providerName} Auth] Error redirecting to ForgeRock login:`,
        error
      );
      console.error(`[${providerName} Auth] Redirect error details:`, {
        message: error.message,
        stack: error.stack,
      });
    }
  };

  // ========================================
  // INITIALIZATION - Main useEffect
  // ========================================

  useEffect(() => {
    const initializeForgeRock = async () => {
      try {
        console.log(
          `[${providerName} Auth] Initializing ${providerName} SDK...`
        );
        console.log(`[${providerName} Auth] Configuration:`, {
          provider: providerName,
          clientId: forgerockConfig.clientId,
          redirectUri: forgerockConfig.redirectUri,
          scope: forgerockConfig.scope,
          baseUrl: forgerockConfig.serverConfig?.baseUrl,
          realmPath:
            forgerockConfig.serverConfig?.realmPath ||
            forgerockConfig.realmPath,
        });

        // Step 1: Determine and validate redirectUri
        let redirectUri = forgerockConfig.redirectUri;

        if (!isForgeRockLive) {
          // PingOne: redirectUri should be root path
          if (redirectUri && !redirectUri.startsWith(window.location.origin)) {
            console.warn(
              `[${providerName} Auth] Config redirectUri doesn't match current origin. Using current origin`,
              {
                configRedirectUri: redirectUri,
                currentOrigin: window.location.origin,
                using: window.location.origin,
              }
            );
            redirectUri = window.location.origin;
          } else if (!redirectUri) {
            redirectUri = window.location.origin;
          }
        } else {
          // ForgeRock: redirectUri should include /callback path
          if (!redirectUri) {
            redirectUri = `${window.location.origin}/callback`;
          }
        }

        console.log(`[${providerName} Auth] Using redirectUri:`, redirectUri);

        // Step 2: Build serverConfig based on provider
        const serverConfig = {};

        if (isForgeRockLive) {
          // ForgeRock OpenAM
          const baseUrl = forgerockConfig.serverConfig?.baseUrl;
          const realmPath =
            forgerockConfig.serverConfig?.realmPath ||
            forgerockConfig.realmPath;

          if (baseUrl && realmPath) {
            // CORRECT: Use OpenID Discovery endpoint
            const wellknownUrl = `${baseUrl}/oauth2/realms/root/realms/${realmPath}/.well-known/openid-configuration`;
            // https://wfcssodev1.nhes.nh.gov.143/sso/oauth2/realms/root/realms/wfcnhes/.well-known/openid-configuration

            serverConfig.wellknown = wellknownUrl;
            console.log(
              `[${providerName} Auth] Constructed well-known endpoint:`,
              wellknownUrl
            );
          } else {
            console.error(
              `[${providerName} Auth] Missing baseUrl or realmPath configuration`
            );
            if (baseUrl) serverConfig.baseUrl = baseUrl;
            if (realmPath) serverConfig.realmPath = realmPath;
          }
          serverConfig.timeout = forgerockConfig.serverConfig?.timeout || 30000;
        } else {
          // PingOne
          if (forgerockConfig.serverConfig?.wellknown) {
            serverConfig.wellknown = forgerockConfig.serverConfig.wellknown;
          }
          serverConfig.timeout = forgerockConfig.serverConfig?.timeout || 3000;
        }

        // Step 3: Build configuration object
        const configObject = {
          clientId: forgerockConfig.clientId,
          redirectUri: redirectUri,
          scope: forgerockConfig.scope,
          serverConfig: serverConfig,
        };

        // Add tree if configured (ForgeRock only)
        if (isForgeRockLive && forgerockConfig.tree) {
          configObject.tree = forgerockConfig.tree;
        }

        // PingOne: Configure token storage
        if (!isForgeRockLive) {
          configObject.tokenStore = {
            storage: window.localStorage,
          };
        }

        // Step 4: Set SDK configuration
        const result = await Config.setAsync(configObject);
        console.log(
          `[${providerName} Auth] SDK configuration set successfully:`,
          result
        );

        // Step 5: Parse URL parameters for OAuth callback
        let urlParams;
        let code, state;
        let currentPath = "unknown";

        try {
          urlParams = new URLSearchParams(window.location.search);
          code = urlParams.get("code");
          state = urlParams.get("state");
          currentPath = window.location.pathname || "unknown";
        } catch (error) {
          console.warn(
            `[${providerName} Auth] Could not access location properties:`,
            error.message
          );
          try {
            const search =
              window.location?.search || document.location?.search || "";
            urlParams = new URLSearchParams(search);
            code = urlParams.get("code");
            state = urlParams.get("state");
          } catch (e) {
            console.warn(
              `[${providerName} Auth] Could not parse URL parameters`
            );
          }
        }

        console.log(`[${providerName} Auth] URL parameters:`, {
          hasCode: !!code,
          hasState: !!state,
          currentPath: currentPath,
        });

        // Step 6: Handle OAuth callback or check for existing tokens
        if (code && state) {
          console.log(
            `[${providerName} Auth] OAuth callback detected - exchanging code for tokens...`
          );
          await handleOAuthCallback(code, state);
        } else {
          console.log(
            `[${providerName} Auth] No OAuth callback - checking for existing tokens...`
          );
          await checkAndRestoreTokensOrRedirect(redirectUri);
        }
      } catch (error) {
        console.error(
          `[${providerName} Auth] Error initializing ${providerName}:`,
          error
        );
        console.error(`[${providerName} Auth] Initialization error details:`, {
          message: error.message,
          stack: error.stack,
        });
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    };

    initializeForgeRock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========================================
  // LOGIN FUNCTION
  // ========================================

  const login = async () => {
    try {
      console.log(`[${providerName} Auth] Initiating login flow...`);
      console.log(
        `[${providerName} Auth] Redirect URI:`,
        forgerockConfig.redirectUri
      );
      setIsLoading(true);

      // Try SDK's authorize method first
      try {
        console.log(
          `[${providerName} Auth] Attempting SDK authorize redirect...`
        );
        const tokens = await OAuth2Client.authorize({
          redirectUri:
            forgerockConfig.redirectUri || `${window.location.origin}/callback`,
        });
        console.log(`[${providerName} Auth] SDK authorize initiated`);
        return;
      } catch (sdkError) {
        console.log(
          `[${providerName} Auth] SDK authorize failed, using fallback...`,
          sdkError.message
        );
      }

      // FALLBACK: Manual redirect
      const redirectUri =
        forgerockConfig.redirectUri ||
        (isForgeRockLive
          ? `${window.location.origin}/callback`
          : window.location.origin);

      await redirectToForgeRockLogin(redirectUri);
    } catch (error) {
      console.error(`[${providerName} Auth] Login error:`, error);
      console.error(`[${providerName} Auth] Login error details:`, {
        message: error.message,
        stack: error.stack,
      });
      setIsLoading(false);
    }
  };

  // ========================================
  // LOGOUT FUNCTION
  // ========================================

  const logout = async () => {
    try {
      console.log(`[${providerName} Auth] Initiating logout...`);

      // PingOne requires logoutRedirectUri, ForgeRock may not
      if (!isForgeRockLive) {
        // PingOne: logoutRedirectUri is required
        await FRUser.logout({
          logoutRedirectUri: window.location.origin,
        });
      } else {
        // ForgeRock: Try without logoutRedirectUri first
        try {
          await FRUser.logout();
        } catch (e) {
          // If that fails, try with logoutRedirectUri
          await FRUser.logout({
            logoutRedirectUri: window.location.origin,
          });
        }
      }

      console.log(`[${providerName} Auth] Logout successful`);
      setIsAuthenticated(false);
      setUser(null);
      setEmail("");

      // Navigate to home
      navigate("/");
    } catch (error) {
      console.error(`[${providerName} Auth] Logout error:`, error);
      console.error(`[${providerName} Auth] Logout error details:`, {
        message: error.message,
        stack: error.stack,
      });
      // Even if logout fails, clear local state
      console.log(
        `[${providerName} Auth] Clearing local state despite logout error`
      );
      setIsAuthenticated(false);
      setUser(null);
      setEmail("");
      navigate("/");
    }
  };

  // ========================================
  // CHECK AUTHENTICATION (Manual check method)
  // ========================================

  const checkAuthentication = async () => {
    try {
      console.log(`[${providerName} Auth] Checking authentication status...`);

      let tokens;

      if (!isForgeRockLive) {
        // PingOne: Use Promise.race to avoid iframe issues
        try {
          tokens = await Promise.race([
            TokenManager.getTokens(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Token check timeout")), 5000)
            ),
          ]);
        } catch (tokenError) {
          if (
            tokenError.message?.includes("timeout") ||
            tokenError.message?.includes("iframe")
          ) {
            console.warn(
              `[${providerName} Auth] Token check timed out or iframe blocked.`
            );
            try {
              tokens = await TokenManager.getTokens();
            } catch (e) {
              console.log(`[${providerName} Auth] No tokens available`);
              tokens = null;
            }
          } else {
            throw tokenError;
          }
        }
      } else {
        // ForgeRock: Normal token check
        tokens = await TokenManager.getTokens();
      }

      if (tokens && tokens.accessToken) {
        const now = Math.floor(Date.now() / 1000);
        const tokenExp = tokens.accessToken?.expiresAt || tokens.expiresAt;

        if (tokenExp && tokenExp > now) {
          console.log(`[${providerName} Auth] Valid tokens found`);
          await loadUserInfo();
        } else {
          console.log(`[${providerName} Auth] Tokens expired`);
          setIsAuthenticated(false);
          setUser(null);
          setEmail("");
        }
      } else {
        console.log(`[${providerName} Auth] No valid tokens found`);
        setIsAuthenticated(false);
        setUser(null);
        setEmail("");
      }
    } catch (error) {
      console.error(
        `[${providerName} Auth] Error checking authentication:`,
        error
      );
      setIsAuthenticated(false);
      setUser(null);
      setEmail("");
    } finally {
      setIsLoading(false);
    }
  };

  // ========================================
  // CONTEXT VALUE AND PROVIDER
  // ========================================

  const value = {
    isAuthenticated,
    isLoading,
    user,
    email,
    login,
    logout,
    checkAuthentication,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
