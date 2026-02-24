import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Divider,
  Grid,
} from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { GroupsOutlined } from "@mui/icons-material";
import { useWorkspace } from "@/contexts/OrganizationContext";
import {
  useGetTeamPerformanceQuery,
  useGetPerformanceChartQuery,
} from "../api/slackGameApi";

export const TeamPerformance = () => {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?._id || "";

  // Filter states
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [days, setDays] = useState<number | "all">(7);

  // 1) Fetch team aggregates
  const { data: teamsData, isLoading: isLoadingTeams } = useGetTeamPerformanceQuery(
    workspaceId,
    { skip: !workspaceId }
  );

  // 2) Fetch chart data
  const {
    data: chartData,
    isLoading: isLoadingChart,
    error: chartError,
  } = useGetPerformanceChartQuery(
    { workspaceId, groupId: selectedGroupId, days },
    { skip: !workspaceId || !selectedGroupId }
  );

  const handleTimeframeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newDays: number | "all" | null
  ) => {
    if (newDays !== null) {
      setDays(newDays);
    }
  };

  // Derive active team stats for the left card
  const activeTeamStats = useMemo(() => {
    if (!teamsData) return null;
    if (selectedGroupId === "all") {
      // Aggregate stats across all teams
      let totalMessages = 0;
      // To strictly match "all", we sum messages:
      teamsData.forEach((t) => {
        totalMessages += t.totalMessages || 0;
      });

      // Simple unweighted average for accuracy and response rate
      const activeTeamsWithGames = teamsData.filter((t) => t.totalGames > 0);
      const avgAccuracy =
        activeTeamsWithGames.length > 0
          ? Math.round(
            activeTeamsWithGames.reduce((acc, t) => acc + t.accuracy, 0) /
            activeTeamsWithGames.length
          )
          : 0;

      const avgResponseRate =
        activeTeamsWithGames.length > 0
          ? Math.round(
            activeTeamsWithGames.reduce((acc, t) => acc + t.responseRate, 0) /
            activeTeamsWithGames.length
          )
          : 0;

      return {
        groupName: "All Teams",
        totalMessages,
        accuracy: avgAccuracy,
        responseRate: avgResponseRate,
      };
    }
    return teamsData.find((t) => t.groupId === selectedGroupId) || null;
  }, [teamsData, selectedGroupId]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper
          sx={{
            p: 2,
            border: "1px solid #EAECF0",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
          }}
        >
          <Typography variant="body2" fontWeight={600} mb={1}>
            {label}
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Box key={index} display="flex" alignItems="center" gap={1} mb={0.5}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: entry.color,
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {entry.name}:{" "}
                <Typography component="span" fontWeight={600} color="text.primary">
                  {entry.value}%
                </Typography>
              </Typography>
            </Box>
          ))}
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
        flexWrap="wrap"
        gap={2}
      >
        <Typography
          variant="h6"
          sx={{ fontSize: "18px", fontWeight: 600, color: "#101828" }}
        >
          Team Performance
        </Typography>

        <Box display="flex" gap={2} alignItems="center">
          {/* Team Selector */}
          <FormControl size="small" sx={{ minWidth: 200, bgcolor: "white" }}>
            <Select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              disabled={isLoadingTeams || !teamsData}
              displayEmpty
            >
              <MenuItem value="all">All Teams</MenuItem>
              {teamsData &&
                teamsData.map((team) => (
                  <MenuItem key={team.groupId} value={team.groupId}>
                    {team.groupName}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>

          {/* Timeframe Toggle */}
          <ToggleButtonGroup
            value={days}
            exclusive
            onChange={handleTimeframeChange}
            size="small"
            sx={{ bgcolor: "white" }}
          >
            <ToggleButton value={7}>7D</ToggleButton>
            <ToggleButton value={14}>14D</ToggleButton>
            <ToggleButton value={30}>30D</ToggleButton>
            <ToggleButton value="all">ALL</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Grid Layout: Left Card, Right Chart */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              background: "#FFFFFF",
              border: "1px solid #EAECF0",
              borderRadius: "12px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {isLoadingTeams || !activeTeamStats ? (
              <Box py={4} display="flex" justifyContent="center">
                <CircularProgress size={30} />
              </Box>
            ) : (
              <>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#101828",
                    mb: 3,
                    wordBreak: "break-word",
                  }}
                >
                  {activeTeamStats.groupName}
                </Typography>

                {/* Total Messages Sent */}
                <Box mb={2}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontSize: "28px",
                      fontWeight: 700,
                      color: "#344054",
                      mb: 0.25,
                    }}
                  >
                    {activeTeamStats.totalMessages}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: "12px", color: "#667085" }}
                  >
                    Total Messages Sent
                  </Typography>
                </Box>

                <Divider sx={{ my: 2, borderColor: "#F2F4F7" }} />

                {/* Response Rate */}
                <Box mb={2}>
                  <Typography
                    variant="h4"
                    sx={{
                      fontSize: "28px",
                      fontWeight: 700,
                      color: "#344054",
                      mb: 0.25,
                    }}
                  >
                    {activeTeamStats.responseRate}%
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: "12px", color: "#667085" }}
                  >
                    Response Rate
                  </Typography>
                </Box>

                <Divider sx={{ my: 2, borderColor: "#F2F4F7" }} />

                {/* Accuracy */}
                <Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontSize: "28px",
                      fontWeight: 700,
                      color: "#E57B2C",
                      mb: 0.25,
                    }}
                  >
                    {activeTeamStats.accuracy}%
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: "12px", color: "#667085" }}
                  >
                    Accuracy Rate
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 4 },
              background: "#FFFFFF",
              border: "1px solid #EAECF0",
              borderRadius: "12px",
              height: "100%",
              minHeight: 350,
              display: "flex",
              flexDirection: "column",
              position: "relative",
            }}
          >
            {isLoadingChart || isLoadingTeams ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                flex={1}
                minHeight={300}
              >
                <CircularProgress />
              </Box>
            ) : chartError ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                flex={1}
                minHeight={300}
              >
                <Alert severity="error">Failed to load chart data.</Alert>
              </Box>
            ) : chartData?.length === 0 ? (
              <Box
                display="flex"
                flexDirection="column"
                justifyContent="center"
                alignItems="center"
                flex={1}
                minHeight={300}
              >
                <GroupsOutlined
                  sx={{ fontSize: 48, color: "#D0D5DD", mb: 2 }}
                />
                <Typography variant="body1" color="text.secondary">
                  No game data available for the selected timeframe.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ width: "100%", height: 320, flex: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#EAECF0"
                    />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#667085", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(val) => `${val}%`}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#667085", fontSize: 12 }}
                      dx={-10}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ paddingBottom: "20px" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="accuracy"
                      name="Accuracy Rate"
                      stroke="#E57B2C"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#E57B2C",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="responseRate"
                      name="Response Rate"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      dot={{
                        r: 4,
                        fill: "#3B82F6",
                        strokeWidth: 2,
                        stroke: "#fff",
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
