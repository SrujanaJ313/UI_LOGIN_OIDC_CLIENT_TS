import React, { createContext, useContext, useState, useEffect } from "react";
import {
  Config,
  OAuth2Client,
  TokenManager,
  UserManager,
  FRUser,
} from "@forgerock/javascript-sdk";
import { useNavigate } from "react-router-dom";
import forgerockConfig from "../config/forgerock";

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
      console.log("[ForgeRock Auth] Loading user info...");
      const userInfo = await UserManager.getCurrentUser();
      if (userInfo) {
        console.log("[ForgeRock Auth] User info loaded successfully:", {
          email: userInfo.email,
          name: userInfo.name,
          id: userInfo.id,
        });
        setIsAuthenticated(true);
        setUser(userInfo);
        setEmail(userInfo.email || userInfo.name || "");
        console.log("[ForgeRock Auth] User authenticated successfully");
      } else {
        console.warn("[ForgeRock Auth] No user info returned from UserManager");
        setIsAuthenticated(false);
        setUser(null);
        setEmail("");
      }
    } catch (error) {
      console.error("[ForgeRock Auth] Error loading user info:", error);
      console.error("[ForgeRock Auth] Error details:", {
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
      console.log("[ForgeRock Auth] Checking authentication status...");
      const tokens = await TokenManager.getTokens();
      if (tokens && tokens.accessToken) {
        console.log("[ForgeRock Auth] Valid tokens found:", {
          hasAccessToken: !!tokens.accessToken,
          hasRefreshToken: !!tokens.refreshToken,
          hasIdToken: !!tokens.idToken,
        });
        await loadUserInfo();
      } else {
        console.log("[ForgeRock Auth] No valid tokens found - user not authenticated");
        setIsAuthenticated(false);
        setUser(null);
        setEmail("");
      }
    } catch (error) {
      console.error("[ForgeRock Auth] Error checking authentication:", error);
      console.error("[ForgeRock Auth] Error details:", {
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

  // Initialize ForgeRock SDK
  useEffect(() => {
    const initializeForgeRock = async () => {
      try {
        console.log("[ForgeRock Auth] Initializing ForgeRock SDK...");
        console.log("[ForgeRock Auth] Configuration:", {
          clientId: forgerockConfig.clientId,
          redirectUri: forgerockConfig.redirectUri,
          scope: forgerockConfig.scope,
          baseUrl: forgerockConfig.serverConfig?.baseUrl,
          realmPath: forgerockConfig.realmPath,
        });
        
        // Set ForgeRock SDK configuration
        Config.set(forgerockConfig);
        console.log("[ForgeRock Auth] SDK configuration set successfully");

        // Check if we're returning from OAuth callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");

        console.log("[ForgeRock Auth] URL parameters:", {
          hasCode: !!code,
          hasState: !!state,
          currentPath: window.location.pathname,
        });

        if (code && state) {
          console.log("[ForgeRock Auth] OAuth callback detected - exchanging code for tokens...");
          // Handle OAuth callback - exchange code for tokens
          try {
            const tokens = await OAuth2Client.getTokens();
            if (tokens && tokens.accessToken) {
              console.log("[ForgeRock Auth] Tokens received successfully from OAuth callback");
              await loadUserInfo();
              // Clean up URL
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname
              );
              console.log("[ForgeRock Auth] URL cleaned up after successful authentication");
            } else {
              console.warn("[ForgeRock Auth] No access token in OAuth callback response");
            }
          } catch (error) {
            console.error("[ForgeRock Auth] Error handling OAuth callback:", error);
            console.error("[ForgeRock Auth] OAuth callback error details:", {
              message: error.message,
              stack: error.stack,
              code: code?.substring(0, 10) + "...",
              state: state?.substring(0, 10) + "...",
            });
            setIsLoading(false);
          }
        } else {
          console.log("[ForgeRock Auth] No OAuth callback detected - checking for existing tokens...");
          // Check for existing tokens
          await checkAuthentication();
        }
      } catch (error) {
        console.error("[ForgeRock Auth] Error initializing ForgeRock:", error);
        console.error("[ForgeRock Auth] Initialization error details:", {
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
      console.log("[ForgeRock Auth] Initiating login flow...");
      console.log("[ForgeRock Auth] Redirect URI:", forgerockConfig.redirectUri);
      setIsLoading(true);
      // This will redirect to ForgeRock authorization server
      console.log("[ForgeRock Auth] Redirecting to ForgeRock authorization server...");
      await OAuth2Client.authorize();
      console.log("[ForgeRock Auth] Authorization redirect initiated");
    } catch (error) {
      console.error("[ForgeRock Auth] Login error:", error);
      console.error("[ForgeRock Auth] Login error details:", {
        message: error.message,
        stack: error.stack,
      });
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log("[ForgeRock Auth] Initiating logout...");
      await FRUser.logout();
      console.log("[ForgeRock Auth] Logout successful");
      setIsAuthenticated(false);
      setUser(null);
      setEmail("");
      console.log("[ForgeRock Auth] Local state cleared, navigating to home");
      navigate("/");
    } catch (error) {
      console.error("[ForgeRock Auth] Logout error:", error);
      console.error("[ForgeRock Auth] Logout error details:", {
        message: error.message,
        stack: error.stack,
      });
      // Even if logout fails, clear local state
      console.log("[ForgeRock Auth] Clearing local state despite logout error");
      setIsAuthenticated(false);
      setUser(null);
      setEmail("");
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
