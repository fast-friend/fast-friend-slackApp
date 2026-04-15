import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import { Search as SearchIcon, Send as SendIcon } from "@mui/icons-material";
import { useGetWorkspaceUsersQuery } from "@/features/slack/api/slackApi";
import { useSendOnboardingLinksMutation } from "../api/slackGameApi";
import FFButton from "@/components/ui/FFButton";
import type { ISlackUser } from "@/features/slack/types/slack.types";

interface SendOnboardingDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId?: string;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const getUserLabel = (user: ISlackUser) =>
  user.real_name?.trim() || user.name?.trim() || "Unnamed member";

const matchesSearch = (user: ISlackUser, query: string) => {
  if (!query.trim()) return true;

  const needle = query.trim().toLowerCase();
  const haystack = [
    user.real_name,
    user.name,
    user.profile?.display_name,
    user.profile?.real_name,
    user.profile?.email,
    user.role,
    user.department,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(needle);
};

export const SendOnboardingDialog = ({
  open,
  onClose,
  workspaceId,
  onSuccess,
  onError,
}: SendOnboardingDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const { data: usersResponse, isLoading: isLoadingUsers } =
    useGetWorkspaceUsersQuery(workspaceId || "", {
      skip: !open || !workspaceId,
    });

  const [sendOnboardingLinks, { isLoading: isSending }] =
    useSendOnboardingLinksMutation();

  const users = usersResponse?.data?.users || [];

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedUserIds([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const userIdSet = new Set(users.map((user) => user.id));
    setSelectedUserIds((prev) =>
      prev.filter((id) => userIdSet.has(id)),
    );
  }, [open, users]);

  const filteredUsers = useMemo(
    () => users.filter((user) => matchesSearch(user, searchQuery)),
    [users, searchQuery],
  );

  const selectableVisibleUsers = useMemo(
    () => filteredUsers.filter((user) => !user.onboardingCompleted),
    [filteredUsers],
  );

  const selectedVisibleCount = useMemo(
    () =>
      selectableVisibleUsers.filter((user) => selectedUserIds.includes(user.id))
        .length,
    [selectableVisibleUsers, selectedUserIds],
  );

  const allVisibleSelected =
    selectableVisibleUsers.length > 0 &&
    selectedVisibleCount === selectableVisibleUsers.length;

  const someVisibleSelected =
    selectedVisibleCount > 0 && selectedVisibleCount < selectableVisibleUsers.length;

  const selectedCount = selectedUserIds.length;
  const pendingCount = users.filter((user) => !user.onboardingCompleted).length;

  const toggleUser = (user: ISlackUser) => {
    if (user.onboardingCompleted) return;

    setSelectedUserIds((prev) =>
      prev.includes(user.id)
        ? prev.filter((id) => id !== user.id)
        : [...prev, user.id],
    );
  };

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      const visibleIds = new Set(selectableVisibleUsers.map((user) => user.id));
      setSelectedUserIds((prev) => prev.filter((id) => !visibleIds.has(id)));
      return;
    }

    setSelectedUserIds((prev) => {
      const next = [...prev];
      for (const user of selectableVisibleUsers) {
        if (!next.includes(user.id)) next.push(user.id);
      }
      return next;
    });
  };

  const handleSend = async () => {
    if (!workspaceId) {
      onError("Workspace is not available right now.");
      return;
    }

    const targetUserIds = selectedUserIds.filter((id) =>
      users.some((user) => user.id === id && !user.onboardingCompleted),
    );

    if (targetUserIds.length === 0) {
      onError("Select at least one team member.");
      return;
    }

    try {
      const result = await sendOnboardingLinks({
        workspaceId,
        userIds: targetUserIds,
      }).unwrap();

      onSuccess(result.message);
      onClose();
    } catch (err: any) {
      onError(err?.data?.message || "Failed to send onboarding links.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: "18px",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle sx={{ pb: 1.5 }}>
        <Stack spacing={0.75}>
          <Typography
            sx={{ fontSize: "22px", fontWeight: 700, color: "#101828" }}
          >
            Send onboarding links
          </Typography>
          <Typography sx={{ fontSize: "14px", color: "#667085" }}>
            Search your workspace members, pick who should receive the link, or
            select everyone still pending onboarding.
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ bgcolor: "#FCFCFD", pt: 2, pb: 0, px: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={2}>
          <TextField
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search team members"
            fullWidth
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#98A2B3", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                backgroundColor: "#FFFFFF",
              },
            }}
          />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onChange={handleToggleSelectAll}
                  disabled={selectableVisibleUsers.length === 0}
                  sx={{
                    color: "#E57B2C",
                    "&.Mui-checked": { color: "#E57B2C" },
                  }}
                />
              }
              label="Select all visible"
            />
            <Chip
              label={`${selectedCount} selected`}
              sx={{
                bgcolor: "#FFF4E8",
                color: "#B45309",
                fontWeight: 600,
              }}
            />
          </Box>

          <Divider />

          <Box
            sx={{
              minHeight: 320,
              maxHeight: 420,
              overflowY: "auto",
              pr: 0.5,
            }}
          >
            {isLoadingUsers ? (
              <Box
                sx={{
                  minHeight: 320,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CircularProgress sx={{ color: "#E57B2C" }} />
              </Box>
            ) : filteredUsers.length === 0 ? (
              <Box
                sx={{
                  minHeight: 320,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  px: 2,
                }}
              >
                <Stack spacing={1}>
                  <Typography sx={{ fontSize: "16px", fontWeight: 600 }}>
                    No members found
                  </Typography>
                  <Typography sx={{ fontSize: "14px", color: "#667085" }}>
                    Try another search term or clear the filter.
                  </Typography>
                </Stack>
              </Box>
            ) : (
              <List disablePadding>
                {filteredUsers.map((user, index) => {
                  const selected = selectedUserIds.includes(user.id);
                  const disabled = user.onboardingCompleted;

                  return (
                    <Box key={user.id}>
                      {index > 0 && <Divider component="li" />}
                      <ListItemButton
                        onClick={() => toggleUser(user)}
                        disabled={disabled}
                        sx={{
                          py: 1.5,
                          px: 1.25,
                          borderRadius: "12px",
                          mb: 0.5,
                          alignItems: "flex-start",
                          opacity: disabled ? 0.7 : 1,
                          "&:hover": {
                            backgroundColor: disabled ? "transparent" : "#FFF7F1",
                          },
                        }}
                      >
                        <Checkbox
                          checked={selected}
                          disabled={disabled}
                          sx={{
                            color: "#E57B2C",
                            "&.Mui-checked": { color: "#E57B2C" },
                            mt: 0.25,
                            mr: 0.5,
                          }}
                        />
                        <ListItemAvatar sx={{ minWidth: 48, mt: 0.1 }}>
                          <Avatar
                            src={user.photoUrl || user.profile?.image_72}
                            alt={getUserLabel(user)}
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: "#E57B2C",
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            {getUserLabel(user).charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack
                              direction="row"
                              alignItems="center"
                              spacing={1}
                              flexWrap="wrap"
                            >
                              <Typography
                                sx={{ fontSize: "15px", fontWeight: 600, color: "#101828" }}
                              >
                                {getUserLabel(user)}
                              </Typography>
                              <Chip
                                size="small"
                                label={user.onboardingCompleted ? "Completed" : "Pending"}
                                sx={{
                                  height: 22,
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  bgcolor: user.onboardingCompleted
                                    ? "#ECFDF3"
                                    : "#FFF4E8",
                                  color: user.onboardingCompleted
                                    ? "#027A48"
                                    : "#B45309",
                                }}
                              />
                            </Stack>
                          }
                          secondary={
                            <Stack spacing={0.5} sx={{ mt: 0.4 }}>
                              {user.profile?.email && (
                                <Typography
                                  sx={{ fontSize: "13px", color: "#667085" }}
                                >
                                  {user.profile.email}
                                </Typography>
                              )}
                              {(user.role || user.department) && (
                                <Typography
                                  sx={{ fontSize: "13px", color: "#98A2B3" }}
                                >
                                  {[user.role, user.department]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </Typography>
                              )}
                            </Stack>
                          }
                          sx={{ m: 0 }}
                        />
                      </ListItemButton>
                    </Box>
                  );
                })}
              </List>
            )}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2,
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography sx={{ fontSize: "13px", color: "#667085" }}>
          {pendingCount} member{pendingCount === 1 ? "" : "s"} still need onboarding
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <FFButton variant="secondary" onClick={onClose} disabled={isSending}>
            Cancel
          </FFButton>
          <FFButton
            variant="primary"
            onClick={handleSend}
            loading={isSending}
            disabled={selectedCount === 0 || isLoadingUsers}
            iconLeft={<SendIcon fontSize="small" />}
          >
            Send Link{selectedCount === 1 ? "" : "s"}
          </FFButton>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default SendOnboardingDialog;
