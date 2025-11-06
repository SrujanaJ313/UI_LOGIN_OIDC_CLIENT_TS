// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "react-oidc-context";
import LoadingSpinner from "./LoadingSpinner";

const ProtectedRoute = () => {
  const auth = useAuth();

  console.log("ProtectedRoute State:", {
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    activeNavigator: auth.activeNavigator,
    error: auth.error?.message,
  });

  // Handle auth navigation states (signin/signout in progress)
  switch (auth.activeNavigator) {
    case "signinSilent":
      console.log("🔄 Silent sign-in in progress...");
      return <LoadingSpinner message="Refreshing your session..." />;
    case "signoutRedirect":
      console.log("🔄 Sign-out redirect in progress...");
      return <LoadingSpinner message="Signing you out..." />;
  }

  // Still loading authentication state
  if (auth.isLoading) {
    console.log("⏳ Loading authentication...");
    return <LoadingSpinner message="Loading authentication..." />;
  }

  // Handle authentication errors
  if (auth.error) {
    console.log("❌ Authentication error:", auth.error.message);
    return (
      <div
        className="error-container"
        style={{
          padding: "20px",
          textAlign: "center",
          color: "#d32f2f",
        }}
      >
        <h1>Authentication Error</h1>
        <p>Error: {auth.error.message}</p>
        <button
          onClick={() => auth.signinRedirect()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#3498db",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // User is not authenticated - redirect to SSO login
  if (!auth.isAuthenticated) {
    console.log("❌ Not authenticated - Calling signinRedirect...");

    // Call the redirect
    auth.signinRedirect();

    // IMPORTANT: Return loading spinner to prevent rendering protected content
    return <LoadingSpinner message="Redirecting to login..." />;
  }

  // User is authenticated, render protected content
  console.log("✅ Authenticated - Rendering protected content");
  return <Outlet />;
};

export default ProtectedRoute;
