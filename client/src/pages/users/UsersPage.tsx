import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  Container,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  Snackbar,
} from "@mui/material";
import {
  Search as SearchIcon,
  People as PeopleIcon,
  UploadFile as UploadFileIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import {
  useGetWorkspaceUsersQuery,
  useRefreshWorkspaceUsersMutation,
} from "@/features/slack/api/slackApi";
import { useWorkspace } from "@/contexts/OrganizationContext";
import { FFInputField } from "@/components/ui/FFInputField";
import { FFTable } from "@/components/ui/FFTable";
import FFButton from "@/components/ui/FFButton";
import type { TableColumn } from "@/components/ui/FFTable";
import type { ISlackUser } from "@/features/slack/types/slack.types";
import { CsvUploadModal } from "./CsvUploadModal";
import Avatar from "@mui/material/Avatar";
import { FilterDropdown, type FilterValues } from "./FilterDropdown";
import { FilterChips } from "./FilterChips";

/** Avatar that falls back to MUI initials — no infinite onError loop */
const UserAvatar = ({ src, name }: { src?: string; name?: string }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const initials = (name || "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  if (!src || imgFailed) {
    return (
      <Avatar
        sx={{
          width: 36,
          height: 36,
          fontSize: 14,
          fontWeight: 700,
          border: "2px solid",
          borderColor: "divider",
          bgcolor: "primary.main",
        }}
      >
        {initials}
      </Avatar>
    );
  }

  return (
    <Box
      component="img"
      src={src}
      alt={name}
      onError={() => setImgFailed(true)}
      sx={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        objectFit: "cover",
        border: "2px solid",
        borderColor: "divider",
      }}
    />
  );
};

const REFRESH_COOLDOWN_SECONDS = 60;
const REFRESH_LS_KEY = "ff_users_last_refresh";

type AvatarSourceLabel =
  | "Onboarding Upload"
  | "Slack Profile Photo"
  | "Slack Default Avatar";

const getAvatarSourceLabel = (user: ISlackUser): AvatarSourceLabel => {
  if (user.photoUrl?.trim()) {
    return "Onboarding Upload";
  }

  // Slack-native default indicators (most reliable)
  if (user.is_avatar_default || user.profile?.image_default) {
    return "Slack Default Avatar";
  }

  // Slack default avatars often use a "ge..." avatar hash.
  const avatarHash = user.profile?.avatar_hash?.trim().toLowerCase();
  if (avatarHash?.startsWith("ge")) {
    return "Slack Default Avatar";
  }

  const avatarUrl = user.profile?.image_72?.trim() || "";

  if (!avatarUrl) {
    return "Slack Default Avatar";
  }

  // Slack system/default avatars and fallback avatar URLs.
  if (
    /^https?:\/\/(?:a|ca)\.slack-edge\.com\//i.test(avatarUrl) ||
    /^https?:\/\/a\.slack-edge\.com\/\d+\/img\//i.test(avatarUrl) ||
    /\/avatars\/ava_\d+-\d+\.png/i.test(avatarUrl) ||
    /^https?:\/\/secure\.gravatar\.com\/avatar\//i.test(avatarUrl) ||
    /[?&]d=https?%3A%2F%2Fa\.slack-edge\.com%2F/i.test(avatarUrl) ||
    /[?&]d=https?%3A%2F%2F[^&]*slack-edge\.com%2F[^&]*ava_/i.test(avatarUrl)
  ) {
    return "Slack Default Avatar";
  }

  // Only mark as uploaded profile photo if it matches Slack's uploaded-avatar URL format.
  if (
    /^https?:\/\/avatars\.slack-edge\.com\/\d{4}-\d{2}-\d{2}\/[A-Za-z0-9]+_[A-Za-z0-9]+_\d+\.(jpg|jpeg|png|gif|webp)$/i.test(
      avatarUrl,
    )
  ) {
    return "Slack Profile Photo";
  }

  return "Slack Default Avatar";
};

const UsersPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

  // URL params for filters
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parse filters from URL
  const statusFilters = useMemo(
    () => searchParams.get("status")?.split(",").filter(Boolean) || [],
    [searchParams],
  );
  const roleFilters = useMemo(
    () => searchParams.get("role")?.split(",").filter(Boolean) || [],
    [searchParams],
  );
  const avatarSourceFilters = useMemo(
    () => searchParams.get("avatarSource")?.split(",").filter(Boolean) || [],
    [searchParams],
  );
  const teamFilters = useMemo(
    () => searchParams.get("teams")?.split(",").filter(Boolean) || [],
    [searchParams],
  );

  // Restore cooldown from localStorage on mount
  const [refreshCooldown, setRefreshCooldown] = useState<number>(() => {
    const stored = localStorage.getItem(REFRESH_LS_KEY);
    if (!stored) return 0;
    const elapsed = Math.floor((Date.now() - Number(stored)) / 1000);
    const remaining = REFRESH_COOLDOWN_SECONDS - elapsed;
    return remaining > 0 ? remaining : 0;
  });

  // If there's a restored cooldown on mount, start the countdown interval
  const startCooldownInterval = useCallback(() => {
    const interval = setInterval(() => {
      setRefreshCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return interval;
  }, []);

  useEffect(() => {
    if (refreshCooldown > 0) {
      const interval = startCooldownInterval();
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  // Get current workspace from URL or context
  const { workspaceId: urlWorkspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = urlWorkspaceId || currentWorkspace?._id;

  const {
    data: usersResponse,
    isLoading,
    error,
  } = useGetWorkspaceUsersQuery(workspaceId || "", {
    skip: !workspaceId,
  });

  const [refreshWorkspaceUsers, { isLoading: isRefreshing }] =
    useRefreshWorkspaceUsersMutation();

  const users = usersResponse?.data?.users || [];

  // Extract unique roles and teams for filter options
  const availableRoles = useMemo(() => {
    const roles = users.map((u: ISlackUser) => u.role || "Member");
    return [...new Set(roles)].sort();
  }, [users]);

  const availableTeams = useMemo(() => {
    const teams = users.flatMap((u: ISlackUser) => u.teams || []);
    return [...new Set(teams)].sort();
  }, [users]);

  const availableAvatarSources = useMemo(() => {
    const sources = users.map((u: ISlackUser) => getAvatarSourceLabel(u));
    return [...new Set(sources)].sort();
  }, [users]);

  // Filter users by search and filters
  const filteredUsers = useMemo(() => {
    let result = users;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user: ISlackUser) =>
          user.real_name?.toLowerCase().includes(query) ||
          user.name?.toLowerCase().includes(query) ||
          user.profile?.email?.toLowerCase().includes(query),
      );
    }

    // Apply status filter (only if not both selected)
    if (statusFilters.length > 0 && statusFilters.length < 2) {
      result = result.filter((user: ISlackUser) => {
        const isPending = !user.onboardingCompleted;
        const userStatus = isPending ? "pending" : "completed";
        return statusFilters.includes(userStatus);
      });
    }

    // Apply role filter (OR - match any selected role)
    if (roleFilters.length > 0) {
      result = result.filter((user: ISlackUser) =>
        roleFilters.includes(user.role || "Member"),
      );
    }

    // Apply avatar source filter (OR - match any selected source)
    if (avatarSourceFilters.length > 0) {
      result = result.filter((user: ISlackUser) =>
        avatarSourceFilters.includes(getAvatarSourceLabel(user)),
      );
    }

    // Apply teams filter (OR - match any selected team)
    if (teamFilters.length > 0) {
      result = result.filter((user: ISlackUser) =>
        user.teams?.some((team) => teamFilters.includes(team)),
      );
    }

    return result;
  }, [
    users,
    searchQuery,
    statusFilters,
    roleFilters,
    avatarSourceFilters,
    teamFilters,
  ]);

  const handleRefresh = useCallback(async () => {
    if (!workspaceId || refreshCooldown > 0 || isRefreshing) return;

    try {
      await refreshWorkspaceUsers(workspaceId).unwrap();
      setSnackbarMsg("Employee list refreshed from Slack!");
    } catch (err: any) {
      setSnackbarMsg(err?.data?.message || "Failed to refresh. Try again.");
    }

    // Persist timestamp so cooldown survives page refresh
    localStorage.setItem(REFRESH_LS_KEY, String(Date.now()));

    // Start 60-second cooldown
    setRefreshCooldown(REFRESH_COOLDOWN_SECONDS);
    const interval = setInterval(() => {
      setRefreshCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [workspaceId, refreshCooldown, isRefreshing, refreshWorkspaceUsers]);

  // Handle filter changes
  const handleApplyFilters = useCallback(
    (filters: FilterValues) => {
      const params = new URLSearchParams();
      if (filters.status.length) params.set("status", filters.status.join(","));
      if (filters.avatarSource.length) {
        params.set("avatarSource", filters.avatarSource.join(","));
      }
      if (filters.role.length) params.set("role", filters.role.join(","));
      if (filters.teams.length) params.set("teams", filters.teams.join(","));
      navigate(`?${params.toString()}`, { replace: true });
    },
    [navigate],
  );

  const handleRemoveFilter = useCallback(
    (category: keyof FilterValues, value: string) => {
      const params = new URLSearchParams(searchParams);

      const currentValues = params.get(category)?.split(",") || [];
      const newValues = currentValues.filter((v) => v !== value);

      if (newValues.length > 0) {
        params.set(category, newValues.join(","));
      } else {
        params.delete(category);
      }

      navigate(`?${params.toString()}`, { replace: true });
    },
    [searchParams, navigate],
  );

  // Active filter state for components
  const activeFilters: FilterValues = useMemo(
    () => ({
      status: statusFilters,
      avatarSource: avatarSourceFilters,
      role: roleFilters,
      teams: teamFilters,
    }),
    [statusFilters, avatarSourceFilters, roleFilters, teamFilters],
  );

  const activeFilterCount = useMemo(
    () =>
      statusFilters.length +
      avatarSourceFilters.length +
      roleFilters.length +
      teamFilters.length,
    [statusFilters, avatarSourceFilters, roleFilters, teamFilters],
  );

  // Define table columns
  const columns: TableColumn<ISlackUser>[] = [
    {
      key: "real_name",
      label: "Name",
      type: "name-with-avatar",
      avatarKey: "profile.image_72",
      render: (value: any, row: ISlackUser) => (
        <Box display="flex" alignItems="center" gap={1.5}>
          <UserAvatar
            src={row.photoUrl || row.profile?.image_72}
            name={row.real_name || row.name}
          />
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" fontWeight="600">
                {value || row.name}
              </Typography>
              <Chip
                label={row.onboardingCompleted ? "Completed" : "Pending"}
                size="small"
                color={row.onboardingCompleted ? "success" : "warning"}
                variant="outlined"
                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 600 }}
              />
            </Box>
            <Typography variant="caption" color="text.secondary">
              @{row.name}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: "avatarSource",
      label: "Avatar Source",
      type: "text",
      render: (_value: any, row: ISlackUser) => {
        const source = getAvatarSourceLabel(row);
        const color =
          source === "Onboarding Upload"
            ? "success"
            : source === "Slack Profile Photo"
              ? "primary"
              : "default";

        return (
          <Chip
            label={source}
            size="small"
            color={color}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        );
      },
    },
    {
      key: "role",
      label: "Role",
      type: "text",
      render: (_value: any, row: ISlackUser) => (
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            color: "primary.main",
          }}
        >
          <Typography variant="caption" fontWeight="600">
            {row.role || "Member"}
          </Typography>
        </Box>
      ),
    },
    {
      key: "teams",
      label: "Decks",
      type: "chips",
      render: (_value: any, row: ISlackUser) => {
        const teams = row.teams || [];

        if (teams.length === 0) {
          return (
            <Typography variant="caption" color="text.secondary">
              No decks
            </Typography>
          );
        }

        return (
          <Box display="flex" gap={0.5} flexWrap="wrap">
            {teams.slice(0, 3).map((teamName, index) => (
              <Chip
                key={index}
                label={teamName}
                size="small"
                sx={{
                  height: 24,
                  fontSize: "0.75rem",
                  bgcolor: "primary.light",
                  color: "#FFF",
                  fontWeight: 500,
                }}
              />
            ))}
            {teams.length > 3 && (
              <Chip
                label={`+${teams.length - 3}`}
                size="small"
                sx={{
                  height: 24,
                  fontSize: "0.75rem",
                  bgcolor: "grey.200",
                  color: "text.secondary",
                  fontWeight: 500,
                }}
              />
            )}
          </Box>
        );
      },
    },
    {
      key: "gamesPlayed",
      label: "Games Played",
      type: "number",
      render: (_value: any, row: ISlackUser) => (
        <Typography variant="body2" fontWeight="600">
          {row.gamesPlayed ?? 0}
        </Typography>
      ),
    },
    {
      key: "accuracy",
      label: "Accuracy",
      type: "text",
      render: (_value: any, row: ISlackUser) => {
        const accuracy = Math.round(row.accuracy ?? 0);
        const color =
          accuracy >= 80
            ? "success.main"
            : accuracy >= 60
              ? "warning.main"
              : "error.main";

        return (
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" fontWeight="600" color={color}>
              {accuracy}%
            </Typography>
            <Box
              sx={{
                width: 60,
                height: 6,
                bgcolor: "grey.200",
                borderRadius: 1,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  width: `${accuracy}%`,
                  height: "100%",
                  bgcolor: color,
                }}
              />
            </Box>
          </Box>
        );
      },
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box id="walkthrough-users-overview" mb={4}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          mb={1}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <PeopleIcon sx={{ fontSize: 32, color: "primary.main" }} />
            <Typography variant="h4" fontWeight="700">
              Workspace Users
            </Typography>
          </Box>
          {workspaceId && (
            <Box display="flex" gap={1.5} alignItems="center">
              {/* Refresh button with 60s cooldown */}
              <Tooltip
                title={
                  refreshCooldown > 0
                    ? `Wait ${refreshCooldown}s before refreshing again`
                    : "Refresh user list from Slack"
                }
              >
                <span>
                  <FFButton
                    variant="secondary"
                    onClick={handleRefresh}
                    disabled={refreshCooldown > 0 || isRefreshing}
                    loading={isRefreshing}
                    iconLeft={
                      !isRefreshing ? (
                        <RefreshIcon sx={{ fontSize: 18 }} />
                      ) : undefined
                    }
                  >
                    {refreshCooldown > 0 ? `${refreshCooldown}s` : "Refresh"}
                  </FFButton>
                </span>
              </Tooltip>

              {/* Upload CSV */}
              <Box>
                <FFButton
                  variant="primary"
                  onClick={() => setCsvModalOpen(true)}
                  iconLeft={<UploadFileIcon sx={{ fontSize: 18 }} />}
                >
                  Upload CSV
                </FFButton>
              </Box>
            </Box>
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          {currentWorkspace?.teamName || "Manage all users in this workspace"}
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Box mb={3}>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <SearchIcon sx={{ color: "text.secondary" }} />
          <FFInputField
            placeholder="Search users by name, username, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <FilterDropdown
            availableRoles={availableRoles}
            availableTeams={availableTeams}
            availableAvatarSources={availableAvatarSources}
            activeFilters={activeFilters}
            onApplyFilters={handleApplyFilters}
            activeCount={activeFilterCount}
          />
        </Box>

        {/* Active Filter Chips */}
        <FilterChips
          activeFilters={activeFilters}
          onRemoveFilter={handleRemoveFilter}
        />
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {(() => {
            const errorData = error as any;
            const status = errorData?.status || errorData?.originalStatus;
            const message = errorData?.data?.message || errorData?.error;

            if (status === 429) {
              return (
                message ||
                "Slack API rate limit exceeded. Please wait a moment and try again."
              );
            }
            return (
              message || "Failed to load workspace users. Please try again."
            );
          })()}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Box display="flex" justifyContent="center" py={8}>
          <CircularProgress />
        </Box>
      )}

      {/* No Workspace */}
      {!workspaceId && !isLoading && (
        <Alert severity="info">
          Please select or connect a workspace to view users.
        </Alert>
      )}

      {/* Table */}
      {!isLoading && !error && workspaceId && (
        <Box>
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary">
              Showing {filteredUsers.length} of {users.length} users
            </Typography>
          </Box>
          <FFTable
            columns={columns}
            data={filteredUsers}
            rowKey="id"
            emptyText="No users found in this workspace"
            pageSize={20}
          />
        </Box>
      )}

      {/* CSV Upload Modal */}
      {workspaceId && (
        <CsvUploadModal
          open={csvModalOpen}
          onClose={() => setCsvModalOpen(false)}
          workspaceId={workspaceId}
        />
      )}

      {/* Snackbar feedback */}
      <Snackbar
        open={!!snackbarMsg}
        autoHideDuration={4000}
        onClose={() => setSnackbarMsg(null)}
        message={snackbarMsg}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Container>
  );
};

export default UsersPage;
