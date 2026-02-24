import React, { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useGetOrganizationsQuery } from "@/features/organization/api/organizationApi";
import { useGetWorkspacesQuery } from "@/features/slack/api/slackApi";
import type { OrganizationWithRole } from "@/features/organization/types/organization.types";
import type { ISlackWorkspace } from "@/features/slack/types/slack.types";

interface WorkspaceContextType {
  currentWorkspace: ISlackWorkspace | null;
  workspaces: ISlackWorkspace[];
  organization: OrganizationWithRole | null;
  isLoading: boolean;
  hasLoaded: boolean; // true once workspaces query has settled
  error: any;
  switchWorkspace: (workspaceId: string) => void;
  refetchWorkspaces: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

const STORAGE_KEY = "fast-friends-current-workspace-id";

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { workspaceId: urlWorkspaceId } = useParams<{ workspaceId?: string }>();

  const {
    data: organizations,
    isLoading: isLoadingOrgs,
    error: orgError,
  } = useGetOrganizationsQuery();

  const organization = organizations?.[0] || null;

  // Get workspaces for the user
  const {
    data: workspacesData,
    isLoading: isLoadingWorkspaces,
    isUninitialized: isWorkspacesUninitialized,
    error: wsError,
    refetch,
  } = useGetWorkspacesQuery();

  const [currentWorkspace, setCurrentWorkspace] =
    useState<ISlackWorkspace | null>(null);

  const workspaces = workspacesData?.data?.workspaces || [];

  // Initialize or update current workspace when data loads or URL changes
  useEffect(() => {
    if (!workspaces || workspaces.length === 0) {
      setCurrentWorkspace(null);
      return;
    }

    // Priority 1: Use workspace from URL if available
    if (urlWorkspaceId) {
      const urlWorkspace = workspaces.find(
        (ws: ISlackWorkspace) => ws._id === urlWorkspaceId,
      );
      if (urlWorkspace) {
        setCurrentWorkspace(urlWorkspace);
        localStorage.setItem(STORAGE_KEY, urlWorkspaceId);
        return;
      }
    }

    // Priority 2: Try to restore from localStorage
    const storedWorkspaceId = localStorage.getItem(STORAGE_KEY);
    if (storedWorkspaceId) {
      const storedWorkspace = workspaces.find(
        (ws: ISlackWorkspace) => ws._id === storedWorkspaceId,
      );
      if (storedWorkspace) {
        setCurrentWorkspace(storedWorkspace);
        return;
      }
    }

    // Priority 3: Select first workspace
    if (workspaces.length > 0 && !currentWorkspace) {
      setCurrentWorkspace(workspaces[0]);
      localStorage.setItem(STORAGE_KEY, workspaces[0]._id);
    }
  }, [workspaces, urlWorkspaceId]);

  const switchWorkspace = (workspaceId: string) => {
    if (!workspaces) return;

    const ws = workspaces.find((w: ISlackWorkspace) => w._id === workspaceId);
    if (ws) {
      setCurrentWorkspace(ws);
      localStorage.setItem(STORAGE_KEY, workspaceId);
    }
  };

  const value: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    organization,
    isLoading: isLoadingOrgs || isLoadingWorkspaces,
    hasLoaded: !isLoadingOrgs && !isLoadingWorkspaces && !isWorkspacesUninitialized,
    error: orgError || wsError,
    switchWorkspace,
    refetchWorkspaces: refetch,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};

// Backward compatibility export
export const OrganizationProvider = WorkspaceProvider;
export const useOrganization = useWorkspace;
