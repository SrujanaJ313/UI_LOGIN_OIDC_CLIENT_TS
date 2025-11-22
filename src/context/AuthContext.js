import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Config,
  TokenManager,
  TokenStorage,
  UserManager,
  FRUser,
} from "@forgerock/javascript-sdk";
import { useNavigate } from "react-router-dom";
import forgerockConfig, { providerName } from "../config/forgerock";

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

  // Utility: Generate random state for OAuth
  const generateRandomState = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  };

  // Utility: Generate PKCE Code Verifier
  const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  };

  // Utility: Generate PKCE Code Challenge from Verifier
  const generateCodeChallenge = async (verifier) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  };

  // Load User Info (manual fetch or via SDK fallback)
  const loadUserInfo = async (accessToken = null) => {
    try {
      console.log(`[${providerName} Auth] Loading user info...`);

      if (accessToken) {
        const config = await Config.get();
        const userInfoEndpoint =
          config.serverConfig?.userInfoEndpoint ||
          config.serverConfig?.userinfo_endpoint;

        if (!userInfoEndpoint) {
          throw new Error("UserInfo endpoint not configured");
        }

        const userInfoResponse = await fetch(userInfoEndpoint, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!userInfoResponse.ok) {
          throw new Error(
            `Failed to fetch user info: ${userInfoResponse.status}`
          );
        }

        const userInfoData = await userInfoResponse.json();
        setIsAuthenticated(true);
        setUser(userInfoData);
        setEmail(userInfoData.email || userInfoData.name || "");
      } else {
        // Fallback via SDK
        const userInfo = await UserManager.getCurrentUser();
        if (userInfo) {
          setIsAuthenticated(true);
          setUser(userInfo);
          setEmail(userInfo.email || userInfo.name || "");
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setEmail("");
        }
      }
    } catch (error) {
      console.error(`[${providerName} Auth] Error loading user info:`, error);
      setIsAuthenticated(false);
      setUser(null);
      setEmail("");
    } finally {
      setIsLoading(false);
    }
  };

  // Check token validity and load user info or mark unauthenticated
  const checkAuthentication = async () => {
    try {
      console.log(`[${providerName} Auth] Checking authentication status...`);

      const tokens = await TokenManager.getTokens();

      if (tokens && tokens.accessToken) {
        const now = Math.floor(Date.now() / 1000);
        const tokenExp = tokens.accessToken?.expiresAt || tokens.expiresAt;

        if (tokenExp && tokenExp > now) {
          await loadUserInfo();
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setEmail("");
        }
      } else {
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

  useEffect(() => {
    const initializeForgeRock = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");
        const currentPath = window.location.pathname || "/";

        console.log(`[${providerName} Auth] Initializing SDK...`);
        console.log(`[${providerName} Auth] URL params:`, {
          code,
          state,
          currentPath,
        });

        let redirectUri = forgerockConfig.redirectUri;
        if (!redirectUri) {
          redirectUri = `${window.location.origin}/callback`;
        }

        const serverConfig = {};
        const baseUrl = forgerockConfig.serverConfig?.baseUrl;
        const realmPath =
          forgerockConfig.serverConfig?.realmPath || forgerockConfig.realmPath;

        if (baseUrl && realmPath) {
          let wellknownUrl = `${baseUrl}/oauth2/realms/root/realms/${realmPath}/.well-known/openid-configuration`;
          wellknownUrl = wellknownUrl.replace(/([^:]\/)\/+/g, "$1");

          const wellknownResponse = await fetch(wellknownUrl);

          if (!wellknownResponse.ok) {
            throw new Error(
              `Failed to fetch well-known: ${wellknownResponse.status}`
            );
          }

          const wellknownData = await wellknownResponse.json();
          const issuerUrl = new URL(wellknownData.issuer);
          const issuerPath = issuerUrl.pathname;
          const basePathMatch = issuerPath.match(/^(.+?)\/oauth2/);
          const basePath = basePathMatch ? basePathMatch[1] : "";

          serverConfig.baseUrl = `${issuerUrl.origin}${basePath}`;
          serverConfig.realmPath = realmPath;
          serverConfig.authorizeEndpoint = wellknownData.authorization_endpoint;
          serverConfig.tokenEndpoint = wellknownData.token_endpoint;
          serverConfig.userInfoEndpoint = wellknownData.userinfo_endpoint;
          serverConfig.endSessionEndpoint = wellknownData.end_session_endpoint;
          serverConfig.authorizationEndpoint =
            wellknownData.authorization_endpoint;
        }

        serverConfig.timeout = forgerockConfig.serverConfig?.timeout || 30000;

        const configObject = {
          clientId: forgerockConfig.clientId,
          redirectUri,
          scope: forgerockConfig.scope,
          serverConfig,
        };

        if (forgerockConfig.tree) {
          configObject.tree = forgerockConfig.tree;
        }

        Config.set(configObject);
        console.log(`[${providerName} Auth] SDK configuration set`);

        if (code && state) {
          try {
            // Use localStorage for PKCE and state
            const codeVerifier = localStorage.getItem("pkce_code_verifier");
            const storedState = localStorage.getItem("oauth_state");

            if (state !== storedState) {
              throw new Error("Invalid state parameter - possible CSRF attack");
            }

            if (!codeVerifier) {
              throw new Error("PKCE code verifier not found");
            }

            const config = await Config.get();
            const tokenEndpoint =
              config.serverConfig?.tokenEndpoint ||
              config.serverConfig?.token_endpoint;

            const credentials = `${forgerockConfig.clientId}:`;
            const clientCredentials = btoa(credentials);

            const tokenResponse = await fetch(tokenEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${clientCredentials}`,
                Accept: "application/json",
              },
              body: new URLSearchParams({
                grant_type: "authorization_code",
                code: code,
                redirect_uri: config.redirectUri,
                code_verifier: codeVerifier,
              }),
            });

            if (!tokenResponse.ok) {
              const errorText = await tokenResponse
                .text()
                .catch(() => "Unknown");
              throw new Error(
                `Token exchange failed: ${tokenResponse.status} - ${errorText}`
              );
            }

            const tokenData = await tokenResponse.json();

            const tokenStoreData = {
              accessToken: tokenData.access_token,
              idToken: tokenData.id_token,
              refreshToken: tokenData.refresh_token,
              expiresIn: tokenData.expires_in || 3600,
              tokenType: tokenData.token_type || "Bearer",
            };

            await TokenStorage.set(tokenStoreData);

            localStorage.removeItem("pkce_code_verifier");
            localStorage.removeItem("oauth_state");

            await loadUserInfo(tokenData.access_token);

            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
            navigate("/", { replace: true });
          } catch (error) {
            console.error(
              `[${providerName} Auth] OAuth callback error:`,
              error
            );
            setIsLoading(false);
          }
        } else {
          try {
            const tokens = await TokenManager.getTokens();

            if (tokens && tokens.accessToken) {
              await loadUserInfo();
              setIsLoading(false);
              return;
            }
          } catch {
            // Ignore errors, fallback to login
          }

          setIsLoading(true);
          login().catch(() => setIsLoading(false));
        }
      } catch (error) {
        console.error(`[${providerName} Auth] Initialization error:`, error);
        setIsLoading(false);
      }
    };

    initializeForgeRock();
  }, []);

  const login = async () => {
    try {
      setIsLoading(true);

      const config = await Config.get();
      let authorizationEndpoint = config.serverConfig?.authorizationEndpoint;

      if (!authorizationEndpoint) {
        const baseUrl = config.serverConfig?.baseUrl;
        const realmPath = config.serverConfig?.realmPath;

        const wellknownUrl = `${baseUrl}/oauth2/realms/root/realms/${realmPath}/.well-known/openid-configuration`;

        const response = await fetch(wellknownUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch well-known: ${response.status}`);
        }
        const wellknown = await response.json();

        authorizationEndpoint = wellknown.authorization_endpoint;
      }

      const state = generateRandomState();
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      localStorage.setItem("pkce_code_verifier", codeVerifier);
      localStorage.setItem("oauth_state", state);

      const baseAuthUrl = authorizationEndpoint.split("?")[0];
      const authUrl = new URL(baseAuthUrl);

      authUrl.search = "";
      authUrl.searchParams.set("client_id", config.clientId);
      authUrl.searchParams.set("redirect_uri", config.redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", config.scope);
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("code_challenge", codeChallenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("prompt", "login");

      window.location.replace(authUrl.toString());
    } catch (error) {
      console.error(`[${providerName} Auth] Login error:`, error);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await FRUser.logout();
    } catch {
      await FRUser.logout({ logoutRedirectUri: window.location.origin });
    }

    localStorage.clear();
    sessionStorage.clear();

    setIsAuthenticated(false);
    setUser(null);
    setEmail("");
    navigate("/login", { replace: true });
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
