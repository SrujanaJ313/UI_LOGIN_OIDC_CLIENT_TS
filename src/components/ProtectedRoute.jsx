import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { TokenManager, Config } from "@forgerock/javascript-sdk";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateAccessToken = async () => {
      console.log("[ForgeRock ProtectedRoute] Validating access token...", {
        isAuthenticated,
        isLoading,
        hasUser: !!user,
      });

      if (isAuthenticated && user) {
        // User is authenticated and has user info - consider valid
        // We skip SDK's UserManager.getCurrentUser() to avoid wrong URL construction
        console.log(
          "[ForgeRock ProtectedRoute] User is authenticated with user info - granting access"
        );
        setIsValid(true);
        setIsValidating(false);
        console.log("[ForgeRock ProtectedRoute] Route access granted");
        return;
      }

      if (isAuthenticated && !user) {
        // Authenticated but no user info - try to validate token manually
        try {
          console.log(
            "[ForgeRock ProtectedRoute] User authenticated but no user info, validating token..."
          );
          
          // Check if tokens exist
          const tokens = await TokenManager.getTokens({ forceRenew: false });
          if (!tokens || !tokens.accessToken) {
            throw new Error("No access token found");
          }
          
          // Try to validate token by fetching userinfo with correct endpoint
          const config = await Config.get();
          const userInfoEndpoint = config.serverConfig?.userInfoEndpoint || 
                                   config.serverConfig?.userinfo_endpoint;
          
          if (userInfoEndpoint) {
            console.log("[ForgeRock ProtectedRoute] Validating token using userinfo endpoint:", userInfoEndpoint);
            const userInfoResponse = await fetch(userInfoEndpoint, {
              headers: {
                'Authorization': `Bearer ${tokens.accessToken}`
              }
            });
            
            if (userInfoResponse.ok) {
              const userInfoData = await userInfoResponse.json();
              console.log("[ForgeRock ProtectedRoute] Token validation successful:", {
                hasUserInfo: !!userInfoData,
                userEmail: userInfoData?.email,
              });
              setIsValid(true);
            } else {
              throw new Error(`Token validation failed: ${userInfoResponse.status}`);
            }
          } else {
            // No userinfo endpoint configured, but we have tokens - consider valid
            console.log("[ForgeRock ProtectedRoute] No userinfo endpoint configured, but tokens exist - granting access");
            setIsValid(true);
          }
          console.log("[ForgeRock ProtectedRoute] Route access granted");
        } catch (err) {
          console.error(
            "[ForgeRock ProtectedRoute] Token validation failed:",
            err
          );
          console.error(
            "[ForgeRock ProtectedRoute] Validation error details:",
            {
              message: err.message,
              stack: err.stack,
            }
          );
          setIsValid(false);
          console.log(
            "[ForgeRock ProtectedRoute] Route access denied - invalid token"
          );
        } finally {
          setIsValidating(false);
        }
      } else {
        console.log(
          "[ForgeRock ProtectedRoute] User not authenticated - skipping token validation"
        );
        setIsValidating(false);
      }
    };

    validateAccessToken();
  }, [isAuthenticated, isLoading, user]);

  if (isLoading || isValidating) {
    console.log(
      "[ForgeRock ProtectedRoute] Still loading/validating, showing loading state"
    );
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div>
          <p>Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !isValid) {
    console.log(
      "[ForgeRock ProtectedRoute] Access denied - redirecting to login:",
      {
        isAuthenticated,
        isValid,
      }
    );
    return <Navigate to="/login" replace />;
  }

  console.log(
    "[ForgeRock ProtectedRoute] Access granted - rendering protected content"
  );

  return <Outlet />;
};

export default ProtectedRoute;
