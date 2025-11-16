import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import { Divider, Stack } from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Captcha } from "../../components/captcha";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import InputAdornment from "@mui/material/InputAdornment";
import LockIcon from "@mui/icons-material/Lock";
import { useAuth } from "../../context/AuthContext";
import { providerName } from "../../config/forgerock";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated } = useAuth();
  const user =
    localStorage.getItem("user") && JSON.parse(localStorage.getItem("user"));
  const [captcha, setCaptcha] = useState(() =>
    Math.random().toString(36).slice(8)
  );

  const formik = useFormik({
    initialValues: {
      userID: user?.userID || "",
      password: user?.password || "",
      captcha: "",
    },
    validationSchema: Yup.object().shape({
      userID: Yup.string().required("UserID is required"),
      password: Yup.string().required("Password is required"),
      captcha: Yup.string()
        .required("Please enter captcha")
        .test("match", "Captcha does not match", (value) => value === captcha),
    }),
    onSubmit: (values) => {
      localStorage.setItem(
        "user",
        JSON.stringify({
          userID: values.userID,
          password: values.password,
        })
      );
      navigate("/homePage");
    },
  });

  useEffect(() => {
    if (!isAuthenticated) {
      console.log(
        `[LoginPage] Not authenticated, immediately redirecting to ForgeRock...`
      );
      login().catch((error) => {
        console.error(`[LoginPage] Error during redirect:`, error);
      });
    }
  }, [isAuthenticated, login]);

  const getCaptcha = (captchaValue) => {
    setCaptcha(captchaValue);
  };

  if (!isAuthenticated) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <div>
            <p>Redirecting to ForgeRock login...</p>
          </div>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          boxShadow: 3,
          borderRadius: 2,
          px: 4,
          py: 2,
          marginTop: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "white",
        }}
      >
        <Typography component="h1" variant="h3" fontWeight="900">
          NHUIS
        </Typography>
        <form onSubmit={formik.handleSubmit} style={{ width: "100%" }}>
          <TextField
            size="small"
            name="userID"
            placeholder="User ID"
            variant="outlined"
            fullWidth
            margin="normal"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.userID}
            error={formik.touched.userID && Boolean(formik.errors.userID)}
            helperText={formik.touched.userID && formik.errors.userID}
            label="User ID"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AccountCircleIcon />
                </InputAdornment>
              ),
              sx: { borderRadius: 30 },
            }}
          />
          <TextField
            size="small"
            name="password"
            placeholder="Password"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            value={formik.values.password}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
            label="Password"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon />
                </InputAdornment>
              ),
              sx: { borderRadius: 30 },
            }}
          />
          <Captcha formik={formik} captcha={captcha} getCaptcha={getCaptcha} />
          <Button
            type="submit"
            fullWidth
            size="small"
            variant="contained"
            sx={{
              mt: 3,
              mb: 2,
              textTransform: "none",
              fontSize: "1.2rem",
              borderRadius: "30px",
            }}
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        <Stack spacing={1} alignItems="center" sx={{ width: "100%" }}>
          <Link
            href=""
            onClick={() =>
              navigate("/forgot-password", { state: { value: "username?" } })
            }
            style={{ fontWeight: "bold" }}
          >
            Forgot username?
          </Link>

          <Link
            href=""
            onClick={() =>
              navigate("/forgot-password", { state: { value: "password?" } })
            }
            style={{ fontWeight: "bold" }}
          >
            Forgot password?
          </Link>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={2}
          sx={{ width: "100%", mt: 2 }}
        >
          <Divider sx={{ flexGrow: 1 }} />
          <Typography component="span" sx={{ fontSize: "1.2rem" }}>
            or
          </Typography>
          <Divider sx={{ flexGrow: 1 }} />
        </Stack>

        <Button
          fullWidth
          variant="outlined"
          sx={{
            mt: 3,
            mb: 2,
            borderRadius: "30px",
            textTransform: "none",
            fontSize: "1.2rem",
          }}
          size="small"
          onClick={async () => {
            console.log(
              `[LoginPage] Initiating ${providerName} OAuth login...`
            );
            await login();
          }}
          disabled={isLoading}
        >
          {isLoading ? "Redirecting..." : `Sign in with ${providerName}`}
        </Button>

        <Button
          fullWidth
          variant="contained"
          sx={{
            mt: 1,
            mb: 2,
            borderRadius: "30px",
            textTransform: "none",
            fontSize: "1.2rem",
          }}
          size="small"
          onClick={() => navigate("/register")}
        >
          Sign Up
        </Button>
      </Box>
    </Container>
  );
}
