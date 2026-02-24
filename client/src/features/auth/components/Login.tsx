import { useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Stack,
  Link,
  Checkbox,
  FormControlLabel,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useLoginMutation } from "../api/authApi";

// Custom Components
import FFButton from "@/components/ui/FFButton";
import FFInputField from "@/components/ui/FFInputField";

// Assets
import logoImg from "../../../assets/Images/Logo.webp";
import LoginImg from "../../../assets/Images/SignUpImg.webp";
import backgroundGrids from "../../../assets/Images/Background-pattern-decorative.webp";

// const GoogleIcon = () => (
//   <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
//     <path
//       d="M23.52 12.273c0-.851-.076-1.67-.218-2.455H12v4.643h6.455c-.279 1.503-1.127 2.775-2.404 3.63v3.018h3.894c2.278-2.097 3.593-5.185 3.593-8.836z"
//       fill="#4285F4"
//     />
//     <path
//       d="M12 24c3.24 0 5.957-1.074 7.942-2.909l-3.894-3.018c-1.075.72-2.451 1.146-4.048 1.146-3.124 0-5.768-2.11-6.713-4.948H1.354v3.111C3.33 21.298 7.373 24 12 24z"
//       fill="#34A853"
//     />
//     <path
//       d="M5.287 14.271a7.18 7.18 0 010-4.542V6.618H1.354A11.977 11.977 0 000 12c0 1.933.464 3.765 1.354 5.382l3.933-3.111z"
//       fill="#FBBC05"
//     />
//     <path
//       d="M12 4.773c1.762 0 3.345.606 4.588 1.795l3.442-3.442C17.953 1.164 15.236 0 12 0 7.373 0 3.33 2.702 1.354 6.618l3.933 3.111c.945-2.838 3.589-4.956 6.713-4.956z"
//       fill="#EA4335"
//     />
//   </svg>
// );

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [login, { isLoading, error }] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password }).unwrap();
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const getErrorMessage = () => {
    if (!error) return null;
    if ("data" in error) {
      const errorData = error.data as { message?: string };
      return errorData?.message || "Login failed";
    }
    return "Login failed. Please try again.";
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        bgcolor: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      {/* Left Side - Form */}
      <Box
        sx={{
          flex: { xs: "1", md: "0 0 50%" },
          maxWidth: { md: "50%" },
          display: "flex",
          flexDirection: "column",
          position: "relative",
          p: { xs: 3, sm: 6, md: 8 },
          justifyContent: "center", // Center vertically
          height: "100vh",
          overflowY: "auto",
        }}
      >
        {/* Background Grids */}
        <Box
          component="img"
          src={backgroundGrids}
          alt=""
          sx={{
            position: "absolute",
            top: -100,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.5,
            zIndex: 0,
            pointerEvents: "none",
          }}
        />

        {/* Content Container */}
        <Box
          sx={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: "380px", // Match design width
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center", // Center align text and logo
          }}
        >
          {/* Logo */}
          <Box
            component="img"
            src={logoImg}
            alt="Fast Friends Logo"
            sx={{
              width: 80,
              height: 80,
              mb: 3,
            }}
          />

          {/* Heading */}
          <Typography
            variant="h2"
            sx={{
              fontSize: "30px",
              fontWeight: 700,
              color: "#101828",
              mb: 1,
              textAlign: "center",
            }}
          >
            Fast Friends
          </Typography>
          <Typography
            sx={{
              fontSize: "16px",
              color: "#667085",
              mb: 4,
              textAlign: "center",
            }}
          >
            Welcome back! Please enter your details.
          </Typography>

          {/* Error Alert */}
          {error && (
            <Alert
              severity="error"
              sx={{
                width: "100%",
                mb: 3,
                borderRadius: "8px",
              }}
            >
              {getErrorMessage()}
            </Alert>
          )}

          {/* Form */}
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ width: "100%" }}
          >
            <Stack spacing={2.5}>
              <FFInputField
                label="Email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ maxWidth: "100%" }}
              />

              <FFInputField
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ maxWidth: "100%" }}
              />

              {/* Remember Me & Forgot Password */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      sx={{
                        color: "#D0D5DD",
                        "&.Mui-checked": {
                          color: "#E57B2C",
                        },
                      }}
                    />
                  }
                  label={
                    <Typography
                      sx={{
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "#344054",
                      }}
                    >
                      Remember for 30 days
                    </Typography>
                  }
                />
                <Link
                  component={RouterLink}
                  to="/forgot-password" // Assuming this route exists or will exist
                  sx={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#6941C6", // Purple/Primary color from design
                    textDecoration: "none",
                    "&:hover": {
                      textDecoration: "underline",
                    },
                  }}
                >
                  Forgot password
                </Link>
              </Box>

              {/* Actions */}
              <FFButton
                type="submit"
                variant="primary"
                fullWidth
                loading={isLoading}
              >
                Sign in
              </FFButton>

              {/* <FFButton
                type="button"
                variant="secondary"
                fullWidth
                iconLeft={<GoogleIcon />}
                onClick={() => console.log("Google Sign In clicked")}
              >
                Sign in with Google
              </FFButton> */}
            </Stack>
          </Box>

          {/* Footer - Sign Up */}
          <Typography
            sx={{
              fontSize: "14px",
              color: "#667085",
              mt: 4,
              textAlign: "center",
            }}
          >
            Don't have an account?{" "}
            <Link
              component={RouterLink}
              to="/signup"
              sx={{
                fontWeight: 600,
                color: "#6941C6",
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Sign up
            </Link>
          </Typography>
        </Box>

        {/* Copyright */}
        <Box
          sx={{
            position: "absolute",
            bottom: { xs: 16, md: 32 },
            left: { xs: 16, md: 32 },
          }}
        >
          <Typography
            sx={{
              fontSize: "12px",
              color: "#98A2B3",
            }}
          >
            © fast friends 2026
          </Typography>
        </Box>
      </Box>

      {/* Right Side - Image */}
      {!isMobile && (
        <Box
          sx={{
            flex: "0 0 50%",
            position: "relative",
            bgcolor: "#F2F4F7",
            display: { xs: "none", md: "block" },
            height: "100vh",
            overflow: "hidden",
          }}
        >
          <Box
            component="img"
            src={LoginImg}
            alt="Decorative Abstract 3D Art"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default Login;
