import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TokenManager, UserManager, FRAuth } from "@forgerock/javascript-sdk";
import { useAuth } from "../context/AuthContext";

const Callback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setIsAuthenticated, setUser, setAccessToken, setError } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if there's an authorization code in the URL (OAuth2 flow)
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (error) {
          throw new Error(
            `Authentication error: ${error} - ${
              errorDescription || "Unknown error"
            }`
          );
        }

        if (!code) {
          throw new Error("No authorization code received from ForgeRock");
        }

        // Get tokens using the authorization code
        // The SDK handles exchanging the code for tokens
        const tokens = await TokenManager.getTokens();

        if (!tokens || !tokens.accessToken) {
          throw new Error("Failed to retrieve access token");
        }

        // Get user information
        const userInfo = await UserManager.getCurrentUser();

        if (!userInfo) {
          throw new Error("Failed to retrieve user information");
        }

        // Update auth context
        setUser(userInfo);
        setAccessToken(tokens.accessToken);
        setIsAuthenticated(true);

        // Redirect to dashboard
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error("Error during callback:", err);
        setError(err.message || "Authentication callback failed");

        // Redirect to login after a delay
        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [
    searchParams,
    navigate,
    setIsAuthenticated,
    setUser,
    setAccessToken,
    setError,
  ]);

  return (
    <div className="callback-container">
      <div className="loading-wrapper">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Processing authentication...</p>
        <p className="text-muted small">
          Please wait while we complete your login.
        </p>
      </div>
    </div>
  );
};

export default Callback;
