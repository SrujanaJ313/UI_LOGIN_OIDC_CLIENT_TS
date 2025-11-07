import React, { useState, useEffect } from "react";
import { FRAuth } from "@forgerock/javascript-sdk";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Login.css"; // Optional: add your styling

const Login = () => {
  const [step, setStep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setIsAuthenticated, setUser, setAccessToken } = useAuth();
  const navigate = useNavigate();

  // Initialize the authentication journey
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        setError(null);

        // Start the authentication flow
        const initialStep = await FRAuth.start();
        setStep(initialStep);
      } catch (err) {
        console.error("Error initializing authentication:", err);
        setError(
          err.message || "Failed to initialize login. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Handle form submission
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!step) {
      setError("Authentication step not initialized");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Submit credentials to ForgeRock
      const nextStep = await FRAuth.next(step);

      if (nextStep.type === "LoginSuccess") {
        // Authentication successful
        try {
          // Get user information
          const userInfo = await UserManager.getCurrentUser();

          // Get access token
          const tokens = await FRAuth.getAccessToken?.();

          // Update auth context
          setUser(userInfo);
          setAccessToken(tokens);
          setIsAuthenticated(true);

          // Redirect to dashboard or home
          navigate("/dashboard", { replace: true });
        } catch (err) {
          console.error("Error getting user info after login:", err);
          setError("Login succeeded but failed to retrieve user information");
        }
      } else if (nextStep.type === "Step") {
        // More authentication steps required (e.g., MFA, additional questions)
        setStep(nextStep);
      } else {
        // Handle other response types
        setStep(nextStep);
      }
    } catch (err) {
      console.error("Error during login:", err);
      setError(err.message || "Login failed. Please try again.");
      // Reset step to allow retry
      try {
        const initialStep = await FRAuth.start();
        setStep(initialStep);
      } catch (resetErr) {
        console.error("Error resetting login:", resetErr);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render callback based on type
  const renderCallback = (callback, index) => {
    const inputName = callback?.payload?.input?.name;
    const callbackType = callback.getType();

    switch (callbackType) {
      case "NameCallback":
        return (
          <div key={inputName || index} className="form-group mb-3">
            <label className="form-label">{callback.getPrompt()}</label>
            <input
              type="text"
              className="form-control"
              placeholder={callback.getPrompt()}
              onChange={(e) => callback.setInputValue(e.target.value)}
              defaultValue={callback.getInputValue() || ""}
              autoFocus={index === 0}
              required
            />
          </div>
        );

      case "PasswordCallback":
        return (
          <div key={inputName || index} className="form-group mb-3">
            <label className="form-label">{callback.getPrompt()}</label>
            <input
              type="password"
              className="form-control"
              placeholder={callback.getPrompt()}
              onChange={(e) => callback.setInputValue(e.target.value)}
              defaultValue={callback.getInputValue() || ""}
              required
            />
          </div>
        );

      case "ChoiceCallback":
        return (
          <div key={inputName || index} className="form-group mb-3">
            <label className="form-label">{callback.getPrompt()}</label>
            <select
              className="form-control"
              onChange={(e) => callback.setInputValue(parseInt(e.target.value))}
              defaultValue={callback.getSelectedIndex()}
            >
              {callback.getChoices().map((choice, choiceIndex) => (
                <option key={choiceIndex} value={choiceIndex}>
                  {choice}
                </option>
              ))}
            </select>
          </div>
        );

      case "TextOutputCallback":
        return (
          <div key={index} className="alert alert-info">
            {callback.getMessage()}
          </div>
        );

      default:
        console.warn(`Unhandled callback type: ${callbackType}`);
        return null;
    }
  };

  if (loading) {
    return (
      <div className="login-container">
        <div className="login-form">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading login form...</span>
          </div>
          <p>Loading login form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-form">
        <h2 className="mb-4">Sign In to Your Account</h2>

        {error && (
          <div
            className="alert alert-danger alert-dismissible fade show"
            role="alert"
          >
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={() => setError(null)}
            ></button>
          </div>
        )}

        {step &&
        step.type === "Step" &&
        step.callbacks &&
        step.callbacks.length > 0 ? (
          <form onSubmit={handleSubmit}>
            {step.callbacks.map((callback, index) => (
              <div key={index}>{renderCallback(callback, index)}</div>
            ))}

            <button
              type="submit"
              className="btn btn-primary w-100 mt-4"
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        ) : (
          <div className="alert alert-warning">
            <p>{step?.payload?.message || "Processing authentication..."}</p>
            <div className="spinner-border spinner-border-sm" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
