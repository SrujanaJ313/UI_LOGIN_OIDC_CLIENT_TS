import React from "react";
import { Container, Box, Toolbar } from "@mui/material";
// import LeftNavBar from "./LeftNavBar";
import Header from "./Header";
// import DashboardLayout from "../../components/dashboard/components/DashboardLayout";

// Main component
function MainLayout() {
  return (
    <Box sx={{ display: "flex", position: "relative", height: "100%" }}>
      <Header />
      {/* <LeftNavBar /> */}
      <Box component="main">
        <Toolbar />
        {/* <Container className="main-container bg-gray-100">
          <DashboardLayout />
        </Container> */}
      </Box>
      {/* <div className="absolute bottom-0 left-0 w-full h-14 bg-slate-500 text-white app-footer"></div> */}
    </Box>
  );
}

export default MainLayout;
