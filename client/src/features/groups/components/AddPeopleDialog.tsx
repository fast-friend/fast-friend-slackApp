import { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Box,
  Typography,
  Chip,
  Avatar,
  CircularProgress,
} from "@mui/material";
import { FilterList } from "@mui/icons-material";
import {
  useGetGroupWorkspaceUsersQuery,
  useAddMemberMutation,
} from "../api/groupsApi";
import {
  useGetWorkspaceChannelsQuery,
  useGetChannelMembersMutation,
} from "@/features/slack/api/slackApi";
import { FFButton } from "@/components/ui/FFButton";
import { FFInputField } from "@/components/ui/FFInputField";
import { FFTable } from "@/components/ui/FFTable";
import type { Group } from "../types/groups.types";
import type { TableColumn } from "@/components/ui/FFTable";
import type { ISlackUser } from "@/features/slack/types/slack.types";

interface AddPeopleDialogProps {
  open: boolean;
  onClose: () => void;
  group: Group;
}

export const AddPeopleDialog = ({
  open,
  onClose,
  group,
}: AddPeopleDialogProps) => {
  const [activeTab, setActiveTab] = useState(0);

  // Tab 1: Select Users state
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Tab 2: Import from Channel state
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [channelSearchQuery, setChannelSearchQuery] = useState("");

  // Fetch workspace users
  const { data: allUsers = [], isLoading: loadingUsers } =
    useGetGroupWorkspaceUsersQuery(group.workspaceId);

  // Fetch workspace channels
  const { data: channelsResponse, isLoading: loadingChannels } =
    useGetWorkspaceChannelsQuery(group.workspaceId);
  const allChannels = channelsResponse?.data?.channels || [];

  // Mutations
  const [addMember, { isLoading: adding }] = useAddMemberMutation();
  const [getChannelMembers, { isLoading: fetchingChannelMembers }] =
    useGetChannelMembersMutation();

  // Ensure allUsers is an array
  const usersArray = Array.isArray(allUsers) ? allUsers : [];

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

  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [roleFilters, setRoleFilters] = useState<string[]>([]);

  // Filter users based on search, dept, role, and exclude existing members
  const filteredUsers = useMemo(() => {
    return usersArray.filter((user) => {
      if (group.members.includes(user.id)) return false;

      const matchesSearch =
        searchQuery === "" ||
        user.real_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.profile.email?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept =
        departmentFilters.length === 0 ||
        (user.department && departmentFilters.includes(user.department));

      const matchesRole =
        roleFilters.length === 0 ||
        ((user.role || user.profile?.title) &&
          roleFilters.includes(user.role || user.profile?.title || ""));

      return matchesSearch && matchesDept && matchesRole;
    });
  }, [usersArray, group.members, searchQuery, departmentFilters, roleFilters]);

  // Filter channels based on search
  const filteredChannels = useMemo(() => {
    return allChannels.filter((channel) => {
      return (
        channelSearchQuery === "" ||
        channel.name.toLowerCase().includes(channelSearchQuery.toLowerCase())
      );
    });
  }, [allChannels, channelSearchQuery]);

  const handleDeptToggle = (dept: string) => {
    setDepartmentFilters((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept],
    );
  };

  const handleRoleToggle = (r: string) => {
    setRoleFilters((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r],
    );
  };

  // Get users already in group for disabling
  const existingMemberIds = new Set(group.members);

  // Handle adding users (Tab 1)
  const handleAddSelectedUsers = async () => {
    if (selectedUserIds.length === 0) return;

    const selectedUsers = usersArray.filter((user) =>
      selectedUserIds.includes(user.id),
    );

    try {
      await addMember({
        workspaceId: group.workspaceId,
        groupId: group._id,
        users: selectedUsers.map((user) => ({
          userId: user.id,
          slackUser: user,
        })),
      }).unwrap();

      handleClose();
    } catch (error) {
      console.error("Failed to add members:", error);
    }
  };

  // Handle importing from channels (Tab 2)
  const handleImportFromChannels = async () => {
    if (selectedChannelIds.length === 0) return;

    try {
      // Fetch members from selected channels
      const response = await getChannelMembers({
        workspaceId: group.workspaceId,
        channelIds: selectedChannelIds,
      }).unwrap();

      const channelUsers = response.data.users;

      // Filter out users already in the group
      const newUsers = channelUsers.filter(
        (user) => !existingMemberIds.has(user.id),
      );

      if (newUsers.length === 0) {
        alert("All users from selected channels are already in this group.");
        return;
      }

      // Add all new users from channels
      await addMember({
        workspaceId: group.workspaceId,
        groupId: group._id,
        users: newUsers.map((user) => ({
          userId: user.id,
          slackUser: user,
        })),
      }).unwrap();

      handleClose();
    } catch (error) {
      console.error("Failed to import from channels:", error);
    }
  };

  // Handle close and reset
  const handleClose = () => {
    setSelectedUserIds([]);
    setSelectedChannelIds([]);
    setSearchQuery("");
    setChannelSearchQuery("");
    setDepartmentFilters([]);
    setRoleFilters([]);
    setShowFilters(false);
    setActiveTab(0);
    onClose();
  };

  // Table columns for member selection
  const userColumns: TableColumn<ISlackUser>[] = [
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

  // Table columns for channel selection
  const channelColumns: TableColumn[] = [
    {
      key: "name",
      label: "Channel",
      type: "text",
      render: (_value: any, row: any) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="body2" fontWeight="600">
            #{row.name}
          </Typography>
          {row.is_private && <Chip label="Private" size="small" />}
        </Box>
      ),
    },
    {
      key: "members",
      label: "Members",
      type: "number",
      render: (_value: any, row: any) => (
        <Typography variant="body2">{row.num_members || 0}</Typography>
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
          Add People to Team
        </Typography>
      </DialogTitle>

      <Tabs
        value={activeTab}
        onChange={(_e, newValue) => setActiveTab(newValue)}
        sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}
      >
        <Tab label="Select Users" />
        <Tab label="Import from Channel" />
      </Tabs>

      <DialogContent sx={{ minHeight: 400, pt: 3 }}>
        {/* Tab 1: Select Users */}
        {activeTab === 0 && (
          <Box>
            {/* Search and Filters */}
            <Box display="flex" gap={2} alignItems="center" mb={2}>
              <Box sx={{ flex: 1 }}>
                <FFInputField
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%" }}
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
              <Box mb={2}>
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

            {/* Selected Count */}
            {selectedUserIds.length > 0 && (
              <Typography variant="body2" color="text.secondary" mb={1}>
                {selectedUserIds.length} user(s) selected
              </Typography>
            )}

            {/* Users Table */}
            {loadingUsers ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                py={8}
              >
                <CircularProgress />
              </Box>
            ) : (
              <FFTable
                columns={userColumns}
                data={filteredUsers}
                selectable
                selectedIds={selectedUserIds}
                onSelectionChange={setSelectedUserIds}
                emptyText={
                  usersArray.length === 0
                    ? "No users found in workspace."
                    : "All workspace users are already members of this team."
                }
                pageSize={10}
              />
            )}
          </Box>
        )}

        {/* Tab 2: Import from Channel */}
        {activeTab === 1 && (
          <Box>
            {/* Channel Search */}
            <Box mb={2}>
              <FFInputField
                placeholder="Search channels..."
                value={channelSearchQuery}
                onChange={(e) => setChannelSearchQuery(e.target.value)}
                style={{ width: "100%" }}
              />
            </Box>

            {/* Selected Count */}
            {selectedChannelIds.length > 0 && (
              <Typography variant="body2" color="text.secondary" mb={1}>
                {selectedChannelIds.length} channel(s) selected
              </Typography>
            )}

            {/* Channels Table */}
            {loadingChannels ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                py={8}
              >
                <CircularProgress />
              </Box>
            ) : (
              <FFTable
                columns={channelColumns}
                data={filteredChannels}
                selectable
                selectedIds={selectedChannelIds}
                onSelectionChange={setSelectedChannelIds}
                emptyText="No channels found."
                pageSize={10}
              />
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <FFButton
          variant="secondary"
          onClick={handleClose}
          disabled={adding || fetchingChannelMembers}
        >
          Cancel
        </FFButton>
        {activeTab === 0 ? (
          <FFButton
            variant="primary"
            onClick={handleAddSelectedUsers}
            disabled={selectedUserIds.length === 0 || adding}
          >
            {adding
              ? "Adding..."
              : `Add ${selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ""}`}
          </FFButton>
        ) : (
          <FFButton
            variant="primary"
            onClick={handleImportFromChannels}
            disabled={
              selectedChannelIds.length === 0 ||
              adding ||
              fetchingChannelMembers
            }
          >
            {adding || fetchingChannelMembers
              ? "Importing..."
              : `Import from ${selectedChannelIds.length > 0 ? `(${selectedChannelIds.length})` : ""} Channel(s)`}
          </FFButton>
        )}
      </DialogActions>
    </Dialog>
  );
};
