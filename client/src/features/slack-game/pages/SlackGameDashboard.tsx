import { useState } from "react";
import { Container, Box, Typography, Button, Snackbar, Alert } from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { StatisticsCards } from "../components/StatisticsCards";
import { Leaderboard } from "../components/Leaderboard";
import { TeamPerformance } from "../components/TeamPerformance";
import { useSendOnboardingLinksMutation } from "../api/slackGameApi";
import { useWorkspace } from "@/contexts/OrganizationContext";

export const SlackGameDashboard = () => {
  const { currentWorkspace } = useWorkspace();
  const [sendOnboardingLinks, { isLoading: isSending }] = useSendOnboardingLinksMutation();

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleSendOnboarding = async () => {
    if (!currentWorkspace?._id) return;
    try {
      const result = await sendOnboardingLinks(currentWorkspace._id).unwrap();
      setSnack({ open: true, message: result.message, severity: "success" });
    } catch (err: any) {
      setSnack({
        open: true,
        message: err?.data?.message || "Failed to send onboarding links.",
        severity: "error",
      });
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, bgcolor: "#FFFFFF" }}>
      {/* Header */}
      <Box mb={4} display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Typography
            variant="h4"
            sx={{ fontSize: "30px", fontWeight: 600, color: "#101828", mb: 1 }}
          >
            Admin Dashboard
          </Typography>
          <Typography variant="body1" sx={{ fontSize: "14px", color: "#667085" }}>
            Here is your current balance and active investment plans.
          </Typography>
        </Box>

        {/* Send Onboarding Links */}
        <Button
          variant="contained"
          startIcon={<SendIcon />}
          disabled={isSending}
          onClick={handleSendOnboarding}
          sx={{
            bgcolor: "#E57B2C",
            borderRadius: "10px",
            fontWeight: 600,
            px: 2.5,
            py: 1.25,
            boxShadow: "0 2px 8px rgba(229,123,44,0.3)",
            "&:hover": { bgcolor: "#C96A21" },
            whiteSpace: "nowrap",
          }}
        >
          {isSending ? "Sending…" : "Send Onboarding Links"}
        </Button>
      </Box>

      {/* Statistics Cards */}
      <Box mb={4}>
        <StatisticsCards />
      </Box>

      {/* Leaderboard */}
      <Box mb={4}>
        <Leaderboard />
      </Box>

      {/* Team Performance */}
      <Box mb={4}>
        <TeamPerformance />
      </Box>

      {/* Snackbar feedback */}
      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snack.severity}
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          sx={{ borderRadius: "10px" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};
