import {
  AppBar,
  Box,
  IconButton,
  Toolbar,
  Typography,
} from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import { useWorkspace } from "@/contexts/OrganizationContext";
import { WorkspaceSelector } from "@/components/OrganizationSelector";
import { DRAWER_WIDTH } from "./Sidebar";

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { organization } = useWorkspace();

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        ml: { md: `${DRAWER_WIDTH}px` },
        bgcolor: "background.paper",
        color: "text.primary",
        boxShadow: "0 1px 0 rgba(150, 255, 67, 0.1)",
        borderBottom: "1px solid",
        borderColor: "divider",
        borderRadius: 0,
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2, display: { md: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ flexGrow: 1, fontWeight: 700, color: "text.primary" }}
        >
          {organization?.name || "Organization"}
        </Typography>

        {/* Workspace Selector */}
        <Box>
          <WorkspaceSelector />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
