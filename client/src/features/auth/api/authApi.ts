import { baseApi } from "@/app/baseApi";
import type {
  IAuthResponse,
  ICurrentUserResponse,
  ILoginRequest,
  ILogoutRequest,
  IRefreshTokenRequest,
  ISendOtpRequest,
  ISendOtpResponse,
  IVerifyOtpRequest,
  IVerifyOtpResponse,
  ICompleteOnboardingResponse,
  IForgotPasswordRequest,
  IResetPasswordRequest,
  ISimpleSuccessResponse,
} from "../types/auth.types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Login
    login: builder.mutation<IAuthResponse, ILoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Auth"],
    }),

    // Get Current User
    getCurrentUser: builder.query<ICurrentUserResponse, void>({
      query: () => ({
        url: "/auth/me",
        method: "GET",
      }),
      providesTags: ["Auth"],
    }),

    // Refresh Token
    refreshToken: builder.mutation<
      { success: boolean; message: string },
      IRefreshTokenRequest
    >({
      query: () => ({
        url: "/auth/refresh",
        method: "POST",
      }),
    }),

    // Logout
    logout: builder.mutation<
      { success: boolean; message: string },
      ILogoutRequest
    >({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),

    // Send OTP
    sendOtp: builder.mutation<ISendOtpResponse, ISendOtpRequest>({
      query: (data) => ({
        url: "/auth/send-otp",
        method: "POST",
        body: data,
      }),
    }),

    // Verify OTP
    verifyOtp: builder.mutation<IVerifyOtpResponse, IVerifyOtpRequest>({
      query: (data) => ({
        url: "/auth/verify-otp",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Auth"],
    }),

    // Complete Onboarding
    completeOnboarding: builder.mutation<ICompleteOnboardingResponse, void>({
      query: () => ({
        url: "/auth/complete-onboarding",
        method: "POST",
      }),
      invalidatesTags: ["Auth"],
    }),

    // Forgot Password
    forgotPassword: builder.mutation<ISimpleSuccessResponse, IForgotPasswordRequest>({
      query: (data) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: data,
      }),
    }),

    // Reset Password
    resetPassword: builder.mutation<ISimpleSuccessResponse, IResetPasswordRequest>({
      query: (data) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useGetCurrentUserQuery,
  useLazyGetCurrentUserQuery,
  useRefreshTokenMutation,
  useLogoutMutation,
  useSendOtpMutation,
  useVerifyOtpMutation,
  useCompleteOnboardingMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
} = authApi;
