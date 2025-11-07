import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { apiClient, parseResponse } from "../utils/api";
import MainLayout from "./MainLayout";
import { useSnackbar } from "../context/SnackbarContext";

function WelcomePage() {
  // const showSnackbar = useSnackbar();
  // useEffect(() => {
  //   showSnackbar("login Successful!!!.", 5000);
  // }, []);

  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogout = async () => {
    navigate("/logout");
  };

  // Example: Fetch data from protected API
  const fetchProtectedData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Replace with your actual API endpoint
      const response = await apiClient.get(
        "https://your-api.com/api/protected-data"
      );
      const jsonData = await parseResponse(response);
      setData(jsonData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="dashboard">
        <div className="alert alert-warning">
          Not authenticated. Redirecting to login...
        </div>
      </div>
    );
  }

  return (
    <>
      <MainLayout />
      <h1>Login Welcome Page</h1>
    </>
  );
}

export default WelcomePage;
