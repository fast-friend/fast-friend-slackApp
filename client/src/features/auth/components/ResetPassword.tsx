import { useState, useEffect } from "react";
import { Box, Typography, Link, Stack, CircularProgress } from "@mui/material";
import { Link as RouterLink, useSearchParams, useNavigate } from "react-router-dom";
import {
    ArrowBack,
    LockOutlined,
    CheckCircleOutline,
    CheckCircle,
    RadioButtonUnchecked,
} from "@mui/icons-material";

// Custom Components
import FFButton from "@/components/ui/FFButton";
import FFInputField from "@/components/ui/FFInputField";

// Assets
import backgroundGrids from "../../../assets/Images/Background-pattern-decorative.webp";

// API
import { useResetPasswordMutation } from "../api/authApi";

const ResetPassword = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [tokenError, setTokenError] = useState("");

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");

    const [resetPassword, { isLoading }] = useResetPasswordMutation();

    // Guard: if there's no token in the URL, redirect to forgot-password
    useEffect(() => {
        if (!token) {
            setTokenError("Invalid or missing reset link. Please request a new one.");
        }
    }, [token]);

    // Validation States
    const hasMinLength = password.length >= 8;
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage("");

        if (!token) {
            setErrorMessage("Invalid reset link. Please request a new password reset.");
            return;
        }

        if (!passwordsMatch) {
            setErrorMessage("Passwords do not match.");
            return;
        }

        try {
            await resetPassword({ token, newPassword: password }).unwrap();
            setIsSuccess(true);
        } catch (err: unknown) {
            const error = err as { data?: { message?: string } };
            setErrorMessage(error?.data?.message || "Something went wrong. Please try again.");
        }
    };

    const ValidationItem = ({
        isValid,
        text,
    }: {
        isValid: boolean;
        text: string;
    }) => (
        <Stack direction="row" spacing={1} alignItems="center">
            {isValid ? (
                <CheckCircle sx={{ fontSize: 16, color: "#12B76A" }} />
            ) : (
                <RadioButtonUnchecked sx={{ fontSize: 16, color: "#98A2B3" }} />
            )}
            <Typography
                sx={{
                    fontSize: "14px",
                    color: isValid ? "#344054" : "#667085",
                }}
            >
                {text}
            </Typography>
        </Stack>
    );

    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#FFFFFF",
                position: "relative",
                overflow: "hidden",
            }}
        >
            {/* Background Grids */}
            <Box
                component="img"
                src={backgroundGrids}
                alt=""
                sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.6,
                    zIndex: 0,
                    pointerEvents: "none",
                }}
            />

            {/* Main Card */}
            <Box
                sx={{
                    position: "relative",
                    zIndex: 1,
                    width: "100%",
                    maxWidth: "400px",
                    mx: 2,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                }}
            >
                {/* Icon Container */}
                <Box
                    sx={{
                        width: 56,
                        height: 56,
                        borderRadius: "12px",
                        bgcolor: "#FFFFFF",
                        border: "1px solid #EAECF0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 3,
                        boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
                    }}
                >
                    {isSuccess ? (
                        <CheckCircleOutline sx={{ fontSize: 28, color: "#12B76A" }} />
                    ) : (
                        <LockOutlined sx={{ fontSize: 28, color: "#475467" }} />
                    )}
                </Box>

                {/* Invalid token state */}
                {tokenError ? (
                    <>
                        <Typography
                            variant="h3"
                            sx={{ fontSize: "30px", fontWeight: 600, color: "#101828", mb: 1.5 }}
                        >
                            Invalid link
                        </Typography>
                        <Typography sx={{ fontSize: "16px", color: "#667085", mb: 4, lineHeight: "24px" }}>
                            {tokenError}
                        </Typography>
                        <FFButton
                            type="button"
                            variant="primary"
                            fullWidth
                            onClick={() => navigate("/forgot-password")}
                        >
                            Request new reset link
                        </FFButton>
                    </>
                ) : !isSuccess ? (
                    // ─── Set New Password View ──────────────────────────────────────
                    <>
                        <Typography
                            variant="h3"
                            sx={{
                                fontSize: "30px",
                                fontWeight: 600,
                                color: "#101828",
                                mb: 1.5,
                            }}
                        >
                            Set new password
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: "16px",
                                color: "#667085",
                                mb: 4,
                                lineHeight: "24px",
                            }}
                        >
                            Your new password must be different to previously used passwords.
                        </Typography>

                        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
                            <Stack spacing={2.5}>
                                <FFInputField
                                    label="Password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />

                                <FFInputField
                                    label="Confirm password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />

                                {/* Validation Checklist */}
                                <Stack spacing={1} alignItems="flex-start" sx={{ mt: 1 }}>
                                    <ValidationItem
                                        isValid={hasMinLength}
                                        text="Must be at least 8 characters"
                                    />
                                    <ValidationItem
                                        isValid={hasSpecialChar}
                                        text="Must contain one special character"
                                    />
                                    <ValidationItem
                                        isValid={passwordsMatch}
                                        text="Passwords must match"
                                    />
                                </Stack>

                                {errorMessage && (
                                    <Typography sx={{ fontSize: "14px", color: "#F04438", textAlign: "center" }}>
                                        {errorMessage}
                                    </Typography>
                                )}

                                <FFButton
                                    type="submit"
                                    variant="primary"
                                    fullWidth
                                    disabled={isLoading || !hasMinLength || !hasSpecialChar || !passwordsMatch}
                                >
                                    {isLoading ? <CircularProgress size={20} color="inherit" /> : "Reset password"}
                                </FFButton>
                            </Stack>
                        </Box>
                    </>
                ) : (
                    // ─── Success View ───────────────────────────────────────────────
                    <>
                        <Typography
                            variant="h3"
                            sx={{
                                fontSize: "30px",
                                fontWeight: 600,
                                color: "#101828",
                                mb: 1.5,
                            }}
                        >
                            Password reset
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: "16px",
                                color: "#667085",
                                mb: 4,
                                lineHeight: "24px",
                            }}
                        >
                            Your password has been successfully reset.
                            <br />
                            Click below to log in.
                        </Typography>

                        <FFButton
                            type="button"
                            variant="primary"
                            fullWidth
                            onClick={() => navigate("/login")}
                        >
                            Continue to login
                        </FFButton>
                    </>
                )}

                {/* Back to Login */}
                {!isSuccess && (
                    <Link
                        component={RouterLink}
                        to="/login"
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mt: 4,
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#475467",
                            textDecoration: "none",
                            "&:hover": {
                                color: "#344054",
                            },
                        }}
                    >
                        <ArrowBack sx={{ fontSize: 20 }} />
                        Back to log in
                    </Link>
                )}
            </Box>
        </Box>
    );
};

export default ResetPassword;
