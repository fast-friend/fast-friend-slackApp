import { SlackGameDashboard } from "@/features/slack-game/pages/SlackGameDashboard";
import {  Box,  } from "@mui/material";
// import { SlackConnect, WorkspaceList } from "@/features/slack";
// import { useEffect, useState } from "react";
// import { useSearchParams, useParams } from "react-router-dom";
// import {
//   WorkspacesOutlined,
//   CheckCircleOutlined,
//   TrendingUp,
//   Groups,
// } from "@mui/icons-material";
// import { useGetWorkspaceStatsQuery } from "@/features/slack/api/workspaceStatsApi";

const DashboardPage = () => {
  // const { workspaceId } = useParams<{ workspaceId: string }>();
  // const [searchParams, setSearchParams] = useSearchParams();
  // const [showSuccess, setShowSuccess] = useState(false);

  // // Fetch workspace stats
  // const { data: stats, isLoading: isLoadingStats } = useGetWorkspaceStatsQuery(workspaceId!, {
  //   skip: !workspaceId,
  // });

  // useEffect(() => {
  //   // Check if user was redirected from Slack OAuth
  //   if (searchParams.get("slack") === "connected") {
  //     setShowSuccess(true);
  //     // Remove the query param
  //     searchParams.delete("slack");
  //     setSearchParams(searchParams);

  //     // Hide success message after 5 seconds
  //     setTimeout(() => setShowSuccess(false), 5000);
  //   }
  // }, [searchParams, setSearchParams]);

  return (
    <Box>
      <SlackGameDashboard/>
      {/* Page Header */}
      {/* <Box mb={4}>
        <Typography
          variant="h4"
          gutterBottom
          fontWeight="bold"
          sx={{
            background: "linear-gradient(135deg, #2D241F 0%, #5B514A 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome back! Here's your workspace overview
        </Typography>
      </Box> */}

      {/* Success Alert */}
      {/* {showSuccess && (
        <Alert
          severity="success"
          icon={<CheckCircleOutlined />}
          sx={{
            mb: 3,
            borderLeft: "4px solid",
            borderColor: "success.main",
            bgcolor: "success.light",
            "& .MuiAlert-icon": {
              color: "success.main",
            },
          }}
        >
          Slack workspace connected successfully! 🎉
        </Alert>
      )} */}

      {/* Stats Overview */}
      {/* <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper
            sx={{
              p: 3,
              height: "100%",
              background: "linear-gradient(135deg, #FFF7F0 0%, #FFFFFF 100%)",
              border: "2px solid",
              borderColor: "primary.main",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0px 8px 24px rgba(229, 123, 44, 0.15)",
              },
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0px 4px 12px rgba(229, 123, 44, 0.25)",
                }}
              >
                <WorkspacesOutlined sx={{ fontSize: 28, color: "white" }} />
              </Box>
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Slack Users
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                  {isLoadingStats ? "..." : stats?.usersCount ?? 0}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper
            sx={{
              p: 3,
              height: "100%",
              background: "linear-gradient(135deg, #F9F8F6 0%, #FFFFFF 100%)",
              border: "1.5px solid",
              borderColor: "divider",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0px 8px 24px rgba(45, 36, 31, 0.08)",
              },
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: "grey.200",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Groups sx={{ fontSize: 28, color: "grey.700" }} />
              </Box>
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Groups
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                  {isLoadingStats ? "..." : stats?.groupsCount ?? 0}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Paper
            sx={{
              p: 3,
              height: "100%",
              background: "linear-gradient(135deg, #F9F8F6 0%, #FFFFFF 100%)",
              border: "1.5px solid",
              borderColor: "divider",
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: "0px 8px 24px rgba(45, 36, 31, 0.08)",
              },
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: "grey.200",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrendingUp sx={{ fontSize: 28, color: "grey.700" }} />
              </Box>
              <Box flex={1}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Engagement Rate
                </Typography>
                <Typography variant="h4" fontWeight="bold" color="text.primary">
                  {isLoadingStats ? "..." : `${stats?.engagementRate ?? 0}% `}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid> */}

      {/* Slack Integration Section */}
      {/* <Paper
        sx={{
          p: 4,
          background: "linear-gradient(135deg, #FFFFFF 0%, #FAF9F7 100%)",
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            right: 0,
            width: "300px",
            height: "300px",
            background:
              "radial-gradient(circle, rgba(229, 123, 44, 0.05) 0%, transparent 70%)",
            pointerEvents: "none",
          },
        }}
      > */}
        {/* Section Header */}
        {/* <Box mb={4}>
          <Stack direction="row" spacing={2} alignItems="center" mb={1}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0px 4px 12px rgba(229, 123, 44, 0.25)",
              }}
            >
              <WorkspacesOutlined sx={{ fontSize: 24, color: "white" }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight="bold" color="text.primary">
                Slack Integration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Connect your Slack workspaces to send messages and manage
                communications
              </Typography>
            </Box>
          </Stack>
        </Box> */}

        {/* Connect Button */}
        {/* <Box
          mb={4}
          p={3}
          sx={{
            bgcolor: "#FAFAF9",
            borderRadius: 2,
            border: "2px dashed",
            borderColor: "divider",
          }}
        >
          <SlackConnect />
        </Box> */}

        {/* Workspace List */}
        {/* <WorkspaceList /> */}
      {/* </Paper> */}
    </Box>
  );
};

export default DashboardPage;
