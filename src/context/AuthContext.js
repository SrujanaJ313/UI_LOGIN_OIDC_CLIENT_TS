import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { UserManager } from "oidc-client-ts";
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
  const userManagerRef = useRef(null);
  const navigate = useNavigate();

  const loadUserInfo = async () => {
    try {
      const userManager = userManagerRef.current;
      if (!userManager) {
        console.warn(
          `[${providerName} Auth] [loadUserInfo] UserManager missing`
        );
        setIsAuthenticated(false);
        setUser(null);
        setEmail("");
        return;
      }

      const currentUser = await userManager.getUser();

      if (currentUser && !currentUser.expired) {
        console.log(`[${providerName} Auth] [loadUserInfo] User loaded`, {
          sub: currentUser.profile?.sub,
          email: currentUser.profile?.email,
        });
        setIsAuthenticated(true);
        setUser(currentUser.profile);
        setEmail(currentUser.profile?.email || currentUser.profile?.name || "");
      } else {
        console.log(`[${providerName} Auth] [loadUserInfo] No active session`);
        setIsAuthenticated(false);
        setUser(null);
        setEmail("");
      }
    } catch (error) {
      console.error(`[${providerName} Auth] [loadUserInfo] Failed`, error);
      setIsAuthenticated(false);
      setUser(null);
      setEmail("");
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuthentication = async () => {
    try {
      const userManager = userManagerRef.current;
      if (!userManager) {
        console.warn(
          `[${providerName} Auth] [checkAuthentication] UserManager missing`
        );
        setIsAuthenticated(false);
        setUser(null);
        setEmail("");
        return false;
      }

      const currentUser = await userManager.getUser();

      if (currentUser && !currentUser.expired) {
        console.log(
          `[${providerName} Auth] [checkAuthentication] Active session detected`,
          {
            sub: currentUser.profile?.sub,
          }
        );
        await loadUserInfo();
        return true;
      }

      if (currentUser && currentUser.expired) {
        console.log(
          `[${providerName} Auth] [checkAuthentication] Session expired, attempting silent renew`
        );
        try {
          const renewed = await userManager.signinSilent();
          if (renewed && !renewed.expired) {
            console.log(
              `[${providerName} Auth] [checkAuthentication] Silent renew succeeded`
            );
            await loadUserInfo();
            return true;
          }
        } catch (silentError) {
          console.warn(
            `[${providerName} Auth] [checkAuthentication] Silent renew failed`,
            silentError
          );
        }
      }

      console.log(
        `[${providerName} Auth] [checkAuthentication] No valid session, user must authenticate`
      );
      setIsAuthenticated(false);
      setUser(null);
      setEmail("");
      return false;
    } catch (error) {
      console.error(
        `[${providerName} Auth] [checkAuthentication] Failed`,
        error
      );
      setIsAuthenticated(false);
      setUser(null);
      setEmail("");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeOidc = async () => {
      try {
        const baseUrl = forgerockConfig.serverConfig?.baseUrl;
        const realmPath =
          forgerockConfig.serverConfig?.realmPath || forgerockConfig.realmPath;

        if (!baseUrl || !realmPath) {
          throw new Error("Base URL and realm path must be configured");
        }

        const wellKnownUrl =
          `${baseUrl}/oauth2/realms/root/realms/${realmPath}/.well-known/openid-configuration`.replace(
            /([^:]\/)\/+/g,
            "$1"
          );
        console.log(`[${providerName} Auth] [INIT] Downloading metadata`, {
          wellKnownUrl,
        });
        const metadataResponse = await fetch(wellKnownUrl);
        if (!metadataResponse.ok) {
          throw new Error(
            `Failed to fetch well-known document: ${metadataResponse.status}`
          );
        }

        const metadata = await metadataResponse.json();
        const redirectUri =
          forgerockConfig.redirectUri || `${window.location.origin}/callback`;

        const userManager = new UserManager({
          authority: metadata.issuer,
          client_id: forgerockConfig.clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: forgerockConfig.scope || "openid profile email",
          automaticSilentRenew: true,
          loadUserInfo: true,
          post_logout_redirect_uri: window.location.origin,
          metadata: {
            ...metadata,
          },
        });

        userManagerRef.current = userManager;
        console.log(`[${providerName} Auth] [INIT] UserManager ready`);

        const params = new URLSearchParams(window.location.search);
        const isCallback = params.get("code") && params.get("state");

        if (isCallback) {
          console.log(`[${providerName} Auth] [CALLBACK] Processing redirect`);
          try {
            await userManager.signinRedirectCallback(window.location.href);
            await loadUserInfo();
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
            navigate("/", { replace: true });
            return;
          } catch (callbackError) {
            console.error(
              `[${providerName} Auth] [CALLBACK] Failed to process redirect`,
              callbackError
            );
            setIsLoading(false);
            return;
          }
        }

        const authenticated = await checkAuthentication();
        if (!authenticated) {
          console.log(
            `[${providerName} Auth] [INIT] No session found, starting login`
          );
          setIsLoading(true);
          await userManager.signinRedirect();
        }
      } catch (error) {
        console.error(`[${providerName} Auth] [INIT] Failed`, error);
        setIsLoading(false);
      }
    };

    initializeOidc();
  }, [navigate]);

  const login = async () => {
    try {
      const userManager = userManagerRef.current;
      if (!userManager) {
        throw new Error("UserManager not initialized");
      }

      console.log(
        `[${providerName} Auth] [login] Redirecting to identity provider`
      );
      setIsLoading(true);
      await userManager.signinRedirect();
    } catch (error) {
      console.error(`[${providerName} Auth] [login] Failed`, error);
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const userManager = userManagerRef.current;
      console.log(`[${providerName} Auth] [logout] Signing out`);
      if (userManager) {
        await userManager.removeUser();
        await userManager.signoutRedirect();
      }
    } catch (error) {
      console.error(`[${providerName} Auth] [logout] Failed`, error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      setIsAuthenticated(false);
      setUser(null);
      setEmail("");
      navigate("/login", { replace: true });
    }
  };

  // Context value containing all authentication state and methods
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
