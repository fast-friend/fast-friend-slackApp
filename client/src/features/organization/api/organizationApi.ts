import { baseApi } from "../../../app/baseApi";
import type {
  Organization,
  OrganizationWithRole,
  OrganizationMember,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  InviteMemberRequest,
  UpdateMemberRoleRequest,
} from "../types/organization.types";

export const organizationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Organization endpoints
    getOrganizations: builder.query<OrganizationWithRole[], void>({
      query: () => "/organizations",
      transformResponse: (response: {
        success: boolean;
        data: OrganizationWithRole[];
      }) => response.data,
      providesTags: ["Organizations"],
    }),

    getOrganization: builder.query<Organization, string>({
      query: (organizationId) => `/organizations/${organizationId}`,
      transformResponse: (response: { success: boolean; data: Organization }) =>
        response.data,
      providesTags: (_result, _error, organizationId) => [
        { type: "Organizations", id: organizationId },
      ],
    }),

    createOrganization: builder.mutation<
      Organization,
      CreateOrganizationRequest
    >({
      query: (data) => ({
        url: "/organizations",
        method: "POST",
        body: data,
      }),
      transformResponse: (response: { success: boolean; data: Organization }) =>
        response.data,
      invalidatesTags: ["Organizations"],
    }),

    updateOrganization: builder.mutation<
      Organization,
      { organizationId: string; data: UpdateOrganizationRequest }
    >({
      query: ({ organizationId, data }) => ({
        url: `/organizations/${organizationId}`,
        method: "PATCH",
        body: data,
      }),
      transformResponse: (response: { success: boolean; data: Organization }) =>
        response.data,
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "Organizations", id: organizationId },
        "Organizations",
      ],
    }),

    deleteOrganization: builder.mutation<void, string>({
      query: (organizationId) => ({
        url: `/organizations/${organizationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Organizations"],
    }),

    // Member endpoints
    getOrganizationMembers: builder.query<OrganizationMember[], string>({
      query: (organizationId) => `/organizations/${organizationId}/members`,
      transformResponse: (response: {
        success: boolean;
        data: OrganizationMember[];
      }) => response.data,
      providesTags: (_result, _error, organizationId) => [
        { type: "OrganizationMembers", id: organizationId },
      ],
    }),

    inviteMember: builder.mutation<
      OrganizationMember,
      { organizationId: string; data: InviteMemberRequest }
    >({
      query: ({ organizationId, data }) => ({
        url: `/organizations/${organizationId}/members`,
        method: "POST",
        body: data,
      }),
      transformResponse: (response: {
        success: boolean;
        data: OrganizationMember;
      }) => response.data,
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationMembers", id: organizationId },
      ],
    }),

    updateMemberRole: builder.mutation<
      OrganizationMember,
      {
        organizationId: string;
        userId: string;
        data: UpdateMemberRoleRequest;
      }
    >({
      query: ({ organizationId, userId, data }) => ({
        url: `/organizations/${organizationId}/members/${userId}`,
        method: "PATCH",
        body: data,
      }),
      transformResponse: (response: {
        success: boolean;
        data: OrganizationMember;
      }) => response.data,
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationMembers", id: organizationId },
      ],
    }),

    removeMember: builder.mutation<
      void,
      { organizationId: string; userId: string }
    >({
      query: ({ organizationId, userId }) => ({
        url: `/organizations/${organizationId}/members/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { organizationId }) => [
        { type: "OrganizationMembers", id: organizationId },
      ],
    }),
  }),
});

export const {
  useGetOrganizationsQuery,
  useGetOrganizationQuery,
  useCreateOrganizationMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
  useGetOrganizationMembersQuery,
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
} = organizationApi;
