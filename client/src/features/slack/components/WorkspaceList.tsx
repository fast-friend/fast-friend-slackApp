import {
    Card,
    CardContent,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemSecondaryAction,
    CircularProgress,
    Alert,
    Chip,
} from "@mui/material";
import { Delete as DeleteIcon, WorkspacesOutlined as SlackIcon } from "@mui/icons-material";
import {
    useGetWorkspacesQuery,
    useDisconnectWorkspaceMutation,
} from "../api/slackApi";
import { useState } from "react";
import WorkspaceDetailsDialog from "./WorkspaceDetailsDialog";
import type { ISlackWorkspace } from "../types/slack.types";

const WorkspaceList = () => {
    const { data, isLoading, error } = useGetWorkspacesQuery();
    const [disconnectWorkspace, { isLoading: isDisconnecting }] =
        useDisconnectWorkspaceMutation();

    const [selectedWorkspace, setSelectedWorkspace] = useState<ISlackWorkspace | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleDisconnect = async (workspaceId: string, teamName: string) => {
        if (
            window.confirm(
                `Are you sure you want to disconnect "${teamName}"?`
            )
        ) {
            try {
                await disconnectWorkspace(workspaceId).unwrap();
            } catch (err) {
                console.error("Failed to disconnect workspace:", err);
            }
        }
    };

    const handleWorkspaceClick = (workspace: ISlackWorkspace) => {
        setSelectedWorkspace(workspace);
        setDialogOpen(true);
    };

    if (isLoading) {
        return (
            <Card variant="outlined">
                <CardContent>
                    <CircularProgress />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert severity="error">
                Failed to load workspaces. Please try again.
            </Alert>
        );
    }

    const workspaces = data?.data?.workspaces || [];

    if (workspaces.length === 0) {
        return (
            <Alert severity="info" icon={<SlackIcon />}>
                No Slack workspaces connected yet. Click the button above to
                connect your first workspace.
            </Alert>
        );
    }

    return (
        <>
            <Card variant="outlined">
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Connected Workspaces
                    </Typography>
                    <List>
                        {workspaces.map((workspace) => (
                            <ListItem
                                key={workspace._id}
                                disablePadding
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 1,
                                    mb: 1,
                                }}
                            >
                                <ListItemButton
                                    onClick={() => handleWorkspaceClick(workspace)}
                                >
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle1">
                                                {workspace.teamName}
                                            </Typography>
                                        }
                                        secondary={
                                            <>
                                                Connected on{" "}
                                                {new Date(
                                                    workspace.connectedAt
                                                ).toLocaleDateString()}
                                                <Chip
                                                    label="Click to view members"
                                                    size="small"
                                                    sx={{ ml: 2 }}
                                                />
                                            </>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <IconButton
                                            edge="end"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDisconnect(
                                                    workspace._id,
                                                    workspace.teamName
                                                );
                                            }}
                                            disabled={isDisconnecting}
                                            color="error"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </ListItemSecondaryAction>
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </CardContent>
            </Card>

            <WorkspaceDetailsDialog
                workspace={selectedWorkspace}
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
            />
        </>
    );
};

export default WorkspaceList;
