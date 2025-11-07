import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { TokenStorage, UserManager } from "@forgerock/javascript-sdk";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // Check if user is already authenticated on mount
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to get stored tokens
        const tokens = await TokenStorage.get();

        if (tokens?.accessToken) {
          try {
            // Tokens exist, verify they're still valid by getting user info
            const userInfo = await UserManager.getCurrentUser();
            setUser(userInfo);
            setAccessToken(tokens.accessToken);
            setIsAuthenticated(true);
          } catch (err) {
            // Tokens are invalid or expired
            console.error("Token validation failed:", err);
            setIsAuthenticated(false);
            setUser(null);
            setAccessToken(null);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
          setAccessToken(null);
        }
      } catch (err) {
        console.error("Error checking authentication:", err);
        setError(err.message);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuthentication();
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setLoading(true);
      // Clear local state
      setIsAuthenticated(false);
      setUser(null);
      setAccessToken(null);
      setError(null);
    } catch (err) {
      console.error("Error during logout:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    isAuthenticated,
    user,
    loading,
    error,
    accessToken,
    setIsAuthenticated,
    setUser,
    setError,
    setAccessToken,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
