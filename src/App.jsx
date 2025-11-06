import React from "react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import RequireAuth from "./lib/authUser";
import authService from "./lib/authService";

const Home = () => (
  <div style={{ padding: "1rem" }}>
    <h1>Welcome</h1>
    <p>User: {authService.getUserFullName() || authService.getLoginName()}</p>
    <p>User ID: {authService.getUserId()}</p>
    <p>Roles: {authService.getRoles().join(", ")}</p>
    <div style={{ marginTop: "1rem" }}>
      <button onClick={() => authService.doLogout()}>Logout</button>
    </div>
    <nav style={{ marginTop: "1rem" }}>
      <Link to="/admin">Admin</Link>
      <span style={{ margin: "0 8px" }}>|</span>
      <Link to="/user">User</Link>
    </nav>
  </div>
);

const Admin = () => (
  <div style={{ padding: "1rem" }}>
    <h2>Admin Area</h2>
    <p>Only users with the admin role can view this page.</p>
  </div>
);

const User = () => (
  <div style={{ padding: "1rem" }}>
    <h2>User Area</h2>
    <p>Accessible to authenticated users.</p>
  </div>
);

const Callback = () => {
  // This component handles the OAuth callback
  // The actual token exchange is handled in authService.initForgeRock
  console.log("[Route] Reached /callback route");
  return (
    <div style={{ padding: "1rem", textAlign: "center" }}>
      <h2>Completing login...</h2>
      <p>Please wait while we complete your authentication.</p>
    </div>
  );
};

const App = () => {
  return (
    <Routes>
      <Route path="/callback" element={<Callback />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth roles={["admin"]}>
            <Admin />
          </RequireAuth>
        }
      />
      <Route
        path="/user"
        element={
          <RequireAuth>
            <User />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
