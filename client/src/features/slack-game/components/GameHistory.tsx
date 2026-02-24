import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Box,
  Chip,
  TablePagination,
} from "@mui/material";
import { History } from "@mui/icons-material";
import { useState } from "react";
import { useGetGameHistoryQuery } from "../api/slackGameApi";
import { useWorkspace } from "@/contexts/OrganizationContext";

import { useParams } from "react-router-dom";

export const GameHistory = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const { workspaceId: urlWorkspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = urlWorkspaceId || currentWorkspace?._id;

  const { data, isLoading, error } = useGetGameHistoryQuery(
    {
      workspaceId: workspaceId || "",
      page: page + 1,
      limit: rowsPerPage,
    },
    {
      skip: !workspaceId,
    },
  );

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "pending":
        return "warning";
      case "failed":
        return "error";
      default:
        return "default";
    }
  };

  if (isLoading) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
          display="flex"
          alignItems="center"
          gap={1}
        >
          <History /> Game History
        </Typography>
        <Typography color="text.secondary">Loading...</Typography>
      </Paper>
    );
  }

  if (error || !data) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
          display="flex"
          alignItems="center"
          gap={1}
        >
          <History /> Game History
        </Typography>
        <Typography color="error">Failed to load history</Typography>
      </Paper>
    );
  }

  if (data.games.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography
          variant="h6"
          gutterBottom
          display="flex"
          alignItems="center"
          gap={1}
        >
          <History /> Game History
        </Typography>
        <Typography color="text.secondary">No games yet</Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "grey.200",
        background: "linear-gradient(135deg, #FFFFFF 0%, #FAF9F7 100%)",
        overflow: "hidden",
      }}
    >
      <Box
        p={3}
        pb={2}
        sx={{
          borderBottom: "1px solid",
          borderColor: "grey.200",
          background: "linear-gradient(135deg, #FFF7F0 0%, #FFFFFF 100%)",
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: "secondary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <History sx={{ fontSize: 20, color: "white" }} />
          </Box>
          <Typography variant="h6" fontWeight="bold" color="text.primary">
            Game History
          </Typography>
        </Box>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Workspace</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Messages
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Responses
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>
                Response Rate
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.games.map((game) => {
              const responseRate =
                game.messagesSent > 0
                  ? (
                    (game.responsesReceived / game.messagesSent) *
                    100
                  ).toFixed(0)
                  : 0;

              return (
                <TableRow
                  key={game._id}
                  sx={{
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "grey.50",
                    },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {new Date(game.date).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      color="text.primary"
                    >
                      {game.workspaceName}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>
                      {game.messagesSent}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>
                      {game.responsesReceived}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${responseRate}%`}
                      size="small"
                      color={Number(responseRate) >= 70 ? "success" : "default"}
                      variant="outlined"
                      sx={{ fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={game.status}
                      size="small"
                      color={getStatusColor(game.status)}
                      sx={{ fontWeight: 500 }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 20]}
        component="div"
        count={data.pagination.total}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};
