import { Navigate, useLocation, useParams } from "react-router-dom";
import { useWorkspace } from "@/contexts/OrganizationContext";
import { Box, CircularProgress } from "@mui/material";
import { useAppSelector } from "@/app/hooks";
import { useGetCurrentUserQuery } from "@/features/auth";

/**
 * Redirects users to a workspace-scoped route.
 * If no workspace is selected or provided in URL, redirects to first available workspace.
 */
export const WorkspaceRedirect: React.FC<{ to?: string }> = ({
    to = "dashboard",
}) => {
    const location = useLocation();
    const { workspaceId } = useParams<{ workspaceId?: string }>();
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAppSelector(
        (state) => state.auth,
    );
    const { isLoading: isFetchingAuth, isError: isAuthError } =
        useGetCurrentUserQuery(undefined, {
            skip: isAuthenticated && !!user,
        });
    const { currentWorkspace, workspaces, isLoading, hasLoaded } = useWorkspace();

    if (isAuthLoading || isFetchingAuth) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    if (!isAuthenticated || isAuthError) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user && !user.onboardingCompleted) {
        return <Navigate to="/onboarding" state={{ from: location }} replace />;
    }

    // Always show loading while fetching workspaces
    if (isLoading || !hasLoaded) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    // Only after query has settled: if truly no workspaces, show onboarding
    // (This means user completed account setup but hasn't connected Slack yet)
    if (!workspaces || workspaces.length === 0) {
        return <Navigate to="/onboarding" replace />;
    }

    // If workspace ID in URL and it's valid, redirect to that workspace
    if (workspaceId) {
        const workspaceExists = workspaces.find((ws) => ws._id === workspaceId);
        if (workspaceExists) {
            return <Navigate to={`/workspaces/${workspaceId}/${to}`} replace />;
        }
    }

    // Otherwise, redirect to first workspace or current workspace
    const targetWorkspace = currentWorkspace || workspaces[0];
    return <Navigate to={`/workspaces/${targetWorkspace._id}/${to}`} replace />;
};

/**
 * Validates that the workspace ID in the URL exists and user has access.
 * Redirects to first valid workspace if not found.
 */
export const ValidateWorkspace: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { workspaceId } = useParams<{ workspaceId: string }>();
    const { workspaces, isLoading, hasLoaded } = useWorkspace();

    if (isLoading || !hasLoaded) {
        return (
            <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                height="100vh"
            >
                <CircularProgress />
            </Box>
        );
    }

    // Check if workspace exists
    const workspaceExists = workspaces?.find((ws) => ws._id === workspaceId);

    if (!workspaceExists) {
        // Workspace not found - redirect to first workspace
        if (workspaces && workspaces.length > 0) {
            return <Navigate to={`/workspaces/${workspaces[0]._id}/dashboard`} replace />;
        }
        // No workspaces at all - redirect to onboarding
        return <Navigate to="/onboarding" replace />;
    }

    // Workspace is valid, render children
    return <>{children}</>;
};
