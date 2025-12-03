import React, { useState } from "react";
import MuiAppBar from "@mui/material/AppBar";
import { Box, IconButton, Toolbar, Typography, styled, Button } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

import { AccountCircle } from "@mui/icons-material";
// import Notifications from "../Notifications";
import { Menu, MenuItem } from "@mui/material";
import { useAuth } from "../../../context/AuthContext";
const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  boxShadow: "none",
  borderBottomWidth: 1,
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(["width", "margin"], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    transition: theme.transitions.create(["width", "margin"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [anchorEl, setAnchorEl] = useState(null);
  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    setAnchorEl(null);

    try {
      console.log("🔓 Initiating logout...");
      // Use the logout function from AuthContext
      await logout();
      console.log("✓ Logout successful");
    } catch (error) {
      console.error("❌ Logout error:", error);
    }
  };

  return (
    <>
      {/* <AppBar position="absolute"> */}
      <AppBar>
        <Toolbar
          sx={{
            pr: "24px", // keep right padding when drawer closed
          }}
        >
          <Typography
            component="h1"
            variant="h6"
            className="!tracking-wider"
            fontWeight={600}
            noWrap
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            ADJ Dashboard
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 2,
              mr: 2,
            }}
          >
            <Button
              color="inherit"
              onClick={() => navigate("/")}
              sx={{
                textTransform: "none",
                fontWeight: location.pathname === "/" ? 600 : 400,
              }}
            >
              Services
            </Button>
            <Button
              color="inherit"
              onClick={() => navigate("/claimassist")}
              sx={{
                textTransform: "none",
                fontWeight: location.pathname === "/claimassist" ? 600 : 400,
              }}
            >
              ClaimAssist
            </Button>
            <Button
              color="inherit"
              onClick={() => navigate("/jms")}
              sx={{
                textTransform: "none",
                fontWeight: location.pathname === "/jms" ? 600 : 400,
              }}
            >
              JMS
            </Button>
            <Button
              color="inherit"
              onClick={() => navigate("/information")}
              sx={{
                textTransform: "none",
                fontWeight: location.pathname === "/information" ? 600 : 400,
              }}
            >
              Information
            </Button>
          </Box>
          <Box
            sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}
          >
            {/* <Notifications /> */}
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-haspopup="true"
              color="inherit"
              onClick={handleOpenMenu}
            >
              <AccountCircle />
            </IconButton>
            <span className="pl-2 text-white font-medium">
              Welcome, {user?.name || user?.email || "User"}
            </span>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem
          onClick={() => {
            handleCloseMenu();
            navigate("/");
          }}
        >
          Home
        </MenuItem>
        <MenuItem onClick={handleCloseMenu}>Profile</MenuItem>
        <MenuItem onClick={handleCloseMenu}>Settings</MenuItem>
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
    </>
  );
};

export default Header;
