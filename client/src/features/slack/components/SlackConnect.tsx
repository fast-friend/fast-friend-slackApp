import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { WorkspacesOutlined as SlackIcon } from "@mui/icons-material";
import { useGetCurrentUserQuery } from "@/features/auth";
import {
  useGetOrganizationsQuery,
  useCreateOrganizationMutation,
} from "@/features/organization";
import { useState } from "react";

// Custom Components
import FFButton from "@/components/ui/FFButton";

interface SlackConnectProps {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "slack";
  fullWidth?: boolean;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

const SlackConnect = ({
  variant = "slack",
  fullWidth = false,
  children,
  icon,
}: SlackConnectProps) => {
  const { data: userData } = useGetCurrentUserQuery();
  const { data: organizations, isLoading: orgsLoading } =
    useGetOrganizationsQuery();
  const [createOrganization, { isLoading: isCreating }] =
    useCreateOrganizationMutation();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCreateOrgDialog, setShowCreateOrgDialog] = useState(false);
  const [orgName, setOrgName] = useState("");

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

  return (
    <>
      <FFButton
        variant={variant === "slack" ? "primary" : variant}
        loading={isConnecting}
        iconLeft={!isConnecting ? icon || <SlackIcon /> : null}
        onClick={handleConnectSlack}
        disabled={isConnecting || !userData || orgsLoading}
        fullWidth={fullWidth}
        style={
          variant === "slack"
            ? {
                backgroundColor: "#4A154B",
                borderColor: "#4A154B",
                color: "#FFFFFF",
              }
            : {}
        }
      >
        {children ||
          (isConnecting ? "Connecting..." : "Connect Slack Workspace")}
      </FFButton>

      {/* Create Organization Dialog */}
      <Dialog
        open={showCreateOrgDialog}
        onClose={() => setShowCreateOrgDialog(false)}
        disableEnforceFocus
      >
        <DialogTitle>Create Organization</DialogTitle>
        <DialogContent>
          <p style={{ marginBottom: "16px" }}>
            You need to create an organization before connecting a Slack
            workspace.
          </p>
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
    </>
  );
};

export default SlackConnect;
