import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FRUser, TokenStorage } from "@forgerock/javascript-sdk";
import { useAuth } from "../context/AuthContext";

const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Call ForgeRock logout endpoint
        await FRUser.logout();
      } catch (err) {
        console.error("Error during ForgeRock logout:", err);
        // Continue with local logout even if API call fails
      }

      try {
        // Clear stored tokens
        await TokenStorage.set(null);
      } catch (err) {
        console.error("Error clearing token storage:", err);
      }

      // Clear auth context
      await logout();

      // Redirect to login after a brief delay
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1000);
    };

    handleLogout();
  }, [navigate, logout]);

  return (
    <div className="logout-container">
      <div className="loading-wrapper">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Logging out...</p>
        <p className="text-muted small">Please wait while we sign you out.</p>
      </div>
    </div>
  );
};

export default Logout;
