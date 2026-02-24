import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  EmojiEvents as GamesIcon,
  Groups as GroupsIcon,
  Logout as LogoutIcon,
} from "@mui/icons-material";
import Logo from "../../assets/Images/Logo.webp";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useWorkspace } from "@/contexts/OrganizationContext";
import { useAppSelector } from "@/app/hooks";
import { useLogoutMutation } from "@/features/auth/api/authApi";
import { useEffect } from "react";
import { fixScrollIfNeeded } from "@/utils/debugScroll";
// import { SlackGameDashboard } from "@/features/slack-game/pages/SlackGameDashboard";

const DRAWER_WIDTH = 260;

interface SidebarItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const getSidebarItems = (workspaceId: string): SidebarItem[] => [
  {
    label: "Dashboard",
    path: `/workspaces/${workspaceId}/dashboard`,
    icon: <DashboardIcon />,
  },
  {
    label: "Employee",
    path: `/workspaces/${workspaceId}/users`,
    icon: <PeopleIcon />,
  },
  {
    label: "Teams",
    path: `/workspaces/${workspaceId}/groups`,
    icon: <GroupsIcon />,
  },
  {
    label: "Games",
    path: `/workspaces/${workspaceId}/games`,
    icon: <GamesIcon />,
  },
  {
    label: "Settings",
    path: `/workspaces/${workspaceId}/settings`,
    icon: <SettingsIcon />,
  },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { workspaceId: urlWorkspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAppSelector((state) => state.auth);
  const [logout, { isLoading: isLogoutLoading }] = useLogoutMutation();

  const workspaceId = urlWorkspaceId || currentWorkspace?._id || "";
  const sidebarItems = getSidebarItems(workspaceId);

  // Fix scroll when drawer opens/closes
  useEffect(() => {
    if (!mobileOpen) {
      // When drawer closes, ensure scroll is not blocked
      setTimeout(() => {
        fixScrollIfNeeded();
      }, 300); // Wait for drawer close animation
    }
  }, [mobileOpen]);

  const handleLogout = async () => {
    try {
      await logout({}).unwrap();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleNavigation = (path: string) => {
    // Remove focus from the button to prevent aria-hidden conflicts
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Close mobile drawer first
    onMobileClose();

    // Small delay to allow drawer to close before navigation
    // This prevents aria-hidden conflicts during navigation
    setTimeout(() => {
      navigate(path);
    }, 50);
  };

  const drawerContent = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <Toolbar
        sx={{
          borderBottom: "1px solid",
          borderColor: "divider",
          minHeight: "64px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {/* Logo */}
          <Box
            component="img"
            src={Logo}
            alt="Fast Friends"
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              objectFit: "cover",
              border: "1px solid",
              borderColor: "divider",
            }}
          />
          <Typography
            variant="h6"
            noWrap
            fontWeight="bold"
            sx={{ color: "text.primary", fontSize: "16px" }}
          >
            Fast Friends
          </Typography>
        </Box>
      </Toolbar>

      {/* Navigation Items */}
      <List sx={{ px: 2, mt: 2, flexGrow: 1 }}>
        {sidebarItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={isActive}
                onClick={() => handleNavigation(item.path)}
                sx={{
                  borderRadius: "8px",
                  py: 1.2,
                  "&.Mui-selected": {
                    bgcolor: "#E57B2C", // Primary Orange
                    color: "white",
                    "&:hover": {
                      bgcolor: "#C96A21", // Darker Orange
                    },
                    "& .MuiListItemIcon-root": {
                      color: "white",
                    },
                  },
                  "&:not(.Mui-selected)": {
                    color: "text.secondary",
                    "&:hover": {
                      bgcolor: "action.hover",
                      color: "text.primary",
                      "& .MuiListItemIcon-root": {
                        color: "text.primary",
                      },
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? "white" : "text.secondary",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontWeight: 500,
                    fontSize: "15px",
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Footer - User Profile */}
      <Box
        sx={{
          p: 2,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {/* Avatar */}
          <Box
            sx={{
              width: 40,
              height: 40,
              minWidth: 40,
              borderRadius: "50%",
              bgcolor: "#D9C7AC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.primary",
              fontWeight: "bold",
              fontSize: "15px",
              flexShrink: 0,
              overflow: "hidden",
              userSelect: "none",
            }}
          >
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              noWrap
              fontWeight="bold"
              sx={{ color: "text.primary" }}
            >
              {user?.email ? user.email.split("@")[0] : "User"}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ color: "text.secondary", display: "block" }}
            >
              {user?.email}
            </Typography>
          </Box>

          <ListItemButton
            onClick={handleLogout}
            disabled={isLogoutLoading}
            sx={{
              minWidth: "auto",
              p: 1,
              borderRadius: "8px",
              color: "text.secondary",
              "&:hover": { color: "error.main", bgcolor: "error.lighter" },
            }}
          >
            <LogoutIcon fontSize="small" />
          </ListItemButton>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{
          keepMounted: true,
          disableEnforceFocus: true,
        }}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: DRAWER_WIDTH,
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Desktop drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            boxSizing: "border-box",
            width: DRAWER_WIDTH,
            backgroundColor: "#FFFFFF", // Changed background to white
            borderRight: "1px solid", // Ensure border is visible
            borderColor: "divider",
            borderRadius: 0, // Ensure no border radius
          },
        }}
        open
        // Prevent focus issues on permanent drawer
        ModalProps={{
          disableEnforceFocus: true,
        }}
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export { DRAWER_WIDTH };
export default Sidebar;
