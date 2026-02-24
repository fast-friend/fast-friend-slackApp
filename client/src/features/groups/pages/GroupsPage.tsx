import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Container, Box, Typography, Alert } from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useGetGroupsQuery, useDeleteGroupMutation } from "../api/groupsApi";
import { useWorkspace } from "@/contexts/OrganizationContext";
import { CreateGroupDialog, EditGroupDialog } from "..";
import { FFButton } from "@/components/ui/FFButton";
import { FFInputField } from "@/components/ui/FFInputField";
import { FFTable } from "@/components/ui/FFTable";
import type { TableColumn } from "@/components/ui/FFTable";
import type { Group } from "../types/groups.types";

export const GroupsPage = () => {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Get current workspace from URL or context
  const { workspaceId: urlWorkspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = urlWorkspaceId || currentWorkspace?._id;

  const {
    data: groups = [],
    isLoading,
    error,
  } = useGetGroupsQuery(workspaceId || "", {
    skip: !workspaceId, // Skip query if no workspace connected
  });
  const [deleteGroup] = useDeleteGroupMutation();

  // Filter groups by search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    const query = searchQuery.toLowerCase();
    return groups.filter((group) =>
      group.groupName.toLowerCase().includes(query),
    );
  }, [groups, searchQuery]);

  const handleEdit = (group: Group) => {
    setSelectedGroup(group);
    setEditDialogOpen(true);
  };

  const handleDelete = async (groupId: string) => {
    if (!workspaceId) return;

    if (window.confirm("Are you sure you want to delete this group?")) {
      try {
        await deleteGroup({ workspaceId, groupId }).unwrap();
      } catch (error) {
        console.error("Failed to delete group:", error);
      }
    }
  };

  // Define table columns
  const columns: TableColumn<Group>[] = [
    {
      key: "groupName",
      label: "Team Name",
      type: "text",
      render: (value: any, row: Group) => (
        <Typography
          variant="body2"
          fontWeight="600"
          sx={{
            cursor: "pointer",
            "&:hover": { color: "primary.main" },
          }}
          onClick={() =>
            navigate(`/workspaces/${workspaceId}/groups/${row._id}`)
          }
        >
          {value}
        </Typography>
      ),
    },
    {
      key: "members",
      label: "Members",
      type: "number",
      render: (value: any) => (
        <Typography variant="body2">
          {Array.isArray(value) ? value.length : 0}
        </Typography>
      ),
    },
    {
      key: "activePlayers",
      label: "Active Players",
      type: "number",
      render: (_value, row: Group) => (
        <Typography variant="body2" color="success.main">
          {Math.floor(row.members.length * 0.8)}
        </Typography>
      ),
    },
    {
      key: "inactivePlayers",
      label: "Inactive Players",
      type: "number",
      render: (_value, row: Group) => (
        <Typography variant="body2" color="text.secondary">
          {Math.ceil(row.members.length * 0.2)}
        </Typography>
      ),
    },
    // {
    //   key: "accuracy",
    //   label: "Accuracy %",
    //   type: "number",
    //   render: (_value: any, _row: Group) => (
    //     <Typography variant="body2">
    //       {Math.floor(Math.random() * 20 + 75)}%
    //     </Typography>
    //   ),
    // },
    {
      key: "actions",
      label: "Actions",
      render: (_value: any, row: Group) => (
        <Box display="flex" gap={1}>
          <FFButton
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(row);
            }}
          >
            <EditIcon sx={{ fontSize: 18 }} />
          </FFButton>
          <FFButton
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row._id);
            }}
          >
            <DeleteIcon sx={{ fontSize: 18 }} />
          </FFButton>
        </Box>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        mb={4}
        display="flex"
        justifyContent="space-between"
        alignItems="center"
      >
        <Typography variant="h4" fontWeight="bold">
          Teams
        </Typography>
        <FFButton
          variant="primary"
          onClick={() => setCreateDialogOpen(true)}
          disabled={!workspaceId}
        >
          <AddIcon sx={{ mr: 1 }} />
          Create Team
        </FFButton>
      </Box>

      {/* No Workspace Alert */}
      {!workspaceId && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No Slack workspace connected. Please connect a workspace first to
          manage groups.
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(() => {
            const errorData = error as any;
            const status = errorData?.status || errorData?.originalStatus;
            const message = errorData?.data?.message || errorData?.error;

            if (status === 429) {
              return (
                message ||
                "Slack API rate limit exceeded. Please wait a moment and try again."
              );
            }
            return message || "Failed to load teams. Please try again.";
          })()}
        </Alert>
      )}

      {/* Search Bar */}
      <Box mb={3}>
        <Box sx={{ position: "relative", maxWidth: 400 }}>
          <SearchIcon
            sx={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "text.secondary",
              fontSize: 20,
            }}
          />
          <FFInputField
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: "40px" }}
          />
        </Box>
      </Box>

      {/* Groups Table */}
      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <Typography variant="body1" color="text.secondary">
            Loading teams...
          </Typography>
        </Box>
      ) : filteredGroups.length === 0 ? (
        <Box
          sx={{
            p: 8,
            textAlign: "center",
            backgroundColor: "grey.50",
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No teams found
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            {searchQuery
              ? "Try adjusting your search"
              : "Create your first team to get started"}
          </Typography>
        </Box>
      ) : (
        <FFTable
          columns={columns}
          data={filteredGroups}
          emptyText="No teams found"
          rowKey="_id"
        />
      )}

      {/* Dialogs */}
      {workspaceId && (
        <CreateGroupDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          workspaceId={workspaceId}
        />
      )}

      {selectedGroup && workspaceId && (
        <EditGroupDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedGroup(null);
          }}
          group={selectedGroup}
          workspaceId={workspaceId}
        />
      )}
    </Container>
  );
};
