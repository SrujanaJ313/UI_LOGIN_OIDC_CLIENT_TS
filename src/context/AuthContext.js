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
      } else {
        console.warn(
          `[${providerName} Auth] No user info returned from UserManager`
        );
        setIsAuthenticated(false);
        setUser(null);
        setEmail("");
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
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuthentication = async () => {
    try {
      console.log(`[${providerName} Auth] Checking authentication status...`);

      let tokens;

      // PingOne blocks iframes, so we need special handling
      // ForgeRock OpenAM may allow iframes, so we can use normal token check
      if (!isForgeRockLive) {
        // PingOne: Try to get tokens without triggering iframe-based renewal
        try {
          tokens = await Promise.race([
            TokenManager.getTokens(),
            new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(new Error("Token check timeout - avoiding iframe")),
                5000
              )
            ),
          ]);
        } catch (tokenError) {
          // If we get a timeout or iframe error, check if tokens exist in storage directly
          if (
            tokenError.message?.includes("timeout") ||
            tokenError.message?.includes("timed out") ||
            tokenError.message?.includes("Authorization timed out") ||
            tokenError.message?.includes("iframe")
          ) {
            console.warn(
              `[${providerName} Auth] Token check timed out or iframe blocked. Checking storage directly...`
            );
            try {
              tokens = await TokenManager.getTokens();
            } catch (e) {
              console.log(
                `[${providerName} Auth] No tokens available (iframe blocked or no tokens stored)`
              );
              tokens = null;
            }
          } else {
            throw tokenError;
          }
        }
      } else {
        // ForgeRock OpenAM: Normal token check (iframes may work)
        tokens = await TokenManager.getTokens();
      }

      if (tokens && tokens.accessToken) {
        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        const tokenExp = tokens.accessToken?.expiresAt || tokens.expiresAt;

        if (tokenExp && tokenExp > now) {
          console.log(`[${providerName} Auth] Valid tokens found:`, {
            hasAccessToken: !!tokens.accessToken,
            hasRefreshToken: !!tokens.refreshToken,
            hasIdToken: !!tokens.idToken,
            expiresAt: new Date(tokenExp * 1000).toISOString(),
          });
          await loadUserInfo();
        } else {
          console.log(
            `[${providerName} Auth] Tokens expired - user needs to re-authenticate`
          );
          setIsAuthenticated(false);
          setUser(null);
          setEmail("");
        }
      } else {
        console.log(
          `[${providerName} Auth] No valid tokens found - user not authenticated`
        );
        setIsAuthenticated(false);
        setUser(null);
        setEmail("");
      }
    } catch (error) {
      // Handle specific errors (mainly for PingOne)
      if (
        !isForgeRockLive &&
        (error.message?.includes("timed out") ||
          error.message?.includes("Authorization timed out") ||
          error.message?.includes("iframe") ||
          error.message?.includes("X-Frame-Options"))
      ) {
        console.warn(
          `[${providerName} Auth] Token check failed due to iframe blocking or timeout.`
        );
        console.warn(
          `[${providerName} Auth] This is expected when the OAuth provider blocks iframes (X-Frame-Options: sameorigin).`
        );
        console.warn(
          `[${providerName} Auth] User will need to authenticate via full-page redirect.`
        );
      } else {
        console.error(
          `[${providerName} Auth] Error checking authentication:`,
          error
        );
        console.error(`[${providerName} Auth] Error details:`, {
          message: error.message,
          stack: error.stack,
        });
      }
      setIsAuthenticated(false);
      setUser(null);
      setEmail("");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize ForgeRock SDK
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

        // Set SDK configuration
        let redirectUri = forgerockConfig.redirectUri;

        // Handle redirect URI based on provider
        if (!isForgeRockLive) {
          // PingOne: redirectUri should be `${window.location.origin}` (root path)
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

        // Build serverConfig based on provider
        const serverConfig = {};

        if (isForgeRockLive) {
          // ForgeRock OpenAM: Construct well-known endpoint from baseUrl and realmPath
          // Format: {baseUrl}/oauth2/realms/root/realms/{realmPath}/.well-known/openid-configuration
          const baseUrl = forgerockConfig.serverConfig?.baseUrl;
          const realmPath =
            forgerockConfig.serverConfig?.realmPath ||
            forgerockConfig.realmPath;

          if (baseUrl && realmPath) {
            // Construct the well-known endpoint URL
            // Format: {baseUrl}/oauth2/realms/root/realms/{realmPath}/.well-known/openid-configuration
            const wellknownUrl = `${baseUrl}/oauth2/realms/root/realms/${realmPath}/.well-known/openid-configuration`;
            console.log(`[${providerName} Auth] Well-known URL:`, wellknownUrl);
            serverConfig.wellknown = wellknownUrl;
            console.log(
              `[${providerName} Auth] Constructed well-known endpoint:`,
              wellknownUrl
            );
          } else {
            // Fallback: Use baseUrl and realmPath directly (may not work with setAsync)
            if (baseUrl) {
              serverConfig.baseUrl = baseUrl;
            }
            if (realmPath) {
              serverConfig.realmPath = realmPath;
            }
          }
          serverConfig.timeout = forgerockConfig.serverConfig?.timeout || 30000;
        } else {
          // PingOne: Use wellknown endpoint
          if (forgerockConfig.serverConfig?.wellknown) {
            serverConfig.wellknown = forgerockConfig.serverConfig.wellknown;
          }
          serverConfig.timeout = forgerockConfig.serverConfig?.timeout || 3000;
        }

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

        // PingOne: Disable automatic silent token renewal to prevent iframe usage
        if (!isForgeRockLive) {
          configObject.tokenStore = {
            storage: window.localStorage,
          };
        }

        const result = await Config.setAsync(configObject);
        console.log(
          `[${providerName} Auth] SDK configuration set successfully:`,
          result
        );

        // Check if we're returning from OAuth callback
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
            `[${providerName} Auth] Could not access location properties (cross-origin):`,
            error.message
          );
          // Try to get search params from document if available
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

        if (code && state) {
          console.log(
            `[${providerName} Auth] OAuth callback detected - exchanging code for tokens...`
          );
          // Handle OAuth callback - exchange code for tokens
          try {
            const tokens = await OAuth2Client.getTokens();
            if (tokens && tokens.accessToken) {
              console.log(
                `[${providerName} Auth] Tokens received successfully from OAuth callback`
              );
              // Load user info which will set isAuthenticated to true
              await loadUserInfo();

              // Verify authentication state is set
              // Give React a moment to update state before navigating
              await new Promise((resolve) => setTimeout(resolve, 100));

              // Clean up URL by removing query parameters
              try {
                const cleanPath = window.location?.pathname || "/";
                window.history.replaceState({}, document.title, cleanPath);
                console.log(
                  `[${providerName} Auth] URL cleaned up after successful authentication`
                );
              } catch (error) {
                console.warn(
                  `[${providerName} Auth] Could not clean up URL (cross-origin):`,
                  error.message
                );
              }

              // Navigate to welcome page after successful authentication
              console.log(
                `[${providerName} Auth] Authentication successful, redirecting to welcome page...`
              );
              navigate("/", { replace: true });
            } else {
              console.warn(
                `[${providerName} Auth] No access token in OAuth callback response`
              );
              setIsLoading(false);
            }
          } catch (error) {
            console.error(
              `[${providerName} Auth] Error handling OAuth callback:`,
              error
            );
            console.error(
              `[${providerName} Auth] OAuth callback error details:`,
              {
                message: error.message,
                stack: error.stack,
                code: code?.substring(0, 10) + "...",
                state: state?.substring(0, 10) + "...",
                errorType: error.constructor?.name,
                response: error.response,
                status: error.status,
                statusText: error.statusText,
              }
            );

            // Check for specific error types
            if (error.message?.includes("redirect_uri_mismatch")) {
              console.error(
                `[${providerName} Auth] REDIRECT URI MISMATCH - The redirect URI in your config must match exactly what's registered in the OAuth provider`
              );
            }
            if (error.message?.includes("invalid_client")) {
              console.error(
                `[${providerName} Auth] INVALID CLIENT - The client ID may be incorrect or not registered`
              );
            }
            if (
              error.message?.includes("timeout") ||
              error.message?.includes("network")
            ) {
              console.error(
                `[${providerName} Auth] NETWORK/TIMEOUT ERROR - Check your network connection and server availability`
              );
            }

            setIsLoading(false);
          }
        } else {
          console.log(
            `[${providerName} Auth] No OAuth callback detected - checking for existing tokens...`
          );
          // Check for existing tokens
          if (!isForgeRockLive) {
            // PingOne: Skip token check to avoid iframe-based silent renewal
            try {
              const tokens = await Promise.race([
                TokenManager.getTokens(),
                new Promise((_, reject) =>
                  setTimeout(
                    () =>
                      reject(new Error("Skipping token check to avoid iframe")),
                    2000
                  )
                ),
              ]);

              if (tokens && tokens.accessToken) {
                console.log(
                  `[${providerName} Auth] Found existing tokens, loading user info...`
                );
                await loadUserInfo();
              } else {
                console.log(`[${providerName} Auth] No existing tokens found`);
                setIsAuthenticated(false);
                setIsLoading(false);
              }
            } catch (error) {
              console.log(
                `[${providerName} Auth] Skipping token check to avoid iframe issues. User will authenticate on demand.`
              );
              setIsAuthenticated(false);
              setIsLoading(false);
            }
          } else {
            // ForgeRock: Check for tokens without triggering silent authentication
            // We use a timeout to prevent the SDK from trying to silently authenticate
            // which would add prompt=none and prevent the login page from showing
            try {
              const tokens = await Promise.race([
                TokenManager.getTokens(),
                new Promise((_, reject) =>
                  setTimeout(
                    () =>
                      reject(
                        new Error("Token check timeout - avoiding silent auth")
                      ),
                    2000
                  )
                ),
              ]);

              if (tokens && tokens.accessToken) {
                console.log(
                  `[${providerName} Auth] Found existing tokens, loading user info...`
                );
                await loadUserInfo();
              } else {
                console.log(`[${providerName} Auth] No existing tokens found`);
                setIsAuthenticated(false);
                setIsLoading(false);
              }
            } catch (error) {
              // If we get a timeout or any error, assume no tokens exist
              // This prevents the SDK from triggering silent authentication with prompt=none
              console.log(
                `[${providerName} Auth] No existing tokens found (avoiding silent auth):`,
                error.message
              );
              setIsAuthenticated(false);
              setIsLoading(false);
            }
          }
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
        setIsLoading(false);
      }
    };

    initializeForgeRock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async () => {
    try {
      console.log(`[${providerName} Auth] Initiating login flow...`);
      console.log(
        `[${providerName} Auth] Redirect URI:`,
        forgerockConfig.redirectUri
      );
      setIsLoading(true);

      // For ForgeRock, use manual redirect to avoid SDK adding prompt=none
      // For PingOne, try SDK redirect first, then fallback to manual
      if (isForgeRockLive) {
        console.log(
          `[${providerName} Auth] Using manual redirect for ForgeRock to ensure login page is shown...`
        );
        // Skip SDK redirect and go straight to manual redirect for ForgeRock
      } else {
        // PingOne: Try SDK redirect first
        console.log(
          `[${providerName} Auth] Attempting SDK redirect to ${providerName} authorization server...`
        );
        try {
          // This should redirect automatically, but if it doesn't, we'll handle it
          const tokens = await TokenManager.getTokens({
            login: "redirect",
          });

          // If we get here, the redirect didn't happen (unexpected)
          console.warn(
            `[${providerName} Auth] getTokens returned without redirecting. Tokens:`,
            tokens
          );

          // If we have tokens, user might already be authenticated
          if (tokens && tokens.accessToken) {
            console.log(
              `[${providerName} Auth] Already authenticated, loading user info...`
            );
            await loadUserInfo();
            navigate("/", { replace: true });
            return;
          } else {
            // No tokens and no redirect - manually construct authorization URL
            console.log(
              `[${providerName} Auth] No redirect occurred, constructing authorization URL manually...`
            );
            // Fall through to manual redirect
          }
        } catch (redirectError) {
          // SDK redirect failed, fall through to manual redirect
          console.log(
            `[${providerName} Auth] SDK redirect didn't trigger, attempting manual redirect...`
          );
        }
      }

      // Manual redirect for both providers (or fallback for PingOne)
      console.log(
        `[${providerName} Auth] Constructing manual authorization URL...`
      );

      // Get the well-known configuration to construct the authorization URL
      const config = await Config.get();
      const wellknownUrl = config.serverConfig?.wellknown;

      if (wellknownUrl) {
        try {
          // Fetch the well-known configuration (this should work as it's a standard OIDC endpoint)
          const response = await fetch(wellknownUrl);
          if (!response.ok) {
            throw new Error(
              `Failed to fetch well-known config: ${response.status} ${response.statusText}`
            );
          }
          const wellknown = await response.json();

          // Generate PKCE code verifier and challenge (for PKCE flow)
          const generateCodeVerifier = () => {
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            return btoa(String.fromCharCode(...array))
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=/g, "");
          };

          const generateCodeChallenge = async (verifier) => {
            const encoder = new TextEncoder();
            const data = encoder.encode(verifier);
            const digest = await crypto.subtle.digest("SHA-256", data);
            return btoa(String.fromCharCode(...new Uint8Array(digest)))
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=/g, "");
          };

          // Generate state for CSRF protection
          const state =
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);

          // Generate PKCE values
          const codeVerifier = generateCodeVerifier();
          const codeChallenge = await generateCodeChallenge(codeVerifier);

          // Store code verifier in sessionStorage for later use
          sessionStorage.setItem("pkce_code_verifier", codeVerifier);
          sessionStorage.setItem("oauth_state", state);

          // Construct authorization URL
          // IMPORTANT: Extract just the base URL without any query parameters
          // This ensures we start with a clean slate and no prompt=none from the well-known endpoint
          let baseAuthUrl = wellknown.authorization_endpoint;
          const urlParts = baseAuthUrl.split("?");
          baseAuthUrl = urlParts[0]; // Get base URL without query string

          console.log(
            `[${providerName} Auth] Using clean authorization endpoint:`,
            baseAuthUrl
          );

          const authUrl = new URL(baseAuthUrl);

          // Clear any existing search params to ensure clean URL
          authUrl.search = "";

          // Add all required parameters explicitly
          authUrl.searchParams.set("client_id", config.clientId);
          authUrl.searchParams.set("redirect_uri", config.redirectUri);
          authUrl.searchParams.set("response_type", "code");
          authUrl.searchParams.set("scope", config.scope);
          authUrl.searchParams.set("state", state);
          authUrl.searchParams.set("code_challenge", codeChallenge);
          authUrl.searchParams.set("code_challenge_method", "S256");

          // For ForgeRock, explicitly do NOT add prompt parameter
          // If prompt is not set, ForgeRock will show the login page when user is not authenticated
          // We explicitly ensure prompt is NOT in the URL
          if (authUrl.searchParams.has("prompt")) {
            console.warn(
              `[${providerName} Auth] ⚠️ Unexpected prompt parameter found, removing it...`
            );
            authUrl.searchParams.delete("prompt");
          }

          const finalAuthUrl = authUrl.toString();
          console.log(
            `[${providerName} Auth] ✅ Constructed authorization URL:`,
            finalAuthUrl
          );

          // Multiple validation checks to ensure prompt=none is NOT in the URL
          if (
            finalAuthUrl.includes("prompt=none") ||
            finalAuthUrl.includes("prompt%3Dnone") ||
            authUrl.searchParams.get("prompt") === "none"
          ) {
            console.error(
              `[${providerName} Auth] ❌ ERROR: prompt=none is still in the URL!`,
              {
                url: finalAuthUrl,
                hasPromptParam: authUrl.searchParams.has("prompt"),
                promptValue: authUrl.searchParams.get("prompt"),
              }
            );
            throw new Error(
              "prompt=none detected in authorization URL - this will prevent login page from showing"
            );
          }

          console.log(
            `[${providerName} Auth] ✅ URL verified - no prompt=none. Redirecting to login page...`
          );

          // Perform the redirect using window.location.replace to ensure proper browser redirect
          // This avoids CORS issues as it's a full page navigation, not a fetch request
          // Using replace() prevents back button issues
          window.location.replace(finalAuthUrl);
          return; // Exit function as redirect is happening
        } catch (urlError) {
          console.error(
            `[${providerName} Auth] Error constructing authorization URL:`,
            urlError
          );
          throw urlError;
        }
      } else {
        throw new Error("Well-known URL not configured");
      }
    } catch (error) {
      console.error(`[${providerName} Auth] Login error:`, error);
      console.error(`[${providerName} Auth] Login error details:`, {
        message: error.message,
        stack: error.stack,
      });
      setIsLoading(false);
    }
  };

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

      // PingOne handles redirect via logoutRedirectUri, ForgeRock may need manual redirect
      if (isForgeRockLive) {
        navigate("/");
      }
      // Note: PingOne SDK handles redirect automatically via logoutRedirectUri
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
      // Only navigate if logout redirect didn't happen
      navigate("/");
    }
  };

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
