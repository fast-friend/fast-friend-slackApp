import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
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

const UsersPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState<string | null>(null);

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

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user: ISlackUser) =>
        user.real_name?.toLowerCase().includes(query) ||
        user.name?.toLowerCase().includes(query) ||
        user.profile?.email?.toLowerCase().includes(query),
    );
  }, [users, searchQuery]);

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
            <Typography variant="body2" fontWeight="600">
              {value || row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              @{row.name}
            </Typography>
          </Box>
        </Box>
      ),
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
      label: "Teams",
      type: "chips",
      render: (_value: any, row: ISlackUser) => {
        const teams = row.teams || [];

        if (teams.length === 0) {
          return (
            <Typography variant="caption" color="text.secondary">
              No teams
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
      <Box mb={4}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
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
              <FFButton
                variant="primary"
                onClick={() => setCsvModalOpen(true)}
                iconLeft={<UploadFileIcon sx={{ fontSize: 18 }} />}
              >
                Upload CSV
              </FFButton>
            </Box>
          )}
        </Box>
        <Typography variant="body1" color="text.secondary">
          {currentWorkspace?.teamName || "Manage all users in this workspace"}
        </Typography>
      </Box>

      {/* Search */}
      <Box mb={3} display="flex" alignItems="center" gap={1}>
        <SearchIcon sx={{ color: "text.secondary" }} />
        <FFInputField
          placeholder="Search users by name, username, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: "100%" }}
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
