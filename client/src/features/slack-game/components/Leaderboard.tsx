import { Paper, Typography, Box } from "@mui/material";
import { useGetLeaderboardQuery } from "../api/slackGameApi";
import { useWorkspace } from "@/contexts/OrganizationContext";
import { useParams } from "react-router-dom";
import FFTable, { type TableColumn } from "@/components/ui/FFTable";

// Define table columns
const columns: TableColumn[] = [
  {
    key: "photo",
    label: "Photo",
    type: "avatar",
    width: 60,
    nameKey: "name",
  },
  {
    key: "name",
    label: "Name",
    type: "bold",
  },
  {
    key: "role",
    label: "Role",
    type: "text",
  },
  {
    key: "gamesPlayed",
    label: "Games Played",
    type: "number",
    align: "right",
  },
  {
    key: "accuracy",
    label: "Accuracy (%)",
    type: "number",
    align: "right",
  },
];

export const Leaderboard = () => {
  const { workspaceId: urlWorkspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = urlWorkspaceId || currentWorkspace?._id;

  const {
    data: leaderboard,
    isLoading,
    error,
  } = useGetLeaderboardQuery(
    { workspaceId: workspaceId || "", limit: 10 },
    {
      skip: !workspaceId,
    },
  );

  // Transform leaderboard data for FFTable — role and avatarUrl come from the backend
  const tableData =
    leaderboard?.map((user) => {
      const accuracy =
        user.totalResponses > 0
          ? Math.round((user.correctAnswers / user.totalResponses) * 100)
          : 0;

      return {
        id: user.slackUserId,
        photo: user.avatarUrl || undefined, // backend already prefers photoUrl over avatarUrl
        name: user.name,
        role: user.role || "Member",
        gamesPlayed: user.totalResponses,
        accuracy: accuracy,
      };
    }) || [];

  if (isLoading) {
    return (
      <Box>
        <Typography
          variant="h6"
          sx={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#101828",
            mb: 2,
          }}
        >
          Leaderboard
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontSize: "14px", color: "#667085", mb: 1 }}
        >
          Top 10 players with the highest recognition accuracy.
        </Typography>
        <Paper elevation={0} sx={{ p: 3, mt: 2 }}>
          <Typography color="text.secondary">Loading...</Typography>
        </Paper>
      </Box>
    );
  }

  if (error || !leaderboard) {
    return (
      <Box>
        <Typography
          variant="h6"
          sx={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#101828",
            mb: 2,
          }}
        >
          Leaderboard
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontSize: "14px", color: "#667085", mb: 1 }}
        >
          Top 10 players with the highest recognition accuracy.
        </Typography>
        <Paper elevation={0} sx={{ p: 3, mt: 2 }}>
          <Typography color="error">Failed to load leaderboard</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#101828",
          mb: 1,
        }}
      >
        Leaderboard
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontSize: "14px", color: "#667085", mb: 2 }}
      >
        Top 10 players with the highest recognition accuracy.
      </Typography>

      <FFTable
        columns={columns}
        data={tableData}
        pageSize={5}
        rowKey="id"
        emptyText="No leaderboard data available"
        style={{ marginTop: 0 }}
      />
    </Box>
  );
};
