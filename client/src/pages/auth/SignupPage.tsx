import { useState } from "react";
import {
  Box,
  Typography,
  Alert,
  Stack,
  Link,
  useMediaQuery,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  TextField,
} from "@mui/material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  useSendOtpMutation,
  useVerifyOtpMutation,
} from "@/features/auth/api/authApi";
import { useAppDispatch } from "@/app/hooks";
import { setUser } from "@/features/auth/authSlice";

// Custom Components
import FFButton from "@/components/ui/FFButton";
import FFInputField from "@/components/ui/FFInputField";

// Assets
import logoImg from "../../assets/Images/Logo.webp";
import SignUpImg from "../../assets/Images/SignUpImg.webp";
import backgroundGrids from "../../assets/Images/Background-pattern-decorative.webp";

const SignupPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [otpModalOpen, setOtpModalOpen] = useState(false);

  const [sendOtp, { isLoading: isSendingOtp }] = useSendOtpMutation();
  const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!email || !password || !confirmPassword || !organizationName) {
      setError("All fields are required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      // Send OTP (doesn't create user yet)
      await sendOtp({
        email,
        password,
        organizationName,
      }).unwrap();

      // Open OTP modal
      setOtpModalOpen(true);
    } catch (err: any) {
      setError(err?.data?.message || "Failed to send OTP. Please try again.");
    }
  };

  const handleVerifyOtp = async () => {
    setError("");

    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    if (otp.length !== 6) {
      setError("OTP must be 6 digits");
      return;
    }

    try {
      const result = await verifyOtp({ email, otp }).unwrap();

      // Set user in Redux store
      if (result.data?.user) {
        dispatch(setUser(result.data.user));
      }

      // Close modal and navigate to onboarding
      setOtpModalOpen(false);
      navigate("/onboarding");
    } catch (err: any) {
      setError(err?.data?.message || "Invalid OTP. Please try again.");
    }
  };

  const handleResendOtp = async () => {
    setError("");
    setOtp("");
    try {
      await sendOtp({
        email,
        password,
        organizationName,
      }).unwrap();
    } catch (err: any) {
      setError(err?.data?.message || "Failed to resend OTP");
    }
  };

  const handleCloseModal = () => {
    if (!isVerifyingOtp) {
      setOtpModalOpen(false);
      setOtp("");
      setError("");
    }
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
            Create Account
          </Typography>
          <Typography
            sx={{
              fontSize: "16px",
              color: "#667085",
              mb: 4,
              textAlign: "center",
            }}
          >
            Sign up to get started with Fast Friends
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
              {error}
            </Alert>
          )}

          {/* Form */}
          <Box component="form" onSubmit={handleSignup} sx={{ width: "100%" }}>
            <Stack spacing={2.5}>
              <FFInputField
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ maxWidth: "100%" }}
              />

              <FFInputField
                label="Organization Name"
                type="text"
                placeholder="e.g., Acme Corp"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                style={{ maxWidth: "100%" }}
              />

              <FFInputField
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={{ maxWidth: "100%" }}
              />

              <FFInputField
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                style={{ maxWidth: "100%" }}
              />

              {/* Actions */}
              <FFButton
                type="submit"
                variant="primary"
                fullWidth
                loading={isSendingOtp}
              >
                Sign Up
              </FFButton>
            </Stack>
          </Box>

          {/* Footer - Login */}
          <Typography
            sx={{
              fontSize: "14px",
              color: "#667085",
              mt: 4,
              textAlign: "center",
            }}
          >
            Already have an account?{" "}
            <Link
              component={RouterLink}
              to="/login"
              sx={{
                fontWeight: 600,
                color: "#6941C6",
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Log in
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
            src={SignUpImg}
            alt="Decorative Abstract 3D Art"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </Box>
      )}

      {/* OTP Verification Modal */}
      <Dialog
        open={otpModalOpen}
        onClose={handleCloseModal}
        maxWidth="xs"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Verify Your Email
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            We've sent a verification code to <strong>{email}</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            For development, use: <strong>111111</strong>
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            id="otp"
            label="Enter OTP"
            name="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            inputProps={{
              maxLength: 6,
              pattern: "[0-9]*",
            }}
            placeholder="000000"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseModal} disabled={isVerifyingOtp}>
            Cancel
          </Button>
          <Button
            onClick={handleResendOtp}
            disabled={isSendingOtp || isVerifyingOtp}
          >
            {isSendingOtp ? "Sending..." : "Resend"}
          </Button>
          <Button
            onClick={handleVerifyOtp}
            variant="contained"
            disabled={isVerifyingOtp}
          >
            {isVerifyingOtp ? <CircularProgress size={24} /> : "Verify"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SignupPage;
