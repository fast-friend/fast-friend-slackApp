import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Skeleton,
  Alert,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { NavigateNext } from "@mui/icons-material";
import { useGetGroupDetailQuery } from "../api/groupsApi";
import { useWorkspace } from "@/contexts/OrganizationContext";
import { PeopleTab } from "../components/PeopleTab";
import { GamesTab } from "../components/GamesTab";

export const GroupDetailPage = () => {
  const { groupId, workspaceId: urlWorkspaceId } = useParams<{
    groupId: string;
    workspaceId: string;
  }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const { currentWorkspace } = useWorkspace();
  const workspaceId = urlWorkspaceId || currentWorkspace?._id;

  const {
    data: group,
    isLoading,
    error,
  } = useGetGroupDetailQuery(
    { workspaceId: workspaceId || "", groupId: groupId || "" },
    { skip: !groupId || !workspaceId },
  );

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" height={200} />
      </Container>
    );
  }

  if (error || !group) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load group details</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate(`/workspaces/${workspaceId}/groups`)}
          sx={{
            textDecoration: "none",
            color: "text.secondary",
            "&:hover": { color: "primary.main" },
          }}
        >
          Teams
        </Link>
        <Typography variant="body1" color="text.primary" fontWeight="600">
          {group.groupName}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" mb={1}>
          {group.groupName}
        </Typography>
        {group.description && (
          <Typography variant="body1" color="text.secondary">
            {group.description}
          </Typography>
        )}
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_e, newValue) => setActiveTab(newValue)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="People" />
          <Tab label="Games" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && <PeopleTab group={group} />}
      {activeTab === 1 && <GamesTab group={group} />}
    </Container>
  );
};
