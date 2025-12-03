import React from "react";
import { Box, Container, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import MainLayout from "./MainLayout";

function WelcomePage() {
  // Note: Authentication check is handled by ProtectedRoute wrapper
  // No need to duplicate the check here
  const navigate = useNavigate();

  return (
    <MainLayout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box
          sx={{
            backgroundColor: "white",
            borderRadius: 2,
            p: 4,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            sx={{ mb: 3, fontWeight: 600 }}
          >
            Welcome to ADJ Dashboard
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, color: "text.secondary" }}>
            This is the legacy welcome page. Navigate to the Services Dashboard
            to access available services.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate("/")}
          >
            Go to Services Dashboard
          </Button>
        </Box>
      </Container>
    </MainLayout>
  );
}

export default WelcomePage;
