import React, { useState } from "react";
import MuiAppBar from "@mui/material/AppBar";
import { Box, IconButton, Toolbar, Typography, styled } from "@mui/material";

import { AccountCircle } from "@mui/icons-material";
// import Notifications from "../Notifications";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, MenuItem } from "@mui/material";
import { useAuth } from "react-oidc-context";
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
  const auth = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // const handleLogout = () => {
  //   setAnchorEl(null);
  //   if (!location?.state?.remember) {
  //     localStorage.removeItem("user");
  //   }
  //   navigate("/login");
  // };

  const handleLogout = async () => {
    // const auth = useAuth();

    setAnchorEl(null);

    try {
      console.log("🔓 Initiating logout...");

      // Remove user from OIDC
      await auth.removeUser();

      console.log("✓ User removed from OIDC");

      // Use signoutRedirect instead of manual redirect
      // This properly handles the logout flow
      await auth.signoutRedirect({
        id_token_hint: auth.user?.id_token,
      });

      console.log("✓ Logout redirect called");
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
          >
            ADJ Dashboard
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
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
              Welcome, Srujana
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
        <MenuItem onClick={handleCloseMenu}>Profile</MenuItem>
        <MenuItem onClick={handleCloseMenu}>Settings</MenuItem>
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
    </>
  );
};

export default Header;
