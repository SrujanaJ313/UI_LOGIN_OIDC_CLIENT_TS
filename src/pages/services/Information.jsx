import React from "react";
import { Box, Container, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import MainLayout from "../MainLayout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

/**
 * Information Page
 * 
 * Page for accessing educational documents and videos
 */
const Information = () => {
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
          }}
        >
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/")}
            sx={{ mb: 3 }}
          >
            Back to Services
          </Button>

          <Typography variant="h4" component="h1" sx={{ mb: 2, fontWeight: 600 }}>
            Information
          </Typography>

          <Typography variant="subtitle1" sx={{ mb: 4, color: "text.secondary" }}>
            Learn more about our services
          </Typography>

          <Typography variant="body1" sx={{ mb: 3 }}>
            Access educational documents and videos to learn more about our services.
          </Typography>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Available Resources:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 3 }}>
              <li>Educational documents and guides</li>
              <li>Video tutorials</li>
              <li>Frequently asked questions</li>
              <li>Service overviews</li>
              <li>Contact information</li>
            </Typography>
          </Box>
        </Box>
      </Container>
    </MainLayout>
  );
};

export default Information;

