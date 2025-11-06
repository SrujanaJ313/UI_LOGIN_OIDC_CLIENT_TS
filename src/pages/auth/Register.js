import {
  Box,
  Button,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useFormik } from "formik";
import * as Yup from "yup";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LockIcon from "@mui/icons-material/Lock";
import MailIcon from "@mui/icons-material/Mail";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import BadgeIcon from "@mui/icons-material/Badge";
import { validatePassword } from "../../utils/common";
import { Captcha } from "../../components/captcha";
import { SecurityQuestions } from "../../components/SecurityQuestions";

export default function Register() {
  const navigate = useNavigate();
  const [captcha, setCaptcha] = useState(() =>
    Math.random().toString(36).slice(8)
  );

  const getCaptcha = (captchaValue) => {
    setCaptcha(captchaValue);
  };

  const validationSchema = Yup.object().shape({
    userID: Yup.string().required("UserID is required"),
    password: Yup.string()
      .required("Password is required")
      .min(8, "Password must be 8 characters long")
      .matches(/[0-9]/, "Password requires a number")
      .matches(/[a-z]/, "Password requires a lowercase letter")
      .matches(/[A-Z]/, "Password requires an uppercase letter")
      .matches(/[^\w]/, "Password requires a symbol"),
    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password"), null], "Passwords must match")
      .required("Confirm Password is required"),
    firstName: Yup.string().required("First Name is required"),
    middleInitial: Yup.string().required("Middle Initial is required"),
    lastName: Yup.string().required("Last Name is required"),
    email: Yup.string()
      .required("Email is required")
      .matches(
        /^[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*@affiliate\.nhes\.nh\.gov$/,
        "Invalid email"
      ),
    mobileNumber: Yup.string()
      .required("Mobile Number is required")
      .matches(/^[0-9]{10}$/, "Invalid Mobile Number"),
    dateOfBirth: Yup.string().required("Date of Birth is required"),
    captcha: Yup.string().required("Please enter captcha").matches(captcha),
  });

  const formik = useFormik({
    initialValues: {
      userID: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      middleInitial: "",
      lastName: "",
      email: "",
      mobileNumber: "",
      dateOfBirth: null,
      captcha: "",
    },
    validationSchema,
    onSubmit: (values) => {
      toast("Registered Successfully!");
      setTimeout(() => navigate("/login"), 3000);
    },
  });

  return (
    <>
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
            backgroundColor: "white",
          }}
        >
          <Typography component="h1" variant="h3" fontWeight="900">
            NHUIS
          </Typography>

          <form onSubmit={formik.handleSubmit} style={{ width: "100%" }}>
            <Stack spacing={2} mt={2}>
              <TextField
                size="small"
                name="userID"
                label="User ID"
                placeholder="User ID"
                fullWidth
                onChange={formik.handleChange}
                value={formik.values.userID}
                error={formik.touched.userID && Boolean(formik.errors.userID)}
                helperText={formik.touched.userID && formik.errors.userID}
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
                label="Password"
                placeholder="Password"
                type="password"
                fullWidth
                onChange={formik.handleChange}
                value={formik.values.password}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 30 },
                }}
              />
              {formik.touched.password && formik.errors.password && (
                <div>
                  {validatePassword(formik.values.password).map((err) => (
                    <div
                      style={{ fontSize: 12, color: err.errorCode }}
                      key={err.description}
                    >
                      {err.errorCode === "red" ? "✘" : "✔"} {err.description}
                    </div>
                  ))}
                </div>
              )}

              <TextField
                size="small"
                name="confirmPassword"
                label="Confirm Password"
                placeholder="Confirm Password"
                type="password"
                fullWidth
                onChange={formik.handleChange}
                value={formik.values.confirmPassword}
                error={
                  formik.touched.confirmPassword &&
                  Boolean(formik.errors.confirmPassword)
                }
                helperText={
                  formik.touched.confirmPassword &&
                  formik.errors.confirmPassword
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 30 },
                }}
              />

              {["firstName", "middleInitial", "lastName"].map((field) => (
                <TextField
                  key={field}
                  size="small"
                  name={field}
                  label={
                    field === "firstName"
                      ? "First Name"
                      : field === "middleInitial"
                      ? "Middle Initial"
                      : "Last Name"
                  }
                  placeholder={
                    field === "firstName"
                      ? "First Name"
                      : field === "middleInitial"
                      ? "Middle Initial"
                      : "Last Name"
                  }
                  fullWidth
                  onChange={formik.handleChange}
                  value={formik.values[field]}
                  error={formik.touched[field] && Boolean(formik.errors[field])}
                  helperText={formik.touched[field] && formik.errors[field]}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 30 },
                  }}
                />
              ))}

              <TextField
                size="small"
                name="email"
                label="Email"
                placeholder="Email"
                fullWidth
                onChange={formik.handleChange}
                value={formik.values.email}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailIcon />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 30 },
                }}
              />

              <TextField
                size="small"
                name="mobileNumber"
                label="Mobile Number"
                placeholder="Mobile Number"
                fullWidth
                onChange={formik.handleChange}
                value={formik.values.mobileNumber}
                error={
                  formik.touched.mobileNumber &&
                  Boolean(formik.errors.mobileNumber)
                }
                helperText={
                  formik.touched.mobileNumber && formik.errors.mobileNumber
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SmartphoneIcon />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 30 },
                }}
              />

              <LocalizationProvider dateAdapter={AdapterMoment}>
                <FormControl
                  fullWidth
                  error={
                    formik.touched.dateOfBirth &&
                    Boolean(formik.errors.dateOfBirth)
                  }
                >
                  <DatePicker
                    label="Date of Birth"
                    value={formik.values.dateOfBirth}
                    onChange={(value) =>
                      formik.setFieldValue("dateOfBirth", value)
                    }
                    slotProps={{ textField: { size: "small" } }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: "30px",
                        height: "40px",
                      },
                    }}
                  />
                  {formik.touched.dateOfBirth && formik.errors.dateOfBirth && (
                    <FormHelperText>{formik.errors.dateOfBirth}</FormHelperText>
                  )}
                </FormControl>
              </LocalizationProvider>

              <SecurityQuestions />

              <Captcha
                formik={formik}
                captcha={captcha}
                getCaptcha={getCaptcha}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 2,
                  textTransform: "none",
                  fontSize: "1.2rem",
                  borderRadius: "30px",
                }}
              >
                Create Account
              </Button>
            </Stack>
          </form>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={2}
            sx={{ mt: 2 }}
          >
            <Divider sx={{ flex: 1 }} />
            <Typography component="span" sx={{ fontSize: "1.2rem" }}>
              or
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Stack>

          <Button
            fullWidth
            variant="contained"
            sx={{
              mt: 2,
              borderRadius: "30px",
              textTransform: "none",
              fontSize: "1.2rem",
            }}
            onClick={() => navigate("/login")}
          >
            Log In
          </Button>
        </Box>
      </Container>
      <ToastContainer />
    </>
  );
}
