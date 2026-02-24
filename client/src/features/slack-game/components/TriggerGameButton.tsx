import { useState } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from "@mui/material";
import { PlayArrow } from "@mui/icons-material";
import { useTriggerGameMutation } from "../api/slackGameApi";
import { useGetWorkspacesQuery } from "@/features/slack/api/slackApi";
import { useSnackbar } from "notistack";

export const TriggerGameButton = () => {
  const [open, setOpen] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  const { data: workspacesResponse, isLoading: loadingWorkspaces } =
    useGetWorkspacesQuery();
  const [triggerGame, { isLoading }] = useTriggerGameMutation();
  const { enqueueSnackbar } = useSnackbar();

  const workspaces = workspacesResponse?.data?.workspaces || [];

  const handleOpen = () => {
    setOpen(true);
    // Auto-select first workspace if available
    if (workspaces.length > 0 && !selectedWorkspaceId) {
      setSelectedWorkspaceId(workspaces[0]._id);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleTrigger = async () => {
    if (!selectedWorkspaceId) {
      enqueueSnackbar("Please select a workspace", { variant: "warning" });
      return;
    }

    try {
      const result = await triggerGame({
        workspaceId: selectedWorkspaceId,
      }).unwrap();
      enqueueSnackbar(
        result.message ||
          `Game triggered! ${result.messagesSent || 0} messages sent.`,
        { variant: "success" },
      );
      handleClose();
    } catch (error: any) {
      enqueueSnackbar(error?.data?.message || "Failed to trigger game", {
        variant: "error",
      });
    }
  };

  const hasWorkspaces = workspaces.length > 0;

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        startIcon={<PlayArrow />}
        onClick={handleOpen}
        size="large"
        disabled={loadingWorkspaces || !hasWorkspaces}
        sx={{
          boxShadow: "0px 4px 16px rgba(229, 123, 44, 0.3)",
          fontWeight: 600,
        }}
      >
        Trigger Game Now
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            Trigger Game Manually
          </Typography>
        </DialogTitle>
        <DialogContent>
          {!hasWorkspaces ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No workspaces connected. Please connect a Slack workspace first.
            </Alert>
          ) : (
            <>
              <Alert
                severity="info"
                sx={{
                  mb: 3,
                  borderLeft: "4px solid",
                  borderColor: "info.main",
                }}
              >
                This will send game messages to all users in the selected
                workspace.
              </Alert>

              <Box mb={3}>
                <FormControl fullWidth>
                  <InputLabel>Select Workspace</InputLabel>
                  <Select
                    value={selectedWorkspaceId}
                    label="Select Workspace"
                    onChange={(e) => setSelectedWorkspaceId(e.target.value)}
                  >
                    {workspaces.map((workspace) => (
                      <MenuItem key={workspace._id} value={workspace._id}>
                        {workspace.teamName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Typography variant="body1" color="text.secondary">
                Are you sure you want to trigger the game now? This will send
                messages to all users who haven't received a game today.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button onClick={handleClose} disabled={isLoading} variant="outlined">
            Cancel
          </Button>
          {hasWorkspaces && (
            <Button
              onClick={handleTrigger}
              variant="contained"
              color="primary"
              disabled={isLoading || !selectedWorkspaceId}
              startIcon={
                isLoading ? (
                  <CircularProgress size={20} sx={{ color: "white" }} />
                ) : (
                  <PlayArrow />
                )
              }
              sx={{
                boxShadow: "0px 4px 12px rgba(229, 123, 44, 0.3)",
              }}
            >
              {isLoading ? "Triggering..." : "Trigger Game"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};
