import { Box, Chip } from "@mui/material";
import type { FilterValues } from "./FilterDropdown";

interface FilterChipsProps {
  activeFilters: FilterValues;
  onRemoveFilter: (category: keyof FilterValues, value: string) => void;
}

const FILTER_LABELS: Record<keyof FilterValues, string> = {
  status: "Status",
  avatarSource: "Avatar",
  role: "Role",
  teams: "Deck",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
};

export const FilterChips = ({
  activeFilters,
  onRemoveFilter,
}: FilterChipsProps) => {
  const hasActiveFilters =
    activeFilters.status.length > 0 ||
    activeFilters.avatarSource.length > 0 ||
    activeFilters.role.length > 0 ||
    activeFilters.teams.length > 0;

  if (!hasActiveFilters) {
    return null;
  }

  const getChipLabel = (category: keyof FilterValues, value: string) => {
    const prefix = FILTER_LABELS[category];
    let displayValue = value;

    // Map status values to proper labels
    if (category === "status" && STATUS_LABELS[value]) {
      displayValue = STATUS_LABELS[value];
    }

    return `${prefix}: ${displayValue}`;
  };

  return (
    <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
      {/* Status Chips */}
      {activeFilters.status.map((value) => (
        <Chip
          key={`status-${value}`}
          label={getChipLabel("status", value)}
          onDelete={() => onRemoveFilter("status", value)}
          size="small"
          sx={{
            height: 28,
            fontSize: "0.8125rem",
            fontWeight: 500,
            bgcolor: "primary.lighter",
            color: "primary.main",
            "& .MuiChip-deleteIcon": {
              color: "primary.main",
              "&:hover": {
                color: "primary.dark",
              },
            },
          }}
        />
      ))}

      {/* Role Chips */}
      {activeFilters.avatarSource.map((value) => (
        <Chip
          key={`avatarSource-${value}`}
          label={getChipLabel("avatarSource", value)}
          onDelete={() => onRemoveFilter("avatarSource", value)}
          size="small"
          sx={{
            height: 28,
            fontSize: "0.8125rem",
            fontWeight: 500,
            bgcolor: "primary.lighter",
            color: "primary.main",
            "& .MuiChip-deleteIcon": {
              color: "primary.main",
              "&:hover": {
                color: "primary.dark",
              },
            },
          }}
        />
      ))}

      {/* Role Chips */}
      {activeFilters.role.map((value) => (
        <Chip
          key={`role-${value}`}
          label={getChipLabel("role", value)}
          onDelete={() => onRemoveFilter("role", value)}
          size="small"
          sx={{
            height: 28,
            fontSize: "0.8125rem",
            fontWeight: 500,
            bgcolor: "primary.lighter",
            color: "primary.main",
            "& .MuiChip-deleteIcon": {
              color: "primary.main",
              "&:hover": {
                color: "primary.dark",
              },
            },
          }}
        />
      ))}

      {/* Team Chips */}
      {activeFilters.teams.map((value) => (
        <Chip
          key={`teams-${value}`}
          label={getChipLabel("teams", value)}
          onDelete={() => onRemoveFilter("teams", value)}
          size="small"
          sx={{
            height: 28,
            fontSize: "0.8125rem",
            fontWeight: 500,
            bgcolor: "primary.lighter",
            color: "primary.main",
            "& .MuiChip-deleteIcon": {
              color: "primary.main",
              "&:hover": {
                color: "primary.dark",
              },
            },
          }}
        />
      ))}
    </Box>
  );
};
