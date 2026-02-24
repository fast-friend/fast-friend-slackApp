import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  IAuthState,
  IAuthUser,
  IAuthResponse,
  ICurrentUserResponse,
  IVerifyOtpResponse,
} from "./types/auth.types";
import { authApi } from "./api/authApi";

const initialState: IAuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<IAuthUser | null>) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
      state.isLoading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    },
  },
  extraReducers: (builder) => {
    // Handle login success
    builder.addMatcher(
      authApi.endpoints.login.matchFulfilled,
      (state, action: PayloadAction<IAuthResponse>) => {
        if (action.payload.data?.user) {
          state.user = action.payload.data.user;
          state.isAuthenticated = true;
          state.isLoading = false;
        }
      },
    );

    // Handle verifyOtp success (creates user and logs them in)
    builder.addMatcher(
      authApi.endpoints.verifyOtp.matchFulfilled,
      (state, action: PayloadAction<IVerifyOtpResponse>) => {
        if (action.payload.data?.user) {
          state.user = action.payload.data.user;
          state.isAuthenticated = true;
          state.isLoading = false;
        }
      },
    );

    // Handle getCurrentUser success
    builder.addMatcher(
      authApi.endpoints.getCurrentUser.matchFulfilled,
      (state, action: PayloadAction<ICurrentUserResponse>) => {
        if (action.payload.data?.user) {
          state.user = action.payload.data.user;
          state.isAuthenticated = true;
        }
        state.isLoading = false;
      },
    );

    // Handle getCurrentUser pending
    builder.addMatcher(
      authApi.endpoints.getCurrentUser.matchPending,
      (state) => {
        state.isLoading = true;
      },
    );

    // Handle getCurrentUser error
    builder.addMatcher(
      authApi.endpoints.getCurrentUser.matchRejected,
      (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isLoading = false;
      },
    );

    // Handle logout success
    builder.addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
    });

    // Handle completeOnboarding success
    builder.addMatcher(
      authApi.endpoints.completeOnboarding.matchFulfilled,
      (state) => {
        if (state.user) {
          state.user.onboardingCompleted = true;
        }
      },
    );
  },
});

export const { setUser, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
