import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Avatar,
  Chip,
  Popover,
  Stack,
  FormControlLabel,
  Checkbox,
  Button,
  Badge,
  Divider,
} from "@mui/material";
import { Add, FilterList } from "@mui/icons-material";
import {
  useGetGroupWorkspaceUsersQuery,
  useGetGroupsQuery,
} from "../api/groupsApi";
import { AddPeopleDialog } from "./AddPeopleDialog";
import { FFButton } from "@/components/ui/FFButton";
import { FFInputField } from "@/components/ui/FFInputField";
import { FFTable } from "@/components/ui/FFTable";
import type { Group, SlackUser } from "../types/groups.types";
import type { TableColumn } from "@/components/ui/FFTable";

interface PeopleTabProps {
  group: Group;
}

export const PeopleTab = ({ group }: PeopleTabProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { data: allUsers = [], isLoading: loadingUsers } =
    useGetGroupWorkspaceUsersQuery(group.workspaceId);

  const { data: allGroups = [] } = useGetGroupsQuery(group.workspaceId);

  const usersArray = Array.isArray(allUsers) ? allUsers : [];

  // Get member details from Slack users
  const memberDetails = usersArray.filter((user) =>
    group.members.includes(user.id),
  );

  // Collect unique departments and roles from members for filter options
  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    memberDetails.forEach((u) => {
      if (u.department) set.add(u.department);
    });
    return [...set].sort();
  }, [memberDetails]);

  const availableRoles = useMemo(() => {
    const set = new Set<string>();
    memberDetails.forEach((u) => {
      if (u.role) set.add(u.role);
    });
    return [...set].sort();
  }, [memberDetails]);

  // Active filter count
  const activeFilterCount = selectedDepartments.length + selectedRoles.length;

  // Filter members by search + department + role
  const filteredMembers = useMemo(() => {
    let result = memberDetails;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.real_name.toLowerCase().includes(query) ||
          user.name.toLowerCase().includes(query) ||
          user.profile.email?.toLowerCase().includes(query),
      );
    }

    if (selectedDepartments.length > 0) {
      result = result.filter((user) =>
        selectedDepartments.includes(user.department ?? ""),
      );
    }

    if (selectedRoles.length > 0) {
      result = result.filter((user) =>
        selectedRoles.includes(user.role ?? ""),
      );
    }

    return result;
  }, [memberDetails, searchQuery, selectedDepartments, selectedRoles]);

  const getMemberTeams = (userId: string) => {
    return allGroups
      .filter((g) => g.members.includes(userId) && g._id !== group._id)
      .map((g) => g.groupName);
  };

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept],
    );
  };

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const clearFilters = () => {
    setSelectedDepartments([]);
    setSelectedRoles([]);
  };

  const columns: TableColumn[] = [
    {
      key: "photo",
      label: "Photo",
      type: "avatar",
      render: (_value: any, row: any) => (
        <Avatar
          src={row.profile.image_72}
          alt={row.real_name}
          sx={{ width: 40, height: 40 }}
        >
          {row.name.charAt(0).toUpperCase()}
        </Avatar>
      ),
    },
    {
      key: "name",
      label: "Name",
      type: "text",
      render: (_value: any, row: any) => (
        <Typography variant="body2" fontWeight="600">
          {row.real_name || row.name}
        </Typography>
      ),
    },
    {
      key: "department",
      label: "Department",
      type: "text",
      render: (_value: any, row: SlackUser) => (
        <Typography variant="body2" color="text.secondary">
          {row.department || "—"}
        </Typography>
      ),
    },
    {
      key: "role",
      label: "Role",
      type: "text",
      render: (_value: any, row: SlackUser) => (
        <Typography variant="body2" color="text.secondary">
          {row.role || row.profile.title || "—"}
        </Typography>
      ),
    },
    {
      key: "teams",
      label: "Teams",
      type: "text",
      render: (_value: any, row: any) => {
        const teams = getMemberTeams(row.id);
        return (
          <Box display="flex" gap={0.5} flexWrap="wrap">
            {teams.length > 0 ? (
              teams
                .slice(0, 2)
                .map((teamName) => (
                  <Chip key={teamName} label={teamName} size="small" />
                ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                —
              </Typography>
            )}
            {teams.length > 2 && (
              <Chip
                label={`+${teams.length - 2}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        );
      },
    },
    {
      key: "account",
      label: "Account",
      type: "text",
      render: (_value: any, row: any) => (
        <Chip
          label={row.deleted ? "Inactive" : "Active"}
          size="small"
          color={row.deleted ? "default" : "success"}
        />
      ),
    },
  ];

  const filterOpen = Boolean(filterAnchorEl);

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h6" fontWeight="600">
          Team Members ({filteredMembers.length}
          {activeFilterCount > 0 ? ` of ${memberDetails.length}` : ""})
        </Typography>
        <FFButton
          variant="primary"
          onClick={() => setAddDialogOpen(true)}
          disabled={loadingUsers}
        >
          <Add sx={{ mr: 1 }} />
          {loadingUsers ? "Loading..." : "Add People"}
        </FFButton>
      </Box>

      {/* Search + Filter Row */}
      <Box mb={3} display="flex" gap={1.5} alignItems="center">
        <FFInputField
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: "360px" }}
        />

        <Badge badgeContent={activeFilterCount} color="error" overlap="circular">
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={(e) => setFilterAnchorEl(e.currentTarget)}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 500,
              borderColor: activeFilterCount > 0 ? "#E57B2C" : "#D0D5DD",
              color: activeFilterCount > 0 ? "#E57B2C" : "#344054",
              "&:hover": { borderColor: "#E57B2C", color: "#E57B2C", bgcolor: "#FFF8F3" },
            }}
          >
            Filter
          </Button>
        </Badge>

        {activeFilterCount > 0 && (
          <Button
            size="small"
            onClick={clearFilters}
            sx={{ textTransform: "none", color: "#667085", fontSize: 13 }}
          >
            Clear filters
          </Button>
        )}
      </Box>

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <Box display="flex" gap={0.75} flexWrap="wrap" mb={2}>
          {selectedDepartments.map((d) => (
            <Chip
              key={d}
              label={d}
              size="small"
              onDelete={() => toggleDepartment(d)}
              sx={{ bgcolor: "#FFF3EB", color: "#C96A21", borderColor: "#F5C099", border: "1px solid" }}
            />
          ))}
          {selectedRoles.map((r) => (
            <Chip
              key={r}
              label={r}
              size="small"
              onDelete={() => toggleRole(r)}
              sx={{ bgcolor: "#EEF4FF", color: "#3563E9", borderColor: "#C3D4FB", border: "1px solid" }}
            />
          ))}
        </Box>
      )}

      {/* Members Table */}
      <FFTable
        columns={columns}
        data={filteredMembers}
        emptyText={
          activeFilterCount > 0
            ? "No members match the selected filters."
            : "No members in this team yet. Add some members to get started!"
        }
        pageSize={10}
      />

      {/* Filter Popover */}
      <Popover
        open={filterOpen}
        anchorEl={filterAnchorEl}
        onClose={() => setFilterAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: "12px",
            border: "1px solid #EAECF0",
            boxShadow: "0 4px 20px rgba(16,24,40,0.12)",
            minWidth: 260,
            p: 2.5,
          },
        }}
      >
        <Typography variant="body2" fontWeight={700} color="#101828" mb={1.5}>
          Filter Members
        </Typography>

        {/* Department filter */}
        {availableDepartments.length > 0 && (
          <>
            <Typography variant="caption" fontWeight={600} color="#667085" display="block" mb={0.5}>
              DEPARTMENT
            </Typography>
            <Stack spacing={0}>
              {availableDepartments.map((dept) => (
                <FormControlLabel
                  key={dept}
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedDepartments.includes(dept)}
                      onChange={() => toggleDepartment(dept)}
                      sx={{ "&.Mui-checked": { color: "#E57B2C" } }}
                    />
                  }
                  label={<Typography variant="body2">{dept}</Typography>}
                  sx={{ mx: 0 }}
                />
              ))}
            </Stack>
          </>
        )}

        {availableDepartments.length > 0 && availableRoles.length > 0 && (
          <Divider sx={{ my: 1.5 }} />
        )}

        {/* Role filter */}
        {availableRoles.length > 0 && (
          <>
            <Typography variant="caption" fontWeight={600} color="#667085" display="block" mb={0.5}>
              ROLE
            </Typography>
            <Stack spacing={0}>
              {availableRoles.map((role) => (
                <FormControlLabel
                  key={role}
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                      sx={{ "&.Mui-checked": { color: "#3563E9" } }}
                    />
                  }
                  label={<Typography variant="body2">{role}</Typography>}
                  sx={{ mx: 0 }}
                />
              ))}
            </Stack>
          </>
        )}

        {availableDepartments.length === 0 && availableRoles.length === 0 && (
          <Typography variant="body2" color="#98A2B3" textAlign="center" py={2}>
            No department or role data available yet.
            <br />
            Members can set these during onboarding.
          </Typography>
        )}

        {activeFilterCount > 0 && (
          <Button
            fullWidth
            size="small"
            onClick={() => { clearFilters(); setFilterAnchorEl(null); }}
            sx={{ mt: 1.5, textTransform: "none", color: "#667085" }}
          >
            Clear all filters
          </Button>
        )}
      </Popover>

      {/* Add People Dialog */}
      <AddPeopleDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        group={group}
      />
    </Box>
  );
};
