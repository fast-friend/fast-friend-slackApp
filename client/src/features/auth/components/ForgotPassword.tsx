import { useState } from "react";
import { Box, Typography, Link, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { ArrowBack, KeyOutlined, MailOutlined } from "@mui/icons-material";

// Custom Components
import FFButton from "@/components/ui/FFButton";
import FFInputField from "@/components/ui/FFInputField";

// Assets
import backgroundGrids from "../../../assets/Images/Background-pattern-decorative.webp";

const ForgotPassword = () => {
    const [email, setEmail] = useState("");
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Simulate API call
        setIsSubmitted(true);
    };

    const handleResend = () => {
        console.log("Resend email clicked");
    };

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
                    {isSubmitted ? (
                        <MailOutlined sx={{ fontSize: 28, color: "#475467" }} />
                    ) : (
                        <KeyOutlined sx={{ fontSize: 28, color: "#475467" }} />
                    )}
                </Box>

                {/* Content */}
                {!isSubmitted ? (
                    // ─── Input View ────────────────────────────────────────────────
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
                            Forgot password?
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: "16px",
                                color: "#667085",
                                mb: 4,
                                lineHeight: "24px",
                            }}
                        >
                            No worries, we'll send you reset instructions.
                        </Typography>

                        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
                            <Stack spacing={3}>
                                <FFInputField
                                    label="Email"
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />

                                <FFButton type="submit" variant="primary" fullWidth>
                                    Reset password
                                </FFButton>
                            </Stack>
                        </Box>
                    </>
                ) : (
                    // ─── Success View (Check Email) ────────────────────────────────
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
                            Check your email
                        </Typography>
                        <Typography
                            sx={{
                                fontSize: "16px",
                                color: "#667085",
                                mb: 4,
                                lineHeight: "24px",
                            }}
                        >
                            We sent a password reset link to
                            <br />
                            <Typography
                                component="span"
                                sx={{
                                    fontWeight: 500,
                                    color: "#101828",
                                }}
                            >
                                {email}
                            </Typography>
                        </Typography>

                        <Stack spacing={3} sx={{ width: "100%" }}>
                            <FFButton
                                type="button"
                                variant="primary"
                                fullWidth
                                onClick={() => window.open("mailto:")}
                            >
                                Open email app
                            </FFButton>

                            <Typography
                                sx={{
                                    fontSize: "14px",
                                    color: "#667085",
                                }}
                            >
                                Didn't receive the email?{" "}
                                <Link
                                    component="button"
                                    onClick={handleResend}
                                    sx={{
                                        fontWeight: 600,
                                        color: "#6941C6", // Using the purple from the design
                                        textDecoration: "none",
                                        "&:hover": {
                                            textDecoration: "underline",
                                        },
                                    }}
                                >
                                    Click to resend
                                </Link>
                            </Typography>
                        </Stack>
                    </>
                )}

                {/* Back to Login */}
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
            </Box>
        </Box>
    );
};

export default ForgotPassword;
