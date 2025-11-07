import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OAuth2Client } from "@forgerock/javascript-sdk";
import { useAuth } from "../../context/AuthContext";

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
        
        console.log("[ForgeRock Callback] Callback parameters:", {
          hasCode: !!code,
          hasState: !!state,
          redirectFrom: from || "default",
          currentUrl: window.location.href,
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
        console.error("[ForgeRock Callback] Callback error:", error);
        console.error("[ForgeRock Callback] Error details:", {
          message: error.message,
          stack: error.stack,
          url: window.location.href,
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

