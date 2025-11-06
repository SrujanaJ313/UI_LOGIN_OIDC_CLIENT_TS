import React, { useState } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import { useNavigate } from "react-router-dom";

import NHUISLogo from "../../../src/assets/images/NHUIS-Logo.gif";
import { Menu, MenuItem } from "@mui/material";
import IconButton from "@mui/material/IconButton";

function stringToColor(string) {
  let hash = 0;
  let i;

  /* eslint-disable no-bitwise */
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  /* eslint-enable no-bitwise */

  return color;
}

function stringAvatar(name) {
  return {
    sx: {
      bgcolor: stringToColor(name),
    },
    children: `${name.split(" ")[0][0]}${name.split(" ")[1][0]}`,
  };
}

export default function Header() {
  const navigate = useNavigate();
  let userDetails = null;
  if (localStorage.getItem("user")) {
    userDetails = JSON.parse(localStorage.getItem("user"));
  }
  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    setAnchorEl(null);
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <>
      <Box
        boxSizing="border-box"
        height={{ xs: "70px", midsm: "90px" }}
        sx={{
          backgroundColor: "#183084",
          position: "fixed",
          zIndex: "999",
          top: 0,
        }}
        width="100%"
        alignItems="center"
      >
        <Stack direction="row" justifyContent={"space-between"}>
          <Stack
            direction="row"
            marginLeft={2}
            spacing={3}
            alignItems="center"
            height="100%"
          >
            <img src={NHUISLogo} height="70px" />
            <Stack>
              <Stack>
                <Typography color="white">
                  NEW HAMPSHIRE UNEMPLOYMENT INSURANCE SYSTEM
                </Typography>
              </Stack>
              {/* <Stack><Typography></Typography></Stack> */}
            </Stack>
          </Stack>
          {userDetails && (
            <IconButton color="inherit" onClick={handleOpenMenu}>
              <Avatar {...stringAvatar(userDetails?.userName)} />
            </IconButton>
          )}
        </Stack>
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        // transformOrigin={{
        //     vertical: 'top',
        //     horizontal: 'right',
        // }}
      >
        <MenuItem onClick={handleCloseMenu}>Profile</MenuItem>
        <MenuItem onClick={handleCloseMenu}>Settings</MenuItem>
        <MenuItem onClick={handleLogout}>Logout</MenuItem>
      </Menu>
    </>
  );
}
