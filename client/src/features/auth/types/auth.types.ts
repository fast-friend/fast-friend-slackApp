// Auth User interface
export interface IAuthUser {
  id: string;
  email: string;
  isActive?: boolean;
  emailVerified: boolean;
  onboardingCompleted: boolean;
}

// Login Request
export interface ILoginRequest {
  email: string;
  password: string;
}

// Signup Request
export interface ISignupRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

// Refresh Token Request
export interface IRefreshTokenRequest { }

// Logout Request
export interface ILogoutRequest { }

// Auth Response
export interface IAuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: IAuthUser;
  };
}

// Current User Response
export interface ICurrentUserResponse {
  success: boolean;
  message: string;
  data?: {
    user: IAuthUser;
  };
}

// Auth State for Redux
export interface IAuthState {
  user: IAuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Route Types for AuthWrapper
export type RouteType = "public" | "private";

// AuthWrapper Props
export interface IAuthWrapperProps {
  children: React.ReactNode;
  routeType: RouteType;
  redirectPath: string;
}

// Send OTP Request
export interface ISendOtpRequest {
  email: string;
  password: string;
  organizationName: string;
}

// Send OTP Response
export interface ISendOtpResponse {
  success: boolean;
  message: string;
}

// Verify OTP Request
export interface IVerifyOtpRequest {
  email: string;
  otp: string;
}

// Verify OTP Response
export interface IVerifyOtpResponse {
  success: boolean;
  message: string;
  data?: {
    user: IAuthUser;
  };
}

// Complete Onboarding Response
export interface ICompleteOnboardingResponse {
  success: boolean;
  message: string;
}

// Forgot Password Request
export interface IForgotPasswordRequest {
  email: string;
}

// Reset Password Request
export interface IResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Generic success response (used for forgot/reset password)
export interface ISimpleSuccessResponse {
  success: boolean;
  message: string;
}

