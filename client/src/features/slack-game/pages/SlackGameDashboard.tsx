import { useEffect, useState } from "react";
import {
  Container,
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import { Send as SendIcon } from "@mui/icons-material";
import { useLocation } from "react-router-dom";
import { StatisticsCards } from "../components/StatisticsCards";
import { Leaderboard } from "../components/Leaderboard";
import { TeamPerformance } from "../components/TeamPerformance";
import { useWorkspace } from "@/contexts/OrganizationContext";
import SendOnboardingDialog from "../components/SendOnboardingDialog";

export const SlackGameDashboard = () => {
  const location = useLocation();
  const { currentWorkspace } = useWorkspace();
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  const [snack, setSnack] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (!location.hash) return;

    const targetId = location.hash.replace("#", "");
    const raf = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    return () => window.cancelAnimationFrame(raf);
  }, [location.hash]);

  const handleSendSuccess = (message: string) => {
    setSnack({ open: true, message, severity: "success" });
  };

  const handleSendError = (message: string) => {
    setSnack({ open: true, message, severity: "error" });
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4, bgcolor: "#FFFFFF" }}>
      {/* Header */}
      <Box
        mb={4}
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontSize: "30px", fontWeight: 600, color: "#101828", mb: 1 }}
          >
            Admin Dashboard
          </Typography>
          <Typography
            variant="body1"
            sx={{ fontSize: "14px", color: "#667085" }}
          >
            Here is your current balance and active investment plans.
          </Typography>
        </Box>

        {/* Send Onboarding Links */}
        <Button
          id="walkthrough-send-onboarding"
          variant="contained"
          startIcon={<SendIcon />}
          disabled={!currentWorkspace?._id}
          onClick={() => setSendDialogOpen(true)}
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
          Send Onboarding Links
        </Button>
      </Box>

      <SendOnboardingDialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        workspaceId={currentWorkspace?._id}
        onSuccess={handleSendSuccess}
        onError={handleSendError}
      />

      {/* Statistics Cards */}
      <Box id="walkthrough-dashboard-metrics" mb={4}>
        <StatisticsCards />
      </Box>

      {/* Leaderboard */}
      <Box mb={4}>
        <Leaderboard />
      </Box>

      {/* Team Performance */}
      <Box id="deck-performance" mb={4}>
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
