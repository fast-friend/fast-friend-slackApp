import { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  FormHelperText,
  Button,
} from "@mui/material";
import { Add, Delete, Edit, Schedule } from "@mui/icons-material";
import {
  useGetGamesQuery,
  useCreateGameMutation,
  useUpdateGameMutation,
  useDeleteGameMutation,
} from "../api/gamesApi";
import { useGetGameTemplatesQuery } from "../api/gameTemplatesApi";
import type { Group } from "../types/groups.types";
import type { Game } from "../types/games.types";
import FFButton from "@/components/ui/FFButton";

interface GamesTabProps {
  group: Group;
}

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export const GamesTab = ({ group }: GamesTabProps) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editGameId, setEditGameId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [gameName, setGameName] = useState("");
  const [scheduleType, setScheduleType] = useState<"weekly" | "monthly">("weekly");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [frequencyHours, setFrequencyHours] = useState<number | "">("");
  const [frequencyMinutes, setFrequencyMinutes] = useState<number | "">("");

  const { data: games = [], isLoading } = useGetGamesQuery({
    workspaceId: group.workspaceId,
    groupId: group._id,
  });
  const { data: templates = [] } = useGetGameTemplatesQuery(group.workspaceId);
  const [createGame, { isLoading: creating }] = useCreateGameMutation();
  const [updateGame, { isLoading: updating }] = useUpdateGameMutation();
  const [deleteGame, { isLoading: deleting }] = useDeleteGameMutation();

  const resetForm = () => {
    setCreateDialogOpen(false);
    setEditGameId(null);
    setGameName("");
    setSelectedTemplateId("");
    setScheduleType("weekly");
    setSelectedDays([]);
    setScheduledTime("09:00");
    setFrequencyHours("");
    setFrequencyMinutes("");
  };

  const handleEditClick = (game: Game) => {
    setEditGameId(game._id);
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
    if (!gameName.trim() || !selectedTemplateId || selectedDays.length === 0) return;

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

      if (editGameId) {
        await updateGame({
          workspaceId: group.workspaceId,
          groupId: group._id,
          gameId: editGameId,
          data: payload as any,
        }).unwrap();
      } else {
        await createGame({
          workspaceId: group.workspaceId,
          groupId: group._id,
          data: payload as any,
        }).unwrap();
      }

      resetForm();
    } catch (error) {
      console.error("Failed to save game:", error);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!window.confirm("Are you sure you want to delete this game?")) return;
    try {
      await deleteGame({ workspaceId: group.workspaceId, groupId: group._id, gameId }).unwrap();
    } catch (error) {
      console.error("Failed to delete game:", error);
    }
  };

  const getDayLabel = (days: number[], type: "weekly" | "monthly") => {
    if (type === "weekly") {
      return days.map((d) => WEEKDAYS.find((wd) => wd.value === d)?.label).join(", ");
    }
    return days.map((d) => `${d}`).join(", ");
  };

  const getStatusColor = (status: Game["status"]) => {
    switch (status) {
      case "scheduled": return "info";
      case "active": return "success";
      case "completed": return "default";
      case "cancelled": return "error";
      default: return "default";
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Games ({games.length})</Typography>
        <FFButton
          variant="primary"
          onClick={() => setCreateDialogOpen(true)}
          iconLeft={<Add sx={{ fontSize: 20 }} />}
        >
          Create Game
        </FFButton>
      </Box>

      {/* Games List */}
      {isLoading ? (
        <Typography>Loading games...</Typography>
      ) : games.length === 0 ? (
        <Alert severity="info">No games scheduled yet. Create a game to get started!</Alert>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {games.map((game) => (
            <Paper key={game._id} sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                    <Typography variant="h6">{game.gameName}</Typography>
                    <Chip label={game.status} color={getStatusColor(game.status)} size="small" />
                  </Box>
                  {game.scheduledDays?.length > 0 && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "text.secondary" }}>
                      <Schedule fontSize="small" />
                      <Typography variant="body2">
                        {getDayLabel(game.scheduledDays, game.scheduleType)} at {game.scheduledTime}
                      </Typography>
                    </Box>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                    Created {new Date(game.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <IconButton color="primary" onClick={() => handleEditClick(game)} disabled={deleting}>
                    <Edit />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDeleteGame(game._id)} disabled={deleting}>
                    <Delete />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Create / Edit Game Dialog — matches GamesPage style */}
      <Dialog
        open={createDialogOpen}
        onClose={resetForm}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle>{editGameId ? "Edit Game" : "Create New Game"}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
            {/* Game Name */}
            <TextField
              label="Game Name"
              fullWidth
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              required
            />

            {/* Template selector — dropdown, same as GamesPage */}
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

            {/* Schedule Type */}
            <FormControl fullWidth>
              <Typography variant="subtitle2" gutterBottom>Schedule Type</Typography>
              <ToggleButtonGroup
                value={scheduleType}
                exclusive
                onChange={(_, value) => {
                  if (value) { setScheduleType(value); setSelectedDays([]); }
                }}
                fullWidth
              >
                <ToggleButton value="weekly">Weekly</ToggleButton>
                <ToggleButton value="monthly">Monthly</ToggleButton>
              </ToggleButtonGroup>
            </FormControl>

            {/* Day Selection */}
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
                    <ToggleButton key={day.value} value={day.value} sx={{ flex: "1 1 14%" }}>
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
                    <ToggleButton key={day} value={day} sx={{ flex: "0 0 14%", minWidth: 40 }}>
                      {day}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}
              <FormHelperText>
                {selectedDays.length > 0
                  ? `Selected: ${selectedDays.length} ${scheduleType === "weekly" ? "days" : "dates"}`
                  : "Please select at least one"}
              </FormHelperText>
            </FormControl>

            {/* Time + Frequency */}
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
              <Box sx={{ display: "flex", gap: 1, width: "100%" }}>
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
          <Button onClick={resetForm} disabled={creating || updating}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateOrEditGame}
            disabled={
              creating ||
              updating ||
              !gameName.trim() ||
              !selectedTemplateId ||
              selectedDays.length === 0
            }
          >
            {creating || updating ? "Saving..." : editGameId ? "Save Changes" : "Create Game"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
