// src/App.jsx
import React from "react";
import { useAuth } from "react-oidc-context";
import AppRoutes from "./routes"; // Adjust path as needed
import LoadingSpinner from "./components/LoadingSpinner";

function App() {
  const auth = useAuth();

  // Handle auth navigation states
  switch (auth.activeNavigator) {
    case "signinSilent":
      return <LoadingSpinner message="Refreshing your session..." />;
    case "signoutRedirect":
      return <LoadingSpinner message="Signing you out..." />;
  }

  // Initial loading
  if (auth.isLoading) {
    return <LoadingSpinner message="Loading..." />;
  }

  // Render your routes
  return <AppRoutes />;
}

export default App;
