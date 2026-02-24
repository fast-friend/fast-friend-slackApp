import { baseApi } from "@/app/baseApi";
import type {
  GameStats,
  LeaderboardEntry,
  GameHistoryResponse,
  TriggerGameRequest,
  TriggerGameResponse,
  TeamPerformanceData,
  PerformanceChartPoint,
} from "../types/slackGame.types";

export const slackGameApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get game statistics
    getGameStats: builder.query<GameStats, string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/slack-game/stats`,
      transformResponse: (response: { success: boolean; data: GameStats }) =>
        response.data,
      providesTags: ["SlackGameStats"],
    }),

    // Get leaderboard
    getLeaderboard: builder.query<
      LeaderboardEntry[],
      { workspaceId: string; limit?: number }
    >({
      query: ({ workspaceId, limit = 10 }) => ({
        url: `/workspaces/${workspaceId}/slack-game/leaderboard`,
        params: { limit },
      }),
      transformResponse: (response: {
        success: boolean;
        data: { leaderboard: LeaderboardEntry[] };
      }) => response.data.leaderboard,
      providesTags: ["SlackGameLeaderboard"],
    }),

    // Get game history
    getGameHistory: builder.query<
      GameHistoryResponse,
      { workspaceId: string; page?: number; limit?: number }
    >({
      query: ({ workspaceId, page = 1, limit = 20 }) => ({
        url: `/workspaces/${workspaceId}/slack-game/history`,
        params: { page, limit },
      }),
      transformResponse: (response: {
        success: boolean;
        data: GameHistoryResponse;
      }) => response.data,
      providesTags: ["SlackGameHistory"],
    }),

    // Trigger game manually
    triggerGame: builder.mutation<
      TriggerGameResponse,
      TriggerGameRequest & { workspaceId: string }
    >({
      query: ({ workspaceId, ...body }) => ({
        url: `/workspaces/${workspaceId}/slack-game/trigger`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["SlackGameStats", "SlackGameHistory"],
    }),

    // Get per-group team performance
    getTeamPerformance: builder.query<TeamPerformanceData[], string>({
      query: (workspaceId) =>
        `/workspaces/${workspaceId}/slack-game/team-performance`,
      transformResponse: (response: {
        success: boolean;
        data: { teams: TeamPerformanceData[] };
      }) => response.data.teams,
      providesTags: ["SlackGameStats"],
    }),

    // Get time-series performance data for a chart
    getPerformanceChart: builder.query<
      PerformanceChartPoint[],
      { workspaceId: string; groupId: string; days?: number | "all" }
    >({
      query: ({ workspaceId, groupId, days = 7 }) => ({
        url: `/workspaces/${workspaceId}/slack-game/performance-chart`,
        params: { groupId, days },
      }),
      transformResponse: (response: {
        success: boolean;
        data: { chart: PerformanceChartPoint[] };
      }) => response.data.chart,
      providesTags: ["SlackGameStats", "SlackGameHistory"],
    }),

    // Send onboarding DM links to all non-completed users
    sendOnboardingLinks: builder.mutation<
      { message: string; data: { sentCount: number } },
      string  // workspaceId
    >({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/send-onboarding`,
        method: "POST",
      }),
    }),
  }),
});

export const {
  useGetGameStatsQuery,
  useGetLeaderboardQuery,
  useGetGameHistoryQuery,
  useTriggerGameMutation,
  useGetTeamPerformanceQuery,
  useGetPerformanceChartQuery,
  useSendOnboardingLinksMutation,
} = slackGameApi;
