import React from "react";
import ReactDOM from "react-dom/client";
import { Config } from "@forgerock/javascript-sdk";
import App from "./App";
import "./index.css";
import { SDK_CONFIG } from "./forgerock-config";
import { BrowserRouter } from "react-router-dom";

// Initialize ForgeRock SDK configuration BEFORE rendering the app
// This must be called before any other SDK method
Config.set(SDK_CONFIG);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
