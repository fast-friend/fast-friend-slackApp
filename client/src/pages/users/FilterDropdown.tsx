import { useState, useEffect, useRef, type MouseEvent } from "react";
import {
  Box,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  Typography,
  Divider,
  Badge,
} from "@mui/material";
import { FilterList as FilterListIcon } from "@mui/icons-material";
import FFButton from "@/components/ui/FFButton";

export interface FilterValues {
  status: string[];
  role: string[];
  teams: string[];
  avatarSource: string[];
}

interface FilterDropdownProps {
  availableRoles: string[];
  availableTeams: string[];
  availableAvatarSources: string[];
  activeFilters: FilterValues;
  onApplyFilters: (filters: FilterValues) => void;
  activeCount: number;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

export const FilterDropdown = ({
  availableRoles,
  availableTeams,
  availableAvatarSources,
  activeFilters,
  onApplyFilters,
  activeCount,
}: FilterDropdownProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuPaperRef = useRef<HTMLDivElement | null>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleToggle = (category: keyof FilterValues, value: string) => {
    const current = activeFilters[category];
    const isSelected = current.includes(value);

    const newFilters = {
      ...activeFilters,
      [category]: isSelected
        ? current.filter((v) => v !== value)
        : [...current, value],
    };

    onApplyFilters(newFilters);
  };

  // Close the floating menu when page scrolls to avoid detached/sticky positioning.
  useEffect(() => {
    if (!open) return;

    const handleWindowScroll = (event: Event) => {
      const target = event.target as Node | null;

      // Keep menu open when the user scrolls inside the dropdown panel.
      if (target && menuPaperRef.current?.contains(target)) {
        return;
      }

      setAnchorEl(null);
    };

    window.addEventListener("scroll", handleWindowScroll, true);
    return () => window.removeEventListener("scroll", handleWindowScroll, true);
  }, [open]);

  return (
    <>
      <Badge badgeContent={activeCount} color="primary">
        <FFButton
          variant="secondary"
          onClick={handleClick}
          iconLeft={<FilterListIcon sx={{ fontSize: 18 }} />}
        >
          Filters
        </FFButton>
      </Badge>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{
          ref: menuPaperRef,
          sx: {
            minWidth: 260,
            maxWidth: 290,
            maxHeight: 440,
            mt: 1,
            p: 0.5,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0px 8px 20px rgba(16, 24, 40, 0.12)",
          },
        }}
      >
        {/* Status Section */}
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography
            variant="caption"
            fontWeight="700"
            color="text.primary"
            sx={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
          >
            Status
          </Typography>
        </Box>
        {STATUS_OPTIONS.map((option) => (
          <MenuItem
            key={option.value}
            sx={{ py: 0.25, borderRadius: 1, px: 0.5 }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={activeFilters.status.includes(option.value)}
                  onChange={() => handleToggle("status", option.value)}
                  size="small"
                />
              }
              label={option.label}
              sx={{ width: "100%", m: 0, cursor: "pointer" }}
            />
          </MenuItem>
        ))}

        <Divider sx={{ my: 0.5 }} />

        {/* Avatar Source Section */}
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography
            variant="caption"
            fontWeight="700"
            color="text.primary"
            sx={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
          >
            Avatar Source
          </Typography>
        </Box>
        {availableAvatarSources.length > 0 ? (
          availableAvatarSources.map((source) => (
            <MenuItem key={source} sx={{ py: 0.25, borderRadius: 1, px: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={activeFilters.avatarSource.includes(source)}
                    onChange={() => handleToggle("avatarSource", source)}
                    size="small"
                  />
                }
                label={source}
                sx={{ width: "100%", m: 0, cursor: "pointer" }}
              />
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>
            <Typography variant="caption" color="text.secondary">
              No avatar sources available
            </Typography>
          </MenuItem>
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* Role Section */}
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography
            variant="caption"
            fontWeight="700"
            color="text.primary"
            sx={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
          >
            Role
          </Typography>
        </Box>
        {availableRoles.length > 0 ? (
          availableRoles.map((role) => (
            <MenuItem key={role} sx={{ py: 0.25, borderRadius: 1, px: 0.5 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={activeFilters.role.includes(role)}
                    onChange={() => handleToggle("role", role)}
                    size="small"
                  />
                }
                label={role}
                sx={{ width: "100%", m: 0, cursor: "pointer" }}
              />
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>
            <Typography variant="caption" color="text.secondary">
              No roles available
            </Typography>
          </MenuItem>
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* Teams Section */}
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography
            variant="caption"
            fontWeight="700"
            color="text.primary"
            sx={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
          >
            Decks
          </Typography>
        </Box>
        {availableTeams.length > 0 ? (
          <Box sx={{ maxHeight: 150, overflowY: "auto" }}>
            {availableTeams.map((team) => (
              <MenuItem key={team} sx={{ py: 0.25, borderRadius: 1, px: 0.5 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={activeFilters.teams.includes(team)}
                      onChange={() => handleToggle("teams", team)}
                      size="small"
                    />
                  }
                  label={team}
                  sx={{ width: "100%", m: 0, cursor: "pointer" }}
                />
              </MenuItem>
            ))}
          </Box>
        ) : (
          <MenuItem disabled>
            <Typography variant="caption" color="text.secondary">
              No decks available
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};
