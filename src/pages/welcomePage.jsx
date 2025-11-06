import React, { useEffect } from "react";
import MainLayout from "./MainLayout";
import { useSnackbar } from "../context/SnackbarContext";

function WelcomePage() {
  // const showSnackbar = useSnackbar();
  // useEffect(() => {
  //   showSnackbar("login Successful!!!.", 5000);
  // }, []);
  return (
    <>
      <MainLayout />
      <h1>Login Welcome Page</h1>
    </>
  );
}

export default WelcomePage;
