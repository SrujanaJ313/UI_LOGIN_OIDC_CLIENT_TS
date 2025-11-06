import React from "react";
import authService from "./authService";

const Unauthorized = () => (
  <div style={{ padding: "1rem" }}>
    <h2>Unauthorized</h2>
    <p>You do not have access to view this page.</p>
  </div>
);

const RequireAuth = ({ roles = [], children }) => {
  const isAuthed = authService.isLoggedIn();
  if (!isAuthed) {
    console.warn("[Guard] User not authenticated; UI will render after OAuth redirect");
    return null;
  }

  if (roles && roles.length > 0) {
    const userRoles = authService.getRoles();
    const hasRequired = roles.some((r) => userRoles.includes(r));
    if (!hasRequired) {
      console.warn("[Guard] Missing required role(s)", { required: roles, userRoles });
      return <Unauthorized />;
    }
  }

  return <>{children}</>;
};

export default RequireAuth;
