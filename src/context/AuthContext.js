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
  // State to track if the user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // State to track if the authentication process is loading
  const [isLoading, setIsLoading] = useState(true);
  // State to store the user's profile information
  const [user, setUser] = useState(null);
  // State to store the user's email or identifier
  const [email, setEmail] = useState("");
  // Ref to hold the OIDC UserManager instance (persists across renders)
  const userManagerRef = useRef(null);
  const navigate = useNavigate();

  /**
   * Fetches the user's profile information from the OIDC provider.
   * Updates the local state with the user's details if a valid session exists.
   */
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

      // Get the current user from the OIDC client storage
      const currentUser = await userManager.getUser();

      if (currentUser && !currentUser.expired) {
        console.log(`[${providerName} Auth] [loadUserInfo] User loaded`, {
          sub: currentUser.profile?.sub,
          email: currentUser.profile?.email,
        });
        setIsAuthenticated(true);
        setUser(currentUser.profile);
        // Fallback to name if email is not available
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

  /**
   * Checks if the user is currently authenticated.
   * Attempts to silently renew the token if the session has expired.
   * @returns {Promise<boolean>} True if authenticated, false otherwise.
   */
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

      // Case 1: Active, valid session found
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

      // Case 2: Session expired, try to renew silently (using refresh token or iframe)
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

      // Case 3: No valid session
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

  // Initialize OIDC Client and handle authentication flow on component mount
  useEffect(() => {
    const initializeOidc = async () => {
      try {
        const baseUrl = forgerockConfig.serverConfig?.baseUrl;
        const realmPath =
          forgerockConfig.serverConfig?.realmPath || forgerockConfig.realmPath;

        if (!baseUrl || !realmPath) {
          throw new Error("Base URL and realm path must be configured");
        }

        // Construct the OpenID Connect discovery URL
        // This URL provides all necessary endpoints (authorization, token, userinfo, etc.)
        const wellKnownUrl =
          `${baseUrl}/oauth2/realms/root/realms/${realmPath}/.well-known/openid-configuration`.replace(
            /([^:]\/)\/+/g,
            "$1"
          );
        console.log(`[${providerName} Auth] [INIT] Downloading metadata`, {
          wellKnownUrl,
        });

        // Fetch the OIDC configuration
        const metadataResponse = await fetch(wellKnownUrl);
        if (!metadataResponse.ok) {
          throw new Error(
            `Failed to fetch well-known document: ${metadataResponse.status}`
          );
        }

        const metadata = await metadataResponse.json();
        const redirectUri =
          forgerockConfig.redirectUri || `${window.location.origin}/callback`;

        // Initialize the OIDC UserManager with configuration
        const userManager = new UserManager({
          authority: metadata.issuer, // The OIDC issuer URL
          client_id: forgerockConfig.clientId,
          redirect_uri: redirectUri,
          response_type: "code", // Use Authorization Code flow with PKCE
          scope: forgerockConfig.scope || "openid profile email",
          automaticSilentRenew: true, // Automatically renew tokens before they expire
          loadUserInfo: true, // Auto-load user profile from UserInfo endpoint
          post_logout_redirect_uri: window.location.origin,
          metadata: {
            ...metadata,
          },
        });

        userManagerRef.current = userManager;
        console.log(`[${providerName} Auth] [INIT] UserManager ready`);

        // Check if we are handling an OAuth2 callback (redirect from login)
        const params = new URLSearchParams(window.location.search);
        const isCallback = params.get("code") && params.get("state");

        if (isCallback) {
          console.log(`[${providerName} Auth] [CALLBACK] Processing redirect`);
          try {
            // Process the callback: exchange code for tokens
            await userManager.signinRedirectCallback(window.location.href);
            await loadUserInfo();
            
            // Clean up the URL (remove code and state parameters)
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
            
            // Redirect to home page
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

        // If not a callback, check if the user is already authenticated
        const authenticated = await checkAuthentication();
        if (!authenticated) {
          console.log(
            `[${providerName} Auth] [INIT] No session found, starting login`
          );
          setIsLoading(true);
          // Automatically trigger login redirect if not authenticated
          await userManager.signinRedirect();
        }
      } catch (error) {
        console.error(`[${providerName} Auth] [INIT] Failed`, error);
        setIsLoading(false);
      }
    };

    initializeOidc();
  }, [navigate]);

  /**
   * Initiates the login process.
   * Redirects the user to the Identity Provider's login page.
   */
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

  /**
   * Logs the user out.
   * Clears local session and redirects to Identity Provider's logout endpoint.
   */
  const logout = async () => {
    try {
      const userManager = userManagerRef.current;
      console.log(`[${providerName} Auth] [logout] Signing out`);
      if (userManager) {
        await userManager.removeUser();
        // Redirect to IDP logout page
        await userManager.signoutRedirect();
      }
    } catch (error) {
      console.error(`[${providerName} Auth] [logout] Failed`, error);
    } finally {
      // Clear local storage as a fallback
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
