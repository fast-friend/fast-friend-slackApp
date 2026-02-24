import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { OnboardingPreFillData, OnboardingFormValues } from "../types/onboardingForm.types";

// Separate RTK Query API with no auth (public endpoints)
export const onboardingFormApi = createApi({
    reducerPath: "onboardingFormApi",
    baseQuery: fetchBaseQuery({
        baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1",
    }),
    endpoints: (builder) => ({
        // Get pre-fill data for the form
        getOnboardingData: builder.query<OnboardingPreFillData, string>({
            query: (token) => `/onboard/${token}`,
            transformResponse: (res: { success: boolean; data: OnboardingPreFillData }) =>
                res.data,
        }),

        // Upload profile photo
        uploadOnboardingPhoto: builder.mutation<
            { photoUrl: string },
            { token: string; formData: FormData }
        >({
            query: ({ token, formData }) => ({
                url: `/onboard/${token}/photo`,
                method: "POST",
                body: formData,
            }),
            transformResponse: (res: { success: boolean; data: { photoUrl: string } }) =>
                res.data,
        }),

        // Submit the completed form
        submitOnboardingForm: builder.mutation<
            { message: string },
            { token: string; data: OnboardingFormValues }
        >({
            query: ({ token, data }) => ({
                url: `/onboard/${token}/submit`,
                method: "POST",
                body: data,
            }),
        }),
    }),
});

export const {
    useGetOnboardingDataQuery,
    useUploadOnboardingPhotoMutation,
    useSubmitOnboardingFormMutation,
} = onboardingFormApi;
