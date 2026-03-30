import { Box, Grid, Paper, Typography } from "@mui/material";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "@/contexts/OrganizationContext";
import { useGetWorkspaceUsersQuery } from "@/features/slack/api/slackApi";
import { useGetGameStatsQuery } from "../api/slackGameApi";

const StatCard = ({
  title,
  value,
  suffix = "",
  onClick,
}: {
  title: string;
  value: number | string;
  suffix?: string;
  onClick: () => void;
}) => {
  return (
    <Paper
      component="button"
      onClick={onClick}
      elevation={0}
      sx={{
        p: 3,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 210,
        width: "100%",
        background: "#FFFFFF",
        border: "1px solid #EAECF0",
        borderRadius: "12px",
        transition: "all 0.2s ease",
        position: "relative",
        textAlign: "left",
        cursor: "pointer",
        outline: "none",
        "&:hover": {
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.08)",
          borderColor: "#D0D5DD",
        },
        "&:focus-visible": {
          boxShadow: "0 0 0 3px rgba(229, 123, 44, 0.25)",
        },
      }}
    >
      <ArrowForwardRoundedIcon
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          fontSize: 18,
          color: "#98A2B3",
          transform: "rotate(-45deg)",
        }}
      />

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

      <Box sx={{ mt: "auto" }}>
        <Typography
          variant="body1"
          sx={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#101828",
            lineHeight: 1.3,
            pr: 2,
          }}
        >
          {title}
        </Typography>
      </Box>
    </Paper>
  );
};

export const StatisticsCards = () => {
  const navigate = useNavigate();
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

  const { data: usersResponse } = useGetWorkspaceUsersQuery(workspaceId || "", {
    skip: !workspaceId,
  });

  const users = usersResponse?.data?.users || [];
  const completedOnboardingCount = users.filter(
    (user) => user.onboardingCompleted,
  ).length;

  const navigateTo = (path: string) => {
    if (!workspaceId) return;
    navigate(path);
  };

  if (isLoading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3, 4, 5].map((i) => (
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
    <Grid container spacing={3} columns={{ xs: 12, sm: 12, lg: 15 }}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          onClick={() => navigateTo(`/workspaces/${workspaceId}/users`)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Total decks"
          value={stats.totalTeams}
          onClick={() => navigateTo(`/workspaces/${workspaceId}/groups`)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Active Games"
          value={stats.activeGames}
          onClick={() => navigateTo(`/workspaces/${workspaceId}/games`)}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Avg Recognition Accuracy"
          value={stats.avgAccuracy}
          suffix="%"
          onClick={() =>
            navigateTo(`/workspaces/${workspaceId}/dashboard#deck-performance`)
          }
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <StatCard
          title="Completed Onboarding"
          value={completedOnboardingCount}
          onClick={() =>
            navigateTo(`/workspaces/${workspaceId}/users?status=completed`)
          }
        />
      </Grid>
    </Grid>
  );
};
