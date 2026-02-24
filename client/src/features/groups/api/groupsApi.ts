import { baseApi } from "@/app/baseApi";
import type {
  SlackUser,
  Group,
  CreateGroupRequest,
  UpdateGroupRequest,
} from "../types/groups.types";

export const groupsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get workspace users from Slack API
    getGroupWorkspaceUsers: builder.query<SlackUser[], string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/users`,
      transformResponse: (response: {
        success: boolean;
        data: { users: SlackUser[] };
      }) => response.data.users,
      providesTags: ["SlackUsers"],
    }),

    // Get all groups for a workspace
    getGroups: builder.query<Group[], string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/groups`,
      transformResponse: (response: {
        success: boolean;
        data: { groups: Group[] };
      }) => response.data.groups,
      providesTags: ["Groups"],
    }),

    // Get a single group by ID
    getGroupDetail: builder.query<
      Group,
      { workspaceId: string; groupId: string }
    >({
      query: ({ workspaceId, groupId }) =>
        `/workspaces/${workspaceId}/groups/${groupId}`,
      transformResponse: (response: {
        success: boolean;
        data: { group: Group };
      }) => response.data.group,
      providesTags: (_result, _error, { groupId }) => [
        { type: "Groups", id: groupId },
      ],
    }),

    // Create a new group
    createGroup: builder.mutation<
      Group,
      CreateGroupRequest & { workspaceId: string }
    >({
      query: ({ workspaceId, ...body }) => ({
        url: `/workspaces/${workspaceId}/groups`,
        method: "POST",
        body,
      }),
      transformResponse: (response: {
        success: boolean;
        data: { group: Group };
      }) => response.data.group,
      invalidatesTags: ["Groups"],
    }),

    // Update a group
    updateGroup: builder.mutation<
      Group,
      { workspaceId: string; groupId: string; data: UpdateGroupRequest }
    >({
      query: ({ workspaceId, groupId, data }) => ({
        url: `/workspaces/${workspaceId}/groups/${groupId}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: {
        success: boolean;
        data: { group: Group };
      }) => response.data.group,
      invalidatesTags: (_result, _error, { groupId }) => [
        "Groups",
        { type: "Groups", id: groupId },
      ],
    }),

    // Delete a group
    deleteGroup: builder.mutation<
      { message: string },
      { workspaceId: string; groupId: string }
    >({
      query: ({ workspaceId, groupId }) => ({
        url: `/workspaces/${workspaceId}/groups/${groupId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Groups"],
    }),

    // Add a member to a group
    addMember: builder.mutation<
      Group,
      {
        workspaceId: string;
        groupId: string;
        users: Array<{ userId: string; slackUser: SlackUser }>;
      }
    >({
      query: ({ workspaceId, groupId, users }) => ({
        url: `/workspaces/${workspaceId}/groups/${groupId}/members`,
        method: "POST",
        body: { users },
      }),
      transformResponse: (response: {
        success: boolean;
        data: { group: Group };
      }) => response.data.group,
      invalidatesTags: (_result, _error, { groupId }) => [
        "Groups",
        { type: "Groups", id: groupId },
      ],
    }),

    // Remove a member from a group
    removeMember: builder.mutation<
      Group,
      { workspaceId: string; groupId: string; userId: string }
    >({
      query: ({ workspaceId, groupId, userId }) => ({
        url: `/workspaces/${workspaceId}/groups/${groupId}/members/${userId}`,
        method: "DELETE",
      }),
      transformResponse: (response: {
        success: boolean;
        data: { group: Group };
      }) => response.data.group,
      invalidatesTags: (_result, _error, { groupId }) => [
        "Groups",
        { type: "Groups", id: groupId },
      ],
    }),
  }),
});

export const {
  useGetGroupWorkspaceUsersQuery,
  useGetGroupsQuery,
  useGetGroupDetailQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useAddMemberMutation,
  useRemoveMemberMutation,
} = groupsApi;
