import React from "react";
import MainLayout from "./MainLayout";

function WelcomePage() {
  // Note: Authentication check is handled by ProtectedRoute wrapper
  // No need to duplicate the check here

  return (
    <>
      <MainLayout />
      <h1>Login Welcome Page</h1>
    </>
  );
}

export default WelcomePage;
