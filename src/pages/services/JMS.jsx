import React from "react";
import { Box, Container, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import MainLayout from "../MainLayout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

/**
 * JMS (Job Match System) Page
 * 
 * Page for job matching and reemployment services
 */
const JMS = () => {
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
            JMS
          </Typography>

          <Typography variant="subtitle1" sx={{ mb: 4, color: "text.secondary" }}>
            Job Match System
          </Typography>

          <Typography variant="body1" sx={{ mb: 3 }}>
            Register for work, build your resume. Work with a case manager to assist with reemployment.
          </Typography>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Available Features:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 3 }}>
              <li>Register for work search</li>
              <li>Build and update your resume</li>
              <li>Search for job opportunities</li>
              <li>Connect with case managers</li>
              <li>Access reemployment resources</li>
            </Typography>
          </Box>
        </Box>
      </Container>
    </MainLayout>
  );
};

export default JMS;

