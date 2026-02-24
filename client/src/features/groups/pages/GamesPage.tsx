import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Skeleton,
  FormHelperText,
  OutlinedInput,
  Checkbox,
  ListItemText,
} from "@mui/material";
import {
  Add as AddIcon,
  EmojiEvents as GamesIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
} from "@mui/icons-material";
import { useWorkspace } from "@/contexts/OrganizationContext";
import { useGetGroupsQuery } from "../api/groupsApi";
import { useGetGameTemplatesQuery } from "../api/gameTemplatesApi";
import {
  useCreateGameMutation,
  useUpdateGameMutation,
  useDeleteGameMutation,
  useGetAllGamesQuery,
} from "../api/gamesApi";
import FFButton from "@/components/ui/FFButton";

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export const GamesPage = () => {
  const { workspaceId: urlWorkspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = urlWorkspaceId || currentWorkspace?._id;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editGameId, setEditGameId] = useState<string | null>(null);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [gameName, setGameName] = useState("");
  const [scheduleType, setScheduleType] = useState<"weekly" | "monthly">("weekly");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [frequencyHours, setFrequencyHours] = useState<number | "">("");
  const [frequencyMinutes, setFrequencyMinutes] = useState<number | "">("");

  // Fetch groups (teams) and templates
  const { data: groups = [], isLoading: loadingGroups } = useGetGroupsQuery(
    workspaceId || "",
    { skip: !workspaceId },
  );
  const { data: templates = [] } = useGetGameTemplatesQuery(workspaceId || "", {
    skip: !workspaceId,
  });

  const [createGame, { isLoading: creating }] = useCreateGameMutation();
  const [updateGame, { isLoading: updating }] = useUpdateGameMutation();
  const [deleteGame] = useDeleteGameMutation();

  // Fetch all games across all groups
  const { data: allGames = [], isLoading: loadingGames } = useGetAllGamesQuery(
    workspaceId || "",
    { skip: !workspaceId },
  );

  const handleEditClick = (game: any) => {
    setEditGameId(game._id);
    setEditGroupId(game.groupId);
    setSelectedGroupIds([game.groupId]);
    setSelectedTemplateId(game.gameTemplateId as string);
    setGameName(game.gameName);
    setScheduleType(game.scheduleType as "weekly" | "monthly");
    setSelectedDays(game.scheduledDays || []);
    setScheduledTime(game.scheduledTime || "09:00");

    if (game.frequencyMinutes) {
      setFrequencyHours(Math.floor(game.frequencyMinutes / 60) || "");
      setFrequencyMinutes(game.frequencyMinutes % 60 || "");
    } else {
      setFrequencyHours("");
      setFrequencyMinutes("");
    }

    setCreateDialogOpen(true);
  };

  const handleCreateOrEditGame = async () => {
    if (
      !gameName.trim() ||
      !selectedTemplateId ||
      selectedGroupIds.length === 0 ||
      selectedDays.length === 0
    ) {
      return;
    }

    try {
      const payload = {
        gameName: gameName.trim(),
        gameTemplateId: selectedTemplateId,
        scheduleType,
        scheduledDays: selectedDays,
        scheduledTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...((frequencyHours || frequencyMinutes)
          ? { frequencyMinutes: (Number(frequencyHours || 0) * 60) + Number(frequencyMinutes || 0) }
          : { frequencyMinutes: null as any }),
      };

      if (editGameId && editGroupId) {
        // Edit flow
        await updateGame({
          workspaceId: workspaceId!,
          groupId: editGroupId,
          gameId: editGameId,
          data: payload as any,
        }).unwrap();
      } else {
        // Create flow for each selected group
        const promises = selectedGroupIds.map((groupId) =>
          createGame({
            workspaceId: workspaceId!,
            groupId,
            data: payload as any,
          }).unwrap(),
        );
        await Promise.all(promises);
      }

      // Reset form
      setCreateDialogOpen(false);
      setEditGameId(null);
      setEditGroupId(null);
      setGameName("");
      setSelectedTemplateId("");
      setSelectedGroupIds([]);
      setScheduleType("weekly");
      setSelectedDays([]);
      setScheduledTime("09:00");
      setFrequencyHours("");
      setFrequencyMinutes("");
    } catch (error) {
      console.error("Failed to save game:", error);
    }
  };

  const handleDeleteGame = async (groupId: string, gameId: string) => {
    if (!workspaceId) return;
    if (window.confirm("Are you sure you want to delete this game?")) {
      try {
        await deleteGame({ workspaceId, groupId, gameId }).unwrap();
      } catch (error) {
        console.error("Failed to delete game:", error);
      }
    }
  };

  const getDayLabel = (days: number[], type: "weekly" | "monthly") => {
    if (type === "weekly") {
      return days
        .map((d) => WEEKDAYS.find((wd) => wd.value === d)?.label)
        .join(", ");
    }
    return days.map((d) => `${d}`).join(", ");
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box mb={4}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={2}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <GamesIcon sx={{ fontSize: 40, color: "primary.main" }} />
            <div>
              <Typography variant="h4" fontWeight="bold">
                Games
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage scheduled games across all teams
              </Typography>
            </div>
          </Box>
          <FFButton
            variant="primary"
            onClick={() => setCreateDialogOpen(true)}
            disabled={!workspaceId || groups.length === 0}
            iconLeft={<AddIcon sx={{ fontSize: 20 }} />}
          >
            Create Game
          </FFButton>
        </Box>
      </Box>

      {/* No Workspace Alert */}
      {!workspaceId && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No Slack workspace connected. Please connect a workspace first.
        </Alert>
      )}

      {/* No Teams Alert */}
      {workspaceId && groups.length === 0 && !loadingGroups && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No teams found. Please create teams first before creating games.
        </Alert>
      )}

      {/* Games Grid */}
      {loadingGroups || loadingGames ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="40%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : allGames.length === 0 ? (
        <Box
          sx={{
            p: 8,
            textAlign: "center",
            backgroundColor: "grey.50",
            borderRadius: 2,
          }}
        >
          <GamesIcon sx={{ fontSize: 80, color: "grey.400", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No games scheduled yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Create your first game to start engaging with your teams
          </Typography>
          <FFButton
            variant="primary"
            onClick={() => setCreateDialogOpen(true)}
            disabled={groups.length === 0}
            iconLeft={<AddIcon sx={{ fontSize: 20 }} />}
          >
            Create First Game
          </FFButton>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {allGames.map((game) => (
            <Grid
              key={`${game.groupId}-${game._id}`}
              size={{ xs: 12, sm: 6, md: 4 }}
            >
              <Card
                elevation={2}
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" fontWeight="bold">
                      {game.gameName}
                    </Typography>
                    <Box>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => handleEditClick(game)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteGame(game.groupId, game._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box mb={2}>
                    <Chip
                      label={game.groupName}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mb: 1 }}
                    />
                  </Box>

                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <ScheduleIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      {game.scheduleType === "weekly" ? "Weekly" : "Monthly"}:{" "}
                      {getDayLabel(game.scheduledDays, game.scheduleType)}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    Time: {game.scheduledTime}
                  </Typography>

                  <Box mt={2}>
                    <Chip
                      label={game.status}
                      size="small"
                      color={
                        game.status === "active"
                          ? "success"
                          : game.status === "scheduled"
                            ? "info"
                            : "default"
                      }
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Game Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>{editGameId ? "Edit Game" : "Create New Game"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
            <TextField
              label="Game Name"
              fullWidth
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Select Teams</InputLabel>
              <Select
                multiple
                value={selectedGroupIds}
                onChange={(e) =>
                  setSelectedGroupIds(e.target.value as string[])
                }
                input={<OutlinedInput label="Select Teams" />}
                disabled={!!editGameId}
                renderValue={(selected) =>
                  selected
                    .map(
                      (id) => groups.find((g) => g._id === id)?.groupName || "",
                    )
                    .join(", ")
                }
              >
                {groups.map((group) => (
                  <MenuItem key={group._id} value={group._id}>
                    <Checkbox checked={selectedGroupIds.includes(group._id)} />
                    <ListItemText primary={group.groupName} />
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>
                Select one or more teams for this game
              </FormHelperText>
            </FormControl>

            <FormControl fullWidth required>
              <InputLabel>Game Template</InputLabel>
              <Select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                label="Game Template"
                disabled={!!editGameId}
              >
                {templates.map((template) => (
                  <MenuItem key={template._id} value={template._id}>
                    {template.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <Typography variant="subtitle2" gutterBottom>
                Schedule Type
              </Typography>
              <ToggleButtonGroup
                value={scheduleType}
                exclusive
                onChange={(_, value) => {
                  if (value) {
                    setScheduleType(value);
                    setSelectedDays([]);
                  }
                }}
                fullWidth
              >
                <ToggleButton value="weekly">Weekly</ToggleButton>
                <ToggleButton value="monthly">Monthly</ToggleButton>
              </ToggleButtonGroup>
            </FormControl>

            <FormControl fullWidth required>
              <Typography variant="subtitle2" gutterBottom>
                {scheduleType === "weekly" ? "Select Days" : "Select Dates"}
              </Typography>
              {scheduleType === "weekly" ? (
                <ToggleButtonGroup
                  value={selectedDays}
                  onChange={(_, value) => setSelectedDays(value)}
                  sx={{ flexWrap: "wrap" }}
                >
                  {WEEKDAYS.map((day) => (
                    <ToggleButton
                      key={day.value}
                      value={day.value}
                      sx={{ flex: "1 1 14%" }}
                    >
                      {day.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              ) : (
                <ToggleButtonGroup
                  value={selectedDays}
                  onChange={(_, value) => setSelectedDays(value)}
                  sx={{ flexWrap: "wrap" }}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <ToggleButton
                      key={day}
                      value={day}
                      sx={{ flex: "0 0 14%", minWidth: 40 }}
                    >
                      {day}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}
              <FormHelperText>
                {selectedDays.length > 0
                  ? `Selected: ${selectedDays.length} ${scheduleType === "weekly" ? "days" : "dates"
                  }`
                  : "Please select at least one"}
              </FormHelperText>
            </FormControl>

            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Scheduled Time"
                type="time"
                fullWidth
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />

              <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                <TextField
                  label="Freq (Hours)"
                  type="number"
                  fullWidth
                  value={frequencyHours}
                  onChange={(e) => setFrequencyHours(e.target.value ? Number(e.target.value) : "")}
                  inputProps={{ min: 0 }}
                  helperText="Optional"
                />
                <TextField
                  label="Freq (Minutes)"
                  type="number"
                  fullWidth
                  value={frequencyMinutes}
                  onChange={(e) => setFrequencyMinutes(e.target.value ? Number(e.target.value) : "")}
                  inputProps={{ min: 0, max: 59 }}
                  helperText="Optional"
                />
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            setEditGameId(null);
            setEditGroupId(null);
            setGameName("");
            setSelectedTemplateId("");
            setSelectedGroupIds([]);
            setScheduleType("weekly");
            setSelectedDays([]);
            setScheduledTime("09:00");
            setFrequencyHours("");
            setFrequencyMinutes("");
          }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateOrEditGame}
            disabled={
              creating ||
              updating ||
              !gameName.trim() ||
              !selectedTemplateId ||
              selectedGroupIds.length === 0 ||
              selectedDays.length === 0
            }
          >
            {creating || updating ? "Saving..." : editGameId ? "Save Changes" : "Create Game"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
