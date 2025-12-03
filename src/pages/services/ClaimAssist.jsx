import React from "react";
import { Box, Container, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import MainLayout from "../MainLayout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

/**
 * ClaimAssist Page
 * 
 * Page for managing Unemployment Benefits claims
 */
const ClaimAssist = () => {
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
            ClaimAssist
          </Typography>

          <Typography variant="subtitle1" sx={{ mb: 4, color: "text.secondary" }}>
            Unemployment Benefits
          </Typography>

          <Typography variant="body1" sx={{ mb: 3 }}>
            File for Unemployment Benefits and manage your claim.
          </Typography>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Available Actions:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 3 }}>
              <li>File a new unemployment claim</li>
              <li>View existing claim status</li>
              <li>Update claim information</li>
              <li>Submit weekly certifications</li>
              <li>View payment history</li>
            </Typography>
          </Box>
        </Box>
      </Container>
    </MainLayout>
  );
};

export default ClaimAssist;

