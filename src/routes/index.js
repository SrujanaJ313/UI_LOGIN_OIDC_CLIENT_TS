// src/routes/AppRoutes.jsx
import { Navigate, Route, Routes } from "react-router-dom";

// Import your pages
import LoginPage from "../pages/auth/LoginPage";
import Register from "../pages/auth/Register";
import WelcomePage from "../pages/welcomePage";
import Verification from "../pages/auth/Verification";
import ForgotPwd from "../pages/auth/ForgotPwd";
import CreatePassword from "../pages/auth/CreatePassword";
import Callback from "../pages/auth/Callback";
import ProtectedRoute from "../components/ProtectedRoute";

function AppRoutes() {
  return (
    <Routes>
      {/* ======== PUBLIC ROUTES ======== */}
      {/* <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verification" element={<Verification />} />
      <Route path="/forgot-password" element={<ForgotPwd />} />
      <Route path="/reset-password" element={<CreatePassword />} /> */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<Callback />} />
      {/* <Route path="/logout" element={<Logout />} /> */}

      {/* ======== PROTECTED ROUTES ======== */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/homePage" element={<WelcomePage />} />
      </Route>

      {/* ======== CATCH ALL - Redirect to home ======== */}
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

export default AppRoutes;
