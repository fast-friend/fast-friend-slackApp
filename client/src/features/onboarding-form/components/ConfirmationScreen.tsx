import React from "react";
import { Box, Typography, Paper } from "@mui/material";
import { CheckCircle as CheckCircleIcon } from "@mui/icons-material";

interface ConfirmationScreenProps {
    name: string;
}

export const ConfirmationScreen: React.FC<ConfirmationScreenProps> = ({ name }) => {
    return (
        <Box
            minHeight="100vh"
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgcolor="#F9FAFB"
            px={2}
        >
            <Paper
                elevation={0}
                sx={{
                    p: { xs: 4, sm: 6 },
                    borderRadius: "20px",
                    border: "1px solid #EAECF0",
                    maxWidth: 480,
                    width: "100%",
                    textAlign: "center",
                    bgcolor: "#FFFFFF",
                }}
            >
                {/* Success icon */}
                <Box
                    sx={{
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        bgcolor: "#ECFDF3",
                        border: "8px solid #D1FADF",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mx: "auto",
                        mb: 3,
                    }}
                >
                    <CheckCircleIcon sx={{ fontSize: 40, color: "#12B76A" }} />
                </Box>

                <Typography
                    variant="h5"
                    fontWeight={700}
                    color="#101828"
                    mb={1}
                >
                    You're all set, {name}! 🎉
                </Typography>

                <Typography variant="body2" color="#667085" mb={3} lineHeight={1.7}>
                    Your profile has been submitted. Your teammates will now be able to recognise you
                    better in the Fast Friends game!
                </Typography>

                <Box
                    sx={{
                        bgcolor: "#FFF6EE",
                        border: "1px solid #FDDCAB",
                        borderRadius: "12px",
                        p: 2.5,
                        mb: 3,
                    }}
                >
                    <Typography variant="body2" color="#7A3B07" fontWeight={500}>
                        🎮 Keep an eye on Slack — the game will send you photo questions about your
                        teammates. See how many you can get right!
                    </Typography>
                </Box>

                <Typography variant="caption" color="#98A2B3">
                    You can close this window now.
                </Typography>
            </Paper>
        </Box>
    );
};
