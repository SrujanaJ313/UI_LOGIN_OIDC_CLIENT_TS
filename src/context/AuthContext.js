import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Config,
  OAuth2Client,
  TokenManager,
  TokenStorage,
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
  const [shouldAutoLogin, setShouldAutoLogin] = useState(false);
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
          // ForgeRock OpenAM: Fetch well-known config ourselves and use Config.set instead of setAsync
          // This avoids SDK's URL construction issues with setAsync
          const baseUrl = forgerockConfig.serverConfig?.baseUrl;
          const realmPath =
            forgerockConfig.serverConfig?.realmPath ||
            forgerockConfig.realmPath;

          if (baseUrl && realmPath) {
            // Construct well-known URL
            let wellknownUrl = `${baseUrl}/oauth2/realms/root/realms/${realmPath}/.well-known/openid-configuration`;
            wellknownUrl = wellknownUrl.replace(/([^:]\/)\/+/g, '$1');
            
            try {
              // Fetch well-known config ourselves
              // Works for both mock server (localhost:8080) and real ForgeRock server
              console.log(`[${providerName} Auth] Fetching well-known config from:`, wellknownUrl);
              const wellknownResponse = await fetch(wellknownUrl);
              if (!wellknownResponse.ok) {
                const errorText = await wellknownResponse.text().catch(() => 'Unknown error');
                console.error(`[${providerName} Auth] Well-known config fetch failed:`, {
                  status: wellknownResponse.status,
                  statusText: wellknownResponse.statusText,
                  url: wellknownUrl,
                  error: errorText
                });
                throw new Error(`Failed to fetch well-known: ${wellknownResponse.status} ${wellknownResponse.statusText}. URL: ${wellknownUrl}`);
              }
              const wellknownData = await wellknownResponse.json();
              
              // Extract baseUrl from issuer for Config.set
              // Issuer format: {baseUrl}/oauth2/realms/root/realms/{realmPath}
              // BaseUrl should be: {baseUrl} (extracted from issuer)
              // Works for both mock server (http://localhost:8080/sso) and real server (https://wfcssodev1.nhes.nh.gov/sso)
              const issuerUrl = new URL(wellknownData.issuer);
              const issuerPath = issuerUrl.pathname;
              // Extract base path before /oauth2
              const basePathMatch = issuerPath.match(/^(.+?)\/oauth2/);
              const basePath = basePathMatch ? basePathMatch[1] : '';
              serverConfig.baseUrl = `${issuerUrl.origin}${basePath}`;
              
              // Keep realmPath for Config.set - ensure it's properly formatted
              serverConfig.realmPath = realmPath;
              
              // Set all endpoints explicitly so SDK uses correct URLs
              // This prevents SDK from constructing wrong URLs like /oauth2/realms/root/authorize
              serverConfig.authorizeEndpoint = wellknownData.authorization_endpoint;
              serverConfig.tokenEndpoint = wellknownData.token_endpoint;
              serverConfig.userInfoEndpoint = wellknownData.userinfo_endpoint;
              serverConfig.endSessionEndpoint = wellknownData.end_session_endpoint;
              
              // Store for manual redirect later (keep the old property name for backward compatibility)
              serverConfig.authorizationEndpoint = wellknownData.authorization_endpoint;
              
              console.log(`[${providerName} Auth] Well-known config fetched:`, {
                baseUrl: serverConfig.baseUrl,
                realmPath: serverConfig.realmPath,
                authorizationEndpoint: serverConfig.authorizationEndpoint
              });
              console.log(`[${providerName} Auth] Using Config.set instead of setAsync to avoid URL construction issues`);
            } catch (fetchError) {
              console.error(
                `[${providerName} Auth] Error fetching well-known config:`,
                fetchError
              );
              throw fetchError;
            }
          } else {
            console.error(
              `[${providerName} Auth] Missing baseUrl or realmPath configuration`,
              { baseUrl, realmPath }
            );
          }
          serverConfig.timeout = forgerockConfig.serverConfig?.timeout || 30000;
        } else {
          // PingOne: Use wellknown endpoint
          if (forgerockConfig.serverConfig?.wellknown) {
            serverConfig.wellknown = forgerockConfig.serverConfig.wellknown;
          }
          serverConfig.timeout = forgerockConfig.serverConfig?.timeout || 3000;
        }

        // Validate redirectUri before passing to SDK
        try {
          new URL(redirectUri);
        } catch (urlError) {
          console.error(
            `[${providerName} Auth] Invalid redirectUri:`,
            redirectUri,
            urlError
          );
          throw new Error(`Invalid redirectUri: ${redirectUri}`);
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

        console.log(`[${providerName} Auth] Config object before SDK call:`, {
          clientId: configObject.clientId,
          redirectUri: configObject.redirectUri,
          scope: configObject.scope,
          serverConfig: serverConfig
        });

        let result;
        try {
          if (isForgeRockLive && !serverConfig.wellknown) {
            // For ForgeRock, use Config.set since we fetched well-known config ourselves
            Config.set(configObject);
            result = configObject;
            console.log(`[${providerName} Auth] Used Config.set (well-known config fetched manually)`);
          } else {
            // For PingOne or if wellknown is provided, use Config.setAsync
            result = await Config.setAsync(configObject);
          }
        } catch (sdkError) {
          console.error(
            `[${providerName} Auth] SDK configuration error:`,
            sdkError.message,
            sdkError.stack
          );
          console.error(
            `[${providerName} Auth] Config that failed:`,
            JSON.stringify(configObject, null, 2)
          );
          throw sdkError;
        }
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
          // Handle OAuth callback - manually exchange code for tokens
          // to avoid SDK's silent authentication attempt with wrong URL
          try {
            // Get stored PKCE code verifier
            const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
            const storedState = sessionStorage.getItem("oauth_state");
            
            // Validate state
            if (state !== storedState) {
              throw new Error("Invalid state parameter - possible CSRF attack");
            }
            
            // Get token endpoint from config
            const config = await Config.get();
            const tokenEndpoint = config.serverConfig?.tokenEndpoint || config.serverConfig?.token_endpoint;
            
            if (!tokenEndpoint) {
              throw new Error("Token endpoint not configured");
            }
            
            if (!codeVerifier) {
              throw new Error("PKCE code verifier not found in storage");
            }
            
            console.log(`[${providerName} Auth] Manually exchanging code for tokens...`);
            console.log(`[${providerName} Auth] Token endpoint:`, tokenEndpoint);
            
            // Manually exchange authorization code for tokens
            const tokenResponse = await fetch(tokenEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: redirectUri,
                client_id: forgerockConfig.clientId,
                code_verifier: codeVerifier,
              }),
            });
            
            if (!tokenResponse.ok) {
              const errorText = await tokenResponse.text().catch(() => 'Unknown error');
              let errorData;
              try {
                errorData = JSON.parse(errorText);
              } catch {
                errorData = { error: errorText };
              }
              console.error(`[${providerName} Auth] Token exchange failed:`, {
                status: tokenResponse.status,
                statusText: tokenResponse.statusText,
                endpoint: tokenEndpoint,
                error: errorData,
              });
              const errorMessage = errorData.error_description || errorData.error || errorText;
              throw new Error(`Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText} - ${errorMessage}`);
            }
            
            const tokenData = await tokenResponse.json();
            console.log(`[${providerName} Auth] Tokens received from manual exchange`);
            
            // Store tokens in TokenStorage (SDK's token storage)
            // Use the proper token storage format expected by the SDK
            const tokenStoreData = {
              accessToken: tokenData.access_token,
              idToken: tokenData.id_token,
              refreshToken: tokenData.refresh_token,
              expiresIn: tokenData.expires_in || 3600,
              tokenType: tokenData.token_type || "Bearer",
            };
            
            await TokenStorage.set(tokenStoreData);
            
            // Clean up stored PKCE values
            sessionStorage.removeItem("pkce_code_verifier");
            sessionStorage.removeItem("oauth_state");
            
            console.log(`[${providerName} Auth] Tokens stored successfully`);
            
            // Don't call TokenManager.getTokens() here as it might try to exchange the code again
            // Instead, manually load user info using the stored token
            if (tokenData.access_token) {
              console.log(
                `[${providerName} Auth] Tokens received successfully from manual exchange`
              );
              
              // Manually load user info to avoid SDK's wrong URL construction
              try {
                const userInfoEndpoint = config.serverConfig?.userInfoEndpoint || config.serverConfig?.userinfo_endpoint;
                if (!userInfoEndpoint) {
                  throw new Error("UserInfo endpoint not configured");
                }
                
                console.log(`[${providerName} Auth] Fetching user info from:`, userInfoEndpoint);
                const userInfoResponse = await fetch(userInfoEndpoint, {
                  headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`
                  }
                });
                
                if (!userInfoResponse.ok) {
                  const errorText = await userInfoResponse.text().catch(() => 'Unknown error');
                  console.error(`[${providerName} Auth] UserInfo fetch failed:`, {
                    status: userInfoResponse.status,
                    statusText: userInfoResponse.statusText,
                    endpoint: userInfoEndpoint,
                    error: errorText
                  });
                  throw new Error(`Failed to fetch user info: ${userInfoResponse.status} ${userInfoResponse.statusText}`);
                }
                
                const userInfoData = await userInfoResponse.json();
                console.log(`[${providerName} Auth] User info fetched successfully:`, userInfoData);
                
                // Set user info directly
                setIsAuthenticated(true);
                setUser(userInfoData);
                setEmail(userInfoData.email || userInfoData.name || "");
                console.log(`[${providerName} Auth] User authenticated successfully`);
              } catch (userInfoError) {
                console.error(`[${providerName} Auth] Error fetching user info:`, userInfoError);
                // Try using SDK's UserManager as fallback
                await loadUserInfo();
              }

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
                console.log(
                  `[${providerName} Auth] Will auto-redirect to SSO login on app load...`
                );
                // Set flag to trigger auto-login for PingOne when app starts and no tokens found
                setIsLoading(true);
                setShouldAutoLogin(true);
              }
            } catch (error) {
              console.log(
                `[${providerName} Auth] No tokens found. Will auto-redirect to SSO login on app load...`
              );
              // Set flag to trigger auto-login for PingOne when app starts and no tokens found
              setIsLoading(true);
              setShouldAutoLogin(true);
            }
          } else {
            // ForgeRock: Check localStorage/sessionStorage directly instead of using getTokens()
            // This avoids the SDK's silent authentication attempt which constructs wrong URLs
            // and causes 404 errors and unwanted prompt=none requests
            try {
              // Check for tokens in storage (SDK stores tokens in sessionStorage/localStorage)
              const tokenStorage = window.sessionStorage || window.localStorage;
              const hasTokens = tokenStorage.getItem('FR-user') || 
                               tokenStorage.getItem('FR-access') ||
                               tokenStorage.getItem('FR-refresh') ||
                               Object.keys(tokenStorage).some(key => key.startsWith('FR-'));

              if (hasTokens) {
                // Tokens exist in storage, try loading user info directly
                // Don't call TokenManager.getTokens() as it triggers silent auth with wrong URL
                // Instead, try loading user info which will validate tokens if they exist
                console.log(`[${providerName} Auth] Found tokens in storage, loading user info...`);
                try {
                  // Try loading user info directly - this will use existing tokens
                  // If tokens are invalid, it will throw an error and we'll proceed to login
                  await loadUserInfo();
                  console.log(`[${providerName} Auth] User info loaded successfully from existing tokens`);
                } catch (loadError) {
                  // User info load failed - tokens are likely invalid or expired
                  console.log(`[${providerName} Auth] Failed to load user info, tokens may be invalid:`, loadError.message);
                  // Clear invalid tokens and proceed to login
                  try {
                    const tokenStorage = window.sessionStorage || window.localStorage;
                    Object.keys(tokenStorage).forEach(key => {
                      if (key.startsWith('FR-')) {
                        tokenStorage.removeItem(key);
                      }
                    });
                    console.log(`[${providerName} Auth] Cleared invalid tokens from storage`);
                  } catch (clearError) {
                    console.warn(`[${providerName} Auth] Failed to clear tokens:`, clearError);
                  }
                  setIsLoading(true);
                  setShouldAutoLogin(true);
                }
              } else {
                console.log(`[${providerName} Auth] No existing tokens found in storage`);
                console.log(
                  `[${providerName} Auth] Will auto-redirect to SSO login on app load...`
                );
                // Set flag to trigger auto-login for ForgeRock when app starts and no tokens found
                setIsLoading(true);
                setShouldAutoLogin(true);
              }
            } catch (error) {
              // If any error, assume no tokens exist and proceed to login
              // This prevents the SDK from triggering silent authentication with prompt=none
              console.log(
                `[${providerName} Auth] No existing tokens found. Will auto-redirect to SSO login on app load...`
              );
              // Set flag to trigger auto-login for ForgeRock when app starts and no tokens found
              setIsLoading(true);
              setShouldAutoLogin(true);
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

  // Auto-login effect for both PingOne and ForgeRock when shouldAutoLogin is true
  useEffect(() => {
    if (shouldAutoLogin) {
      console.log(
        `[${providerName} Auth] Auto-triggering SSO login on app load...`
      );
      setShouldAutoLogin(false); // Reset flag
      login().catch((loginError) => {
        console.error(
          `[${providerName} Auth] Error during auto-login:`,
          loginError
        );
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoLogin]);

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
      
      let authorizationEndpoint = config.serverConfig?.authorizationEndpoint;
      let wellknown;
      
      if (authorizationEndpoint) {
        // Use stored authorization endpoint from well-known config we fetched earlier
        console.log(`[${providerName} Auth] Using stored authorization endpoint:`, authorizationEndpoint);
      } else {
        // Fallback: Fetch well-known config if not already available
        let wellknownUrl = config.serverConfig?.wellknown;
        
        // For ForgeRock, construct well-known URL from baseUrl and realmPath if not provided
        if (!wellknownUrl && isForgeRockLive) {
          const baseUrl = config.serverConfig?.baseUrl;
          const realmPath = config.serverConfig?.realmPath;
          if (baseUrl && realmPath) {
            wellknownUrl = `${baseUrl}/oauth2/realms/root/realms/${realmPath}/.well-known/openid-configuration`;
          }
        }

        if (wellknownUrl) {
          try {
            // Fetch the well-known configuration (this should work as it's a standard OIDC endpoint)
            const response = await fetch(wellknownUrl);
            if (!response.ok) {
              throw new Error(
                `Failed to fetch well-known config: ${response.status} ${response.statusText}`
              );
            }
            wellknown = await response.json();
            authorizationEndpoint = wellknown.authorization_endpoint;
          } catch (fetchError) {
            console.error(
              `[${providerName} Auth] Error fetching well-known config:`,
              fetchError
            );
            throw fetchError;
          }
        } else {
          throw new Error("No authorization endpoint available and cannot fetch well-known config");
        }
      }

      if (authorizationEndpoint) {
        try {

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
          let baseAuthUrl = authorizationEndpoint;
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

          // For ForgeRock, explicitly set prompt=login to force the login page to appear
          // For PingOne, do not set prompt (let it work naturally)
          if (isForgeRockLive) {
            // Force login page to show by setting prompt=login
            // This overrides any server-side default that might add prompt=none
            authUrl.searchParams.set("prompt", "login");
            console.log(
              `[${providerName} Auth] Setting prompt=login to force login page display`
            );
          } else {
            // For PingOne, don't set prompt parameter
            // Remove prompt if it was somehow added
            if (authUrl.searchParams.has("prompt")) {
              console.warn(
                `[${providerName} Auth] ⚠️ Unexpected prompt parameter found, removing it...`
              );
              authUrl.searchParams.delete("prompt");
            }
          }

          const finalAuthUrl = authUrl.toString();
          console.log(
            `[${providerName} Auth] ✅ Constructed authorization URL:`,
            finalAuthUrl
          );

          // Validation checks and final URL preparation
          let redirectUrl = finalAuthUrl;
          
          if (isForgeRockLive) {
            // For ForgeRock: Ensure prompt=login is set
            const promptValue = authUrl.searchParams.get("prompt");
            if (promptValue !== "login") {
              if (promptValue === "none") {
                console.error(
                  `[${providerName} Auth] ❌ ERROR: prompt=none detected! Overriding with prompt=login...`
                );
              } else {
                console.warn(
                  `[${providerName} Auth] ⚠️ Prompt value is "${promptValue}", setting to "login"...`
                );
              }
              authUrl.searchParams.set("prompt", "login");
              redirectUrl = authUrl.toString();
              console.log(
                `[${providerName} Auth] ✅ Updated URL with prompt=login:`,
                redirectUrl
              );
            } else {
              console.log(
                `[${providerName} Auth] ✅ URL verified - prompt=login set. Redirecting to login page...`
              );
            }
          } else {
            // PingOne: Verify prompt=none is NOT in the URL
            if (
              finalAuthUrl.includes("prompt=none") ||
              finalAuthUrl.includes("prompt%3Dnone") ||
              authUrl.searchParams.get("prompt") === "none"
            ) {
              console.error(
                `[${providerName} Auth] ❌ ERROR: prompt=none detected! Removing it...`
              );
              authUrl.searchParams.delete("prompt");
              redirectUrl = authUrl.toString();
              console.log(
                `[${providerName} Auth] ✅ Updated URL without prompt:`,
                redirectUrl
              );
            } else {
              console.log(
                `[${providerName} Auth] ✅ URL verified - no prompt=none. Redirecting...`
              );
            }
          }

          // Perform the redirect using window.location.replace to ensure proper browser redirect
          // This avoids CORS issues as it's a full page navigation, not a fetch request
          // Using replace() prevents back button issues
          console.log(
            `[${providerName} Auth] Redirecting to:`,
            redirectUrl
          );
          window.location.replace(redirectUrl);
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

      // After logout, redirect to login page which will trigger SSO auto-login
      // This ensures user is taken directly to SSO login instead of staying on protected route
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 100);
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
      // After logout, redirect to login page which will trigger SSO auto-login
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 100);
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
