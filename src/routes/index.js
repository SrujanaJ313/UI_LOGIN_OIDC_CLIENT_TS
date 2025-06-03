import { Navigate, Route, Routes, Outlet } from "react-router-dom";
// import MSLReferenceList from "../pages/mslReferenceList";
// import ClaimantList from "../pages/claimantList";
import LoginPage from "../pages/auth/LoginPage"
import Register from "../pages/auth/Register";
import WelcomePage from "../pages/welcomePage";
import Verification from "../pages/auth/Verification";
// import { useEffect, useState } from 'react';
// import Header from '../components/Header';
import ForgotPwd from "../pages/auth/ForgotPwd";
// import useAuthRouteCheck from "../hooks/useAuthRouteCheck";
// import MainLayout from "../pages/MainLayout";
import CreatePassword from "../pages/auth/CreatePassword";

function PrivateRoute() {
    const token = localStorage.getItem("user");
    return token ? <Outlet /> : <Navigate replace to="/login" />;
}

function AppRoutes() {
    // const isAuthRoute = useAuthRouteCheck();
    // const showHeader = !isAuthRoute
    // const isLoggedin = Object.keys(localStorage.getItem("user") || {}).length;
    const isLoggedin = false;

    return (
        <>
            {/* {showHeader && <Header />} */}
            <Routes>
                <Route element={<PrivateRoute />}>
                    <Route element={<WelcomePage />} path="/homePage" />
                </Route>
                <Route element={<Navigate replace to={isLoggedin ? "/homePage" : "/login"} />} path="*" />
                <Route element={<LoginPage />} path="/login" />
                <Route element={<Register />} path="/register" />
                <Route element={<Verification />} path="/verification" />
                <Route element={<ForgotPwd />} path="/forgot-password" />
                <Route element={<CreatePassword />} path="/reset-password" />
            </Routes>
        </>
    )
}

export default AppRoutes;