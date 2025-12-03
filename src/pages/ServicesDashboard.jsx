import React from "react";
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MainLayout from "./MainLayout";

/**
 * ServicesDashboard Component
 *
 * Displays available services with cards for:
 * - ClaimAssist (Unemployment Benefits)
 * - JMS (Job Match System)
 * - Information (Educational resources)
 */
const ServicesDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const userName = user?.name || user?.email?.split("@")[0] || "User";

  const services = [
    {
      id: 1,
      title: "ClaimAssist",
      subtitle: "Unemployment Benefits",
      description: "File for Unemployment Benefits and manage your claim.",
      icon: "📋",
      route: "/claimassist",
    },
    {
      id: 2,
      title: "JMS",
      subtitle: "Job Match System",
      description:
        "Register for work, build your resume. Work with a case manager to assist with reemployment.",
      icon: "💼",
      route: "/jms",
    },
    {
      id: 3,
      title: "Information",
      subtitle: "Learn more about our services",
      description:
        "Access educational documents and videos to learn more about our services.",
      icon: "📚",
      route: "/information",
    },
  ];

  return (
    <MainLayout>
      <Container
        maxWidth="lg"
        sx={{
          mt: 4,
          mb: 4,
          minHeight: "calc(100vh - 200px)",
        }}
      >
        <Box
          sx={{
            backgroundColor: "white",
            borderRadius: 2,
            p: 4,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          {/* Greeting */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              mb: 3,
              fontWeight: 500,
              color: "text.primary",
            }}
          >
            {getGreeting()} {userName}!
          </Typography>

          {/* Available Services Heading */}
          <Typography
            variant="h5"
            component="h2"
            sx={{
              mb: 2,
              color: "primary.main",
              fontWeight: 600,
            }}
          >
            Available Services
          </Typography>

          <Typography
            variant="body1"
            sx={{
              mb: 4,
              color: "text.secondary",
            }}
          >
            Please click on any of the services listed below to proceed.
          </Typography>

          {/* Service Cards */}
          <Grid container spacing={3}>
            {services.map((service) => (
              <Grid item xs={12} sm={6} md={4} key={service.id}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    cursor: "pointer",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => {
                    navigate(service.route);
                  }}
                >
                  <CardContent
                    sx={{
                      flexGrow: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      p: 3,
                    }}
                  >
                    {/* Icon */}
                    <Box
                      sx={{
                        fontSize: "4rem",
                        mb: 2,
                      }}
                    >
                      {service.icon}
                    </Box>

                    {/* Title */}
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        color: "text.primary",
                      }}
                    >
                      {service.title}
                    </Typography>

                    {/* Subtitle */}
                    <Typography
                      variant="subtitle2"
                      sx={{
                        mb: 2,
                        color: "text.secondary",
                        fontWeight: 500,
                      }}
                    >
                      {service.subtitle}
                    </Typography>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.secondary",
                        flexGrow: 1,
                      }}
                    >
                      {service.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </MainLayout>
  );
};

export default ServicesDashboard;
