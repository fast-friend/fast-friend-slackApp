import { Typography, Box } from "@mui/material";
import { useParams } from "react-router-dom";

const ReportsPage = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  return (
    <Box>
      <Typography variant="h4">Reports</Typography>
      <Typography variant="body1">Workspace ID: {workspaceId}</Typography>
    </Box>
  );
};

export default ReportsPage;
