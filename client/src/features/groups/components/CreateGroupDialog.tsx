import { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Chip,
  Avatar,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
} from "@mui/material";
import { Search, FilterList } from "@mui/icons-material";
import {
  useCreateGroupMutation,
  useGetGroupWorkspaceUsersQuery,
} from "../api/groupsApi";
import {
  useGetWorkspaceChannelsQuery,
  useGetChannelMembersMutation,
} from "@/features/slack/api/slackApi";
import { FFButton } from "@/components/ui/FFButton";
import { FFInputField } from "@/components/ui/FFInputField";
import { FFTable } from "@/components/ui/FFTable";
import type { TableColumn } from "@/components/ui/FFTable";
import type { ISlackUser } from "@/features/slack/types/slack.types";

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

export const CreateGroupDialog = ({
  open,
  onClose,
  workspaceId,
}: CreateGroupDialogProps) => {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectionMode, setSelectionMode] = useState<"manual" | "auto">(
    "manual",
  );
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const [createGroup, { isLoading: creating }] = useCreateGroupMutation();
  const { data: allUsers = [] } = useGetGroupWorkspaceUsersQuery(workspaceId);
  const { data: channelsData, isLoading: loadingChannels } =
    useGetWorkspaceChannelsQuery(workspaceId);
  const [getChannelMembers, { isLoading: loadingChannelMembers }] =
    useGetChannelMembersMutation();

  const usersArray = Array.isArray(allUsers) ? allUsers : [];
  const channels = channelsData?.data?.channels || [];

  // Collect unique departments and roles from users for filter options
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    usersArray.forEach((user) => {
      if (user.department) set.add(user.department);
    });
    return Array.from(set).sort();
  }, [usersArray]);

  const availableRoles = useMemo(() => {
    const set = new Set<string>();
    usersArray.forEach((user) => {
      const r = user.role || user.profile?.title;
      if (r) set.add(r);
    });
    return Array.from(set).sort();
  }, [usersArray]);

  // Split positionFilters into dept/role separately
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [roleFilters, setRoleFilters] = useState<string[]>([]);

  // Filter users by search, department, and role
  const filteredUsers = useMemo(() => {
    return usersArray.filter((user) => {
      const matchesSearch =
        !searchQuery ||
        user.real_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept =
        departmentFilters.length === 0 ||
        (user.department && departmentFilters.includes(user.department));

      const matchesRole =
        roleFilters.length === 0 ||
        ((user.role || user.profile?.title) &&
          roleFilters.includes(user.role || user.profile?.title || ""));

      return matchesSearch && matchesDept && matchesRole;
    });
  }, [usersArray, searchQuery, departmentFilters, roleFilters]);

  const handleDeptToggle = (dept: string) => {
    setDepartmentFilters((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept],
    );
  };

  const handleRoleToggle = (role: string) => {
    setRoleFilters((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleChannelChange = async (channelIds: string[]) => {
    const newChannels = channelIds.filter(
      (id) => !selectedChannels.includes(id),
    );

    if (newChannels.length === 0) {
      // User removed a channel
      setSelectedChannels(channelIds);
      return;
    }

    setErrorMessage(""); // Clear previous errors

    try {
      const result = await getChannelMembers({
        workspaceId,
        channelIds: newChannels,
      }).unwrap();

      // Add all channel members to selected users
      const channelUserIds = result.data.users.map((user) => user.id);
      setSelectedUserIds((prev) => {
        const combined = [...new Set([...prev, ...channelUserIds])];
        return combined;
      });

      setSelectedChannels(channelIds);
    } catch (error: any) {
      console.error("Failed to import channel members:", error);

      // Handle rate limit error
      if (error.status === 429 || error.data?.message?.includes("rate limit")) {
        setErrorMessage(
          error.data?.message ||
          "Slack API rate limit exceeded. Please try again in a minute.",
        );
      } else {
        setErrorMessage("Failed to import channel members. Please try again.");
      }
    }
  };

  const handleSubmit = async () => {
    if (!groupName.trim()) return;

    try {
      await createGroup({
        groupName: groupName.trim(),
        description: description.trim() || undefined,
        workspaceId,
        members: selectedUserIds,
      }).unwrap();

      handleClose();
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setDescription("");
    setSelectionMode("manual");
    setSelectedUserIds([]);
    setSearchQuery("");
    setDepartmentFilters([]);
    setRoleFilters([]);
    setShowFilters(false);
    setSelectedChannels([]);
    setErrorMessage("");
    onClose();
  };

  // Table columns for member selection
  const columns: TableColumn<ISlackUser>[] = [
    {
      key: "photo",
      label: "Photo",
      type: "avatar",
      render: (_value: any, row: ISlackUser) => (
        <Avatar src={row.photoUrl || row.profile.image_72} sx={{ width: 40, height: 40 }}>
          {row.name.charAt(0).toUpperCase()}
        </Avatar>
      ),
    },
    {
      key: "name",
      label: "Name",
      type: "text",
      render: (_value: any, row: ISlackUser) => (
        <Typography variant="body2" fontWeight="600">
          {row.real_name || row.name}
        </Typography>
      ),
    },
    {
      key: "role",
      label: "Role",
      type: "text",
      render: (_value: any, row: ISlackUser) => (
        <Typography variant="body2" color="text.secondary">
          {row.role || row.profile?.title || "Member"}
        </Typography>
      ),
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      disableEnforceFocus
    >
      <DialogTitle>
        <Typography variant="h6" fontWeight="600">
          Create New Team
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 1 }}>
          {/* Group Name */}
          <Box>
            <FFInputField
              label="Team Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              required
              placeholder="e.g., Engineering Team"
              style={{ width: "100%" }}
            />
          </Box>

          {/* Description */}
          <Box>
            <FFInputField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this team"
              style={{ width: "100%" }}
            />
          </Box>

          {/* Import from Channel */}
          <Box>
            <FormControl fullWidth size="small">
              <InputLabel>Import from Channels (Optional)</InputLabel>
              <Select
                multiple
                value={selectedChannels}
                label="Import from Channels (Optional)"
                onChange={(e) =>
                  handleChannelChange(e.target.value as string[])
                }
                disabled={loadingChannels || loadingChannelMembers}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(selected as string[]).map((channelId) => (
                      <Chip
                        key={channelId}
                        label={`#${channels.find((ch) => ch.id === channelId)?.name || "channel"}`}
                        size="small"
                        onDelete={(e) => {
                          e.stopPropagation();
                          setSelectedChannels((prev) =>
                            prev.filter((id) => id !== channelId),
                          );
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ))}
                  </Box>
                )}
              >
                {channels
                  .filter((ch) => !ch.is_archived)
                  .map((channel) => (
                    <MenuItem key={channel.id} value={channel.id}>
                      #{channel.name}
                      {channel.num_members &&
                        ` (${channel.num_members} members)`}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            {loadingChannelMembers && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Importing channel members...
              </Alert>
            )}
            {errorMessage && (
              <Alert
                severity="error"
                sx={{ mt: 1 }}
                onClose={() => setErrorMessage("")}
              >
                {errorMessage}
              </Alert>
            )}
          </Box>

          {/* Selection Mode */}
          {/* <FormControl fullWidth>
            <InputLabel>Selection Mode</InputLabel>
            <Select
              value={selectionMode}
              label="Selection Mode"
              onChange={(e) =>
                setSelectionMode(e.target.value as "manual" | "auto")
              }
            >
              <MenuItem value="manual">Manual Selection</MenuItem>
              <MenuItem value="auto">Auto Selection</MenuItem>
            </Select>
          </FormControl> */}

          {/* Member Selection Section */}
          {selectionMode === "manual" && (
            <>
              {/* Search and Filters */}
              <Box display="flex" gap={2} alignItems="center">
                <Box flex={1} position="relative">
                  <InputAdornment
                    position="start"
                    sx={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  >
                    <Search sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                  <FFInputField
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: "100%", paddingLeft: "40px" }}
                  />
                </Box>
                <FFButton
                  variant={showFilters ? "primary" : "secondary"}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <FilterList sx={{ mr: 1 }} />
                  Filters
                </FFButton>
              </Box>

              {/* Role & Department Filter Chips */}
              {showFilters && (
                <Box>
                  {availableDepartments.length > 0 && (
                    <Box mb={1.5}>
                      <Typography variant="body2" color="text.secondary" mb={0.5} fontWeight={600}>
                        Filter by Department
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {availableDepartments.map((dept) => (
                          <Chip
                            key={dept}
                            label={dept}
                            onClick={() => handleDeptToggle(dept)}
                            color={departmentFilters.includes(dept) ? "primary" : "default"}
                            variant={departmentFilters.includes(dept) ? "filled" : "outlined"}
                            size="small"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {availableRoles.length > 0 && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" mb={0.5} fontWeight={600}>
                        Filter by Role
                      </Typography>
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {availableRoles.map((role) => (
                          <Chip
                            key={role}
                            label={role}
                            onClick={() => handleRoleToggle(role)}
                            color={roleFilters.includes(role) ? "primary" : "default"}
                            variant={roleFilters.includes(role) ? "filled" : "outlined"}
                            size="small"
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                  {availableDepartments.length === 0 && availableRoles.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No role or department data yet. Ask members to complete their onboarding.
                    </Typography>
                  )}
                </Box>
              )}

              {/* Members Table with Selection */}
              <Box>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Select Team Members ({selectedUserIds.length} selected)
                </Typography>
                <FFTable
                  columns={columns}
                  data={filteredUsers}
                  selectable
                  selectedIds={selectedUserIds}
                  onSelectionChange={(selectedIds: any[]) => {
                    setSelectedUserIds(selectedIds);
                  }}
                  rowKey="id"
                  emptyText="No members found"
                  pageSize={10}
                />
              </Box>
            </>
          )}

          {selectionMode === "auto" && (
            <Box sx={{ p: 3, bgcolor: "grey.50", borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Auto selection will automatically add new members based on their
                roles and departments. This feature is coming soon.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <FFButton variant="secondary" onClick={handleClose} disabled={creating}>
          Cancel
        </FFButton>
        <FFButton
          variant="primary"
          onClick={handleSubmit}
          disabled={!groupName.trim() || creating}
        >
          {creating ? "Creating..." : "Create Team"}
        </FFButton>
      </DialogActions>
    </Dialog>
  );
};
