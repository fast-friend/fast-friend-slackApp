import { baseApi } from "@/app/baseApi";
import type {
  IGetWorkspacesResponse,
  IGetWorkspaceUsersResponse,
  IGetChannelsResponse,
  IGetChannelMembersResponse,
  ISendMessageRequest,
  ISendMessageResponse,
} from "../types/slack.types";

export interface CsvUserRow {
  userId: string;
  userName: string;
  realName: string;
  jobTitle: string;
  displayName?: string;
  email?: string;
  phone?: string;
  pronouns?: string;
  department?: string;
}

export interface CsvRowError {
  row: number;
  userId: string;
  name: string;
  missingFields: string[];
}

export interface ICsvUploadResponse {
  success: boolean;
  data?: {
    uploaded: number;
    skipped: CsvRowError[];
  };
  errors?: CsvRowError[];
  message?: string;
}

export const slackApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all connected workspaces
    getWorkspaces: builder.query<IGetWorkspacesResponse, void>({
      query: () => ({
        url: "/slack/workspaces",
        method: "GET",
      }),
      providesTags: ["Slack"],
    }),

    // Get users from a workspace
    getWorkspaceUsers: builder.query<IGetWorkspaceUsersResponse, string>({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/users`,
        method: "GET",
      }),
      providesTags: (_result, _error, workspaceId) => [
        { type: "Slack", id: `users-${workspaceId}` },
      ],
    }),

    // Get channels from a workspace
    getWorkspaceChannels: builder.query<IGetChannelsResponse, string>({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/channels`,
        method: "GET",
      }),
    }),

    // Get members from specific channels
    getChannelMembers: builder.mutation<
      IGetChannelMembersResponse,
      { workspaceId: string; channelIds: string[] }
    >({
      query: ({ workspaceId, channelIds }) => ({
        url: `/workspaces/${workspaceId}/channel-members`,
        method: "POST",
        body: { channelIds },
      }),
    }),

    // Send message
    sendMessage: builder.mutation<
      ISendMessageResponse,
      { workspaceId: string; data: ISendMessageRequest }
    >({
      query: ({ workspaceId, data }) => ({
        url: `/workspaces/${workspaceId}/message`,
        method: "POST",
        body: data,
      }),
    }),

    // Disconnect workspace
    disconnectWorkspace: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Slack"],
    }),

    // Upload users from CSV
    uploadUsersFromCsv: builder.mutation<
      ICsvUploadResponse,
      { workspaceId: string; users: CsvUserRow[]; skipInvalid: boolean }
    >({
      query: ({ workspaceId, users, skipInvalid }) => ({
        url: `/workspaces/${workspaceId}/users/csv-upload`,
        method: "POST",
        body: { users, skipInvalid },
      }),
      invalidatesTags: (_result, _error, { workspaceId }) => [
        { type: "Slack", id: `users-${workspaceId}` },
      ],
    }),

    // Force-refresh users by clearing server-side Slack API cache
    refreshWorkspaceUsers: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (workspaceId) => ({
        url: `/workspaces/${workspaceId}/users/refresh`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, workspaceId) => [
        { type: "Slack", id: `users-${workspaceId}` },
      ],
    }),
  }),
});

export const {
  useGetWorkspacesQuery,
  useGetWorkspaceUsersQuery,
  useLazyGetWorkspaceUsersQuery,
  useGetWorkspaceChannelsQuery,
  useGetChannelMembersMutation,
  useSendMessageMutation,
  useDisconnectWorkspaceMutation,
  useUploadUsersFromCsvMutation,
  useRefreshWorkspaceUsersMutation,
} = slackApi;

