import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Autocomplete,
  Avatar,
  Chip,
  Typography,
  CircularProgress,
} from "@mui/material";
import {
  useGetGroupWorkspaceUsersQuery,
  useUpdateGroupMutation,
} from "../api/groupsApi";
import type { SlackUser, Group } from "../types/groups.types";

interface EditGroupDialogProps {
  open: boolean;
  onClose: () => void;
  group: Group;
  workspaceId: string;
}

export const EditGroupDialog = ({
  open,
  onClose,
  group,
  workspaceId,
}: EditGroupDialogProps) => {
  const [groupName, setGroupName] = useState(group.groupName);
  const [description, setDescription] = useState(group.description || "");
  const [selectedUsers, setSelectedUsers] = useState<SlackUser[]>([]);

  const { data: users = [], isLoading: loadingUsers } =
    useGetGroupWorkspaceUsersQuery(workspaceId, {
      skip: !open || !workspaceId,
    });
  const [updateGroup, { isLoading: updating }] = useUpdateGroupMutation();

  // Ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];

  // Initialize selected users when users data is loaded
  useEffect(() => {
    if (safeUsers.length > 0 && group.members.length > 0) {
      const preselected = safeUsers.filter((user) =>
        group.members.includes(user.id),
      );
      setSelectedUsers(preselected);
    }
  }, [safeUsers, group.members]);

  const handleSubmit = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      return;
    }

    try {
      await updateGroup({
        workspaceId,
        groupId: group._id,
        data: {
          groupName: groupName.trim(),
          description: description.trim() || undefined,
          members: selectedUsers.map((user) => user.id),
        },
      }).unwrap();

      onClose();
    } catch (error) {
      console.error("Failed to update group:", error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEnforceFocus
    >
      <DialogTitle>Edit Group</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          {/* Group Name */}
          <TextField
            label="Group Name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            fullWidth
            required
            autoFocus
          />

          {/* Description */}
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={2}
            placeholder="Optional description for this group"
          />

          {/* User Selection */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Select Members *
            </Typography>
            {loadingUsers ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress size={32} />
              </Box>
            ) : (
              <Autocomplete
                multiple
                options={safeUsers}
                value={selectedUsers}
                onChange={(_event, newValue) => setSelectedUsers(newValue)}
                getOptionLabel={(option) => option.real_name || option.name}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={
                      selectedUsers.length === 0 ? "Search users..." : ""
                    }
                  />
                )}
                renderOption={(props, option) => (
                  <Box
                    component="li"
                    {...props}
                    display="flex"
                    alignItems="center"
                    gap={1.5}
                  >
                    <Avatar
                      src={option.profile.image_72}
                      sx={{ width: 32, height: 32 }}
                      alt={option.real_name}
                    >
                      {option.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2">
                        {option.real_name || option.name}
                      </Typography>
                      {option.profile.email && (
                        <Typography variant="caption" color="text.secondary">
                          {option.profile.email}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.id}
                      avatar={<Avatar src={option.profile.image_72} />}
                      label={option.real_name || option.name}
                      size="small"
                    />
                  ))
                }
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            )}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block" }}
            >
              {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""}{" "}
              selected
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={updating}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!groupName.trim() || selectedUsers.length === 0 || updating}
        >
          {updating ? "Saving..." : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
