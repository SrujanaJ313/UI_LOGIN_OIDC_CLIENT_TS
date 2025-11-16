import React from "react";

// Callback component - AuthContext.js handles the actual callback processing
// This component just shows a loading state while AuthContext processes the OAuth callback
const Callback = () => {
  return (
    <div style={{ 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center", 
      height: "100vh" 
    }}>
      <div>
        <h2>Completing login...</h2>
        <p>Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
};

export default Callback;

