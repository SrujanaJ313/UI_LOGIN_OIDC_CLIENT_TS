import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { UserManager } from "@forgerock/javascript-sdk";

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateAccessToken = async () => {
      console.log("[ForgeRock ProtectedRoute] Validating access token...", {
        isAuthenticated,
        isLoading,
      });

      if (isAuthenticated) {
        try {
          console.log(
            "[ForgeRock ProtectedRoute] User is authenticated, validating token..."
          );
          // Validate token by getting current user
          const userInfo = await UserManager.getCurrentUser();
          console.log(
            "[ForgeRock ProtectedRoute] Token validation successful:",
            {
              hasUserInfo: !!userInfo,
              userEmail: userInfo?.email,
            }
          );
          setIsValid(true);
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
  }, [isAuthenticated, isLoading]);

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
