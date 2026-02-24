import { Box, Grid, Paper, Typography } from "@mui/material";
import { useGetGameStatsQuery } from "../api/slackGameApi";
import { useWorkspace } from "@/contexts/OrganizationContext";

const StatCard = ({
  title,
  value,
  subtitle,
  suffix = "",
}: {
  title: string;
  value: number | string;
  subtitle: string;
  suffix?: string;
}) => (
  <Paper
    elevation={0}
    sx={{
      p: 3,
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#FFFFFF",
      border: "1px solid #EAECF0",
      borderRadius: "12px",
      transition: "all 0.2s ease",
      "&:hover": {
        boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
      },
    }}
  >
    <Typography
      variant="h3"
      sx={{
        fontSize: "48px",
        fontWeight: 600,
        color: "#E57B2C",
        lineHeight: 1,
        mb: 1,
      }}
    >
      {value}
      {suffix && (
        <Typography
          component="span"
          sx={{
            fontSize: "24px",
            fontWeight: 600,
            color: "#E57B2C",
            ml: 0.5,
          }}
        >
          {suffix}
        </Typography>
      )}
    </Typography>
    <Typography
      variant="body1"
      sx={{
        fontSize: "14px",
        fontWeight: 600,
        color: "#101828",
        mb: 0.5,
      }}
    >
      {title}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        fontSize: "12px",
        fontWeight: 400,
        color: "#667085",
      }}
    >
      {subtitle}
    </Typography>
  </Paper>
);

import { useParams } from "react-router-dom";

export const StatisticsCards = () => {
  const { workspaceId: urlWorkspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = urlWorkspaceId || currentWorkspace?._id;

  const {
    data: stats,
    isLoading,
    error,
  } = useGetGameStatsQuery(workspaceId || "", {
    skip: !workspaceId,
  });

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
            <Paper elevation={2} sx={{ p: 3, height: 120 }}>
              <Box
                sx={{
                  animation: "pulse 1.5s ease-in-out infinite",
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.5 },
                  },
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Loading...
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (error || !stats) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography color="error">Failed to load statistics</Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          subtitle="Slack users in this workspace"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Total Teams"
          value={stats.totalTeams}
          subtitle="Groups in this workspace"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Active Games"
          value={stats.activeGames}
          subtitle="Scheduled or running games"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Avg Recognition Accuracy"
          value={stats.avgAccuracy}
          suffix="%"
          subtitle="Combined results of all users"
        />
      </Grid>
    </Grid>
  );
};
