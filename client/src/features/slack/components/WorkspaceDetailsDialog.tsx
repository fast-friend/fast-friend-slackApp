import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Avatar,
  CircularProgress,
  Alert,
  TextField,
  Box,
  IconButton,
  Chip,
} from "@mui/material";
import { Send as SendIcon, Close as CloseIcon } from "@mui/icons-material";
import {
  useLazyGetWorkspaceUsersQuery,
  useSendMessageMutation,
} from "@/features/slack";
import type { ISlackWorkspace } from "@/features/slack";

interface WorkspaceDetailsDialogProps {
  workspace: ISlackWorkspace | null;
  open: boolean;
  onClose: () => void;
}

const WorkspaceDetailsDialog = ({
  workspace,
  open,
  onClose,
}: WorkspaceDetailsDialogProps) => {
  const [getUsers, { data: usersData, isLoading, error }] =
    useLazyGetWorkspaceUsersQuery();
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sendSuccess, setSendSuccess] = useState(false);

  // Load users when dialog opens
  useEffect(() => {
    if (open && workspace) {
      getUsers(workspace._id);
    }
  }, [open, workspace, getUsers]);

  const handleSendMessage = async () => {
    if (!workspace || !selectedUserId || !message.trim()) return;

    try {
      await sendMessage({
        workspaceId: workspace._id,
        data: {
          userId: selectedUserId,
          text: message,
        },
      }).unwrap();

      setSendSuccess(true);
      setMessage("");
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const users = usersData?.data?.users || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      disableEnforceFocus
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            {workspace?.teamName}
            <Chip
              label={`${users.length} members`}
              size="small"
              sx={{ ml: 2 }}
            />
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading && (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error">Failed to load workspace members</Alert>
        )}

        {sendSuccess && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Message sent successfully!
          </Alert>
        )}

        {!isLoading && !error && users.length > 0 && (
          <>
            <List sx={{ maxHeight: 400, overflow: "auto" }}>
              {users.map((user) => (
                <ListItem
                  key={user.id}
                  disablePadding
                  sx={{
                    border: "1px solid",
                    borderColor:
                      selectedUserId === user.id ? "primary.main" : "divider",
                    borderRadius: 1,
                    mb: 1,
                  }}
                >
                  <ListItemButton
                    selected={selectedUserId === user.id}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={user.profile.image_72}
                        alt={user.real_name}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={user.real_name || user.name}
                      secondary={user.profile.email || `@${user.name}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>

            {selectedUserId && (
              <Box mt={3}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Message"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={isSending}
                />
                <Button
                  variant="contained"
                  startIcon={
                    isSending ? <CircularProgress size={20} /> : <SendIcon />
                  }
                  onClick={handleSendMessage}
                  disabled={isSending || !message.trim()}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  {isSending ? "Sending..." : "Send Message"}
                </Button>
              </Box>
            )}
          </>
        )}

        {!isLoading && !error && users.length === 0 && (
          <Alert severity="info">No members found in this workspace</Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkspaceDetailsDialog;
