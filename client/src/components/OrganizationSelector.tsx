import React, { useState } from "react";
import {
  FormControl,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  Divider,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  // Chip,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import { useWorkspace } from "@/contexts/OrganizationContext";
import { useNavigate, useLocation } from "react-router-dom";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import AddIcon from "@mui/icons-material/Add";
import { useGetCurrentUserQuery } from "@/features/auth";
import {
  useGetOrganizationsQuery,
  useCreateOrganizationMutation,
} from "@/features/organization";
// import BusinessIcon from "@mui/icons-material/Business";

export const WorkspaceSelector: React.FC = () => {
  const {
    currentWorkspace,
    workspaces,
    // organization,
    switchWorkspace,
    isLoading,
  } = useWorkspace();

  const navigate = useNavigate();
  const location = useLocation();

  const { data: userData } = useGetCurrentUserQuery();
  const { data: organizations, isLoading: orgsLoading } =
    useGetOrganizationsQuery();
  const [createOrganization, { isLoading: isCreating }] =
    useCreateOrganizationMutation();

  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleChange = (event: SelectChangeEvent) => {
    const newWorkspaceId = event.target.value;

    // If "add_workspace" was selected, trigger Slack connection
    if (newWorkspaceId === "add_workspace") {
      handleConnectSlack();
      return;
    }

    // Extract the current page path after /workspaces/:workspaceId
    // e.g., /workspaces/123/groups -> "groups"
    const pathSegments = location.pathname.split("/");
    const workspaceIndex = pathSegments.indexOf("workspaces");

    let currentPage = "dashboard"; // Default
    if (workspaceIndex !== -1 && pathSegments.length > workspaceIndex + 2) {
      // Get everything after workspaceId
      currentPage = pathSegments.slice(workspaceIndex + 2).join("/");
    }

    // Navigate to the same page but with new workspace
    navigate(`/workspaces/${newWorkspaceId}/${currentPage}`);

    // Update context as well (for backward compatibility)
    switchWorkspace(newWorkspaceId);
  };

  const handleConnectSlack = async () => {
    if (!userData?.data?.user?.id) {
      alert("Please log in first");
      return;
    }

    // Check if user has any organizations
    if (!organizations || organizations.length === 0) {
      // Show dialog to create organization
      setShowCreateOrgDialog(true);
      return;
    }

    // Use the first organization
    const organizationId = organizations[0]._id;

    setIsConnecting(true);

    // Build OAuth URL with organization ID
    const params = new URLSearchParams({
      organization_id: organizationId,
    });

    window.location.href = `${import.meta.env.VITE_API_URL}/slack/oauth/start?${params}`;
  };

  const handleCreateOrganization = async () => {
    if (!orgName.trim()) {
      alert("Please enter an organization name");
      return;
    }

    try {
      const result = await createOrganization({
        name: orgName,
      }).unwrap();

      // Close dialog
      setShowCreateOrgDialog(false);

      // Now connect with the new organization
      setIsConnecting(true);
      const params = new URLSearchParams({
        organization_id: result._id,
      });
      window.location.href = `${import.meta.env.VITE_API_URL}/slack/oauth/start?${params}`;
    } catch (error) {
      console.error("Failed to create organization:", error);
      alert("Failed to create organization. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1} px={2}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Loading...
        </Typography>
      </Box>
    );
  }

  if (workspaces.length === 0) {
    return (
      <Box display="flex" alignItems="center" gap={1} px={2}>
        <WorkspacesIcon fontSize="small" />
        <Typography variant="body2" color="text.secondary">
          No workspaces
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" alignItems="center" gap={2}>
      {/* Organization Name Display */}
      {/* {organization && (
        <Chip
          icon={<BusinessIcon />}
          label={organization.name}
          size="small"
          variant="outlined"
          sx={{ borderRadius: 1 }}
        />
      )} */}

      {/* Workspace Selector */}
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <Select
          value={currentWorkspace?._id || ""}
          onChange={handleChange}
          displayEmpty
          disabled={isConnecting || orgsLoading}
          startAdornment={
            <WorkspacesIcon
              fontSize="small"
              sx={{ mr: 1, color: "action.active" }}
            />
          }
        >
          {workspaces.map((ws) => (
            <MenuItem key={ws._id} value={ws._id}>
              {ws.teamName}
            </MenuItem>
          ))}

          {/* Divider before Add Workspace option */}
          <Divider sx={{ my: 1 }} />

          {/* Add Workspace Option */}
          <MenuItem value="add_workspace">
            <ListItemIcon>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary={
                isConnecting ? "Connecting..." : "Connect Slack Workspace"
              }
            />
          </MenuItem>
        </Select>
      </FormControl>

      {/* Create Organization Dialog */}
      <Dialog
        open={showCreateOrgDialog}
        onClose={() => setShowCreateOrgDialog(false)}
        disableEnforceFocus
      >
        <DialogTitle>Create Organization</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            You need to create an organization before connecting a Slack
            workspace.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Organization Name"
            type="text"
            fullWidth
            variant="outlined"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g., My Company"
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowCreateOrgDialog(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateOrganization}
            variant="contained"
            disabled={isCreating || !orgName.trim()}
          >
            {isCreating ? "Creating..." : "Create & Connect"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Backward compatibility export
export const OrganizationSelector = WorkspaceSelector;
