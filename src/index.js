// src/index.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "react-oidc-context";
import { WebStorageStateStore } from "oidc-client-ts";
import App from "./App";
import "./index.css";

console.log("=== OIDC CONFIG ===");
console.log("Authority:", process.env.REACT_APP_AUTHORITY);
console.log("Client ID:", process.env.REACT_APP_CLIENT_ID);
console.log("Redirect URI:", process.env.REACT_APP_REDIRECT_URI);
console.log("==================");

const oidcConfig = {
  authority: process.env.REACT_APP_AUTHORITY,
  client_id: process.env.REACT_APP_CLIENT_ID,
  redirect_uri: process.env.REACT_APP_REDIRECT_URI,
  scope: process.env.REACT_APP_SCOPE || "openid profile email",

  response_type: "code",
  userStore: new WebStorageStateStore({
    store: window.localStorage,
  }),

  onSigninCallback: (user) => {
    console.log("✓ Keycloak Login Successful!", user);
    window.history.replaceState({}, document.title, window.location.pathname);
  },

  // Called after successful logout
  onSignoutCallback: () => {
    console.log("✓ Keycloak Logout Successful!");
    // Clean up URL after logout
    window.history.replaceState({}, document.title, window.location.pathname);
  },

  automaticSilentRenew: true,
  loadUserInfo: true,
  monitorSession: true,
};

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider {...oidcConfig}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
