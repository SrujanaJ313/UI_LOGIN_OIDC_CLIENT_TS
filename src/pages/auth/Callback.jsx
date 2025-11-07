import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OAuth2Client } from "@forgerock/javascript-sdk";
import { useAuth } from "../../context/AuthContext";

// Safe helper function to get location info without cross-origin errors
const getSafeLocationInfo = () => {
  try {
    return {
      href: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
    };
  } catch (error) {
    // Cross-origin access blocked, use safe alternatives
    try {
      return {
        href: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
      };
    } catch (e) {
      // Last resort - return minimal info
      return {
        href: "cross-origin-blocked",
        pathname: window.location?.pathname || "unknown",
        search: window.location?.search || "",
        hash: window.location?.hash || "",
      };
    }
  }
};

const Callback = () => {
  const navigate = useNavigate();
  const { checkAuthentication } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("[ForgeRock Callback] Handling OAuth callback...");
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");
        const from = urlParams.get("from");
        
        const locationInfo = getSafeLocationInfo();
        console.log("[ForgeRock Callback] Callback parameters:", {
          hasCode: !!code,
          hasState: !!state,
          redirectFrom: from || "default",
          currentUrl: locationInfo.href,
          pathname: locationInfo.pathname,
          search: locationInfo.search,
        });

        // Exchange authorization code for tokens
        console.log("[ForgeRock Callback] Exchanging authorization code for tokens...");
        const tokens = await OAuth2Client.getTokens();
        
        if (tokens && tokens.accessToken) {
          console.log("[ForgeRock Callback] Tokens received successfully:", {
            hasAccessToken: !!tokens.accessToken,
            hasRefreshToken: !!tokens.refreshToken,
            hasIdToken: !!tokens.idToken,
          });
          
          // Reload user info
          console.log("[ForgeRock Callback] Checking authentication...");
          await checkAuthentication();
          
          // Redirect to home or the originally requested page
          const redirectTo = from || "/";
          console.log("[ForgeRock Callback] Authentication successful, redirecting to:", redirectTo);
          navigate(redirectTo, { replace: true });
        } else {
          console.warn("[ForgeRock Callback] No access token received - redirecting to login");
          // No tokens, redirect to login
          navigate("/login", { replace: true });
        }
      } catch (error) {
        const locationInfo = getSafeLocationInfo();
        console.error("[ForgeRock Callback] Callback error:", error);
        console.error("[ForgeRock Callback] Error details:", {
          message: error.message,
          stack: error.stack,
          url: locationInfo.href,
          pathname: locationInfo.pathname,
          search: locationInfo.search,
        });
        console.log("[ForgeRock Callback] Redirecting to login due to error");
        navigate("/login", { replace: true });
      }
    };

    handleCallback();
  }, [navigate, checkAuthentication]);

  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh" 
    }}>
      <div>
        <h2>Completing login...</h2>
        <p>Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
};

export default Callback;

