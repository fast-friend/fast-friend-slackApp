import { baseApi } from "@/app/baseApi";
import type {
  IProfileResponse,
  IUpdateProfileRequest,
} from "../types/profile.types";

export const profileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get my profile
    getMyProfile: builder.query<IProfileResponse, void>({
      query: () => ({
        url: "/profile/me",
        method: "GET",
      }),
      providesTags: ["Profile"],
    }),

    // Update my profile
    updateMyProfile: builder.mutation<IProfileResponse, IUpdateProfileRequest>({
      query: (data) => ({
        url: "/profile/me",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    // Get profile by user ID
    getProfileByUserId: builder.query<IProfileResponse, string>({
      query: (userId) => ({
        url: `/profile/${userId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, userId) => [
        { type: "Profile", id: userId },
      ],
    }),
  }),
});

export const {
  useGetMyProfileQuery,
  useLazyGetMyProfileQuery,
  useUpdateMyProfileMutation,
  useGetProfileByUserIdQuery,
  useLazyGetProfileByUserIdQuery,
} = profileApi;
