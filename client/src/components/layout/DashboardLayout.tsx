import { useState, useEffect } from "react";
import { Box, Toolbar } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar, { DRAWER_WIDTH } from "./Sidebar";
import Header from "./Header";
import { fixScrollIfNeeded } from "@/utils/debugScroll";

const DashboardLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Fix scroll issues on route changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fixScrollIfNeeded();
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <Box sx={{ display: "flex" }}>
      <Header onMenuClick={handleDrawerToggle} />
      <Sidebar mobileOpen={mobileOpen} onMobileClose={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default DashboardLayout;
