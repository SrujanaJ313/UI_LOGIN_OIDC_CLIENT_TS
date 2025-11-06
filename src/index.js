import React from "react";
// import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { httpClient, setAxiosInterceptors } from "./lib/httpClient";
import authService from "./lib/authService";
// import RequireAuth from "./lib/authUser";
import ReactDOM from "react-dom/client";
// import { AuthProvider } from "react-oidc-context";
// import { WebStorageStateStore } from "oidc-client-ts";
import "./index.css";

// const renderApp = () => {
//   const container = document.getElementById("root");
//   const root = createRoot(container);
//   root.render(
//     <BrowserRouter>
//       <RequireAuth>
//         <App />
//       </RequireAuth>
//     </BrowserRouter>
//   );
// };

const container = document.getElementById("root");
const root = ReactDOM.createRoot(container);

const renderApp = () =>
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );

httpClient
  .get("/configs.json", { skipAuth: true })
  .then((response) => {
    console.log("[Boot] Loaded configs.json:", response);

    // response is already response.data due to the interceptor
    window.globalAppConfig = response;
    console.log(
      "[Boot] Initializing ForgeRock with path:",
      window.globalAppConfig && window.globalAppConfig.FORGEROCK_PATH
    );
    authService.initForgeRock(
      window.globalAppConfig && window.globalAppConfig.FORGEROCK_PATH,
      renderApp
    );

    setAxiosInterceptors();
  })
  .catch((err) => {
    console.error("[Boot] Failed to load configs.json:", err);
  });
