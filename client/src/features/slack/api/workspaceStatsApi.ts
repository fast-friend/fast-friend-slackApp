import { baseApi } from "@/app/baseApi";

export interface WorkspaceStats {
    groupsCount: number;
    usersCount: number;
    gamesCount: number;
    engagementRate: number;
}

export const workspaceStatsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getWorkspaceStats: builder.query<WorkspaceStats, string>({
            query: (workspaceId) => `/workspaces/${workspaceId}/stats`,
            transformResponse: (response: {
                success: boolean;
                data: WorkspaceStats;
            }) => response.data,
            providesTags: (_result, _error, workspaceId) => [
                { type: "Workspaces", id: workspaceId },
            ],
        }),
    }),
});

export const { useGetWorkspaceStatsQuery } = workspaceStatsApi;
