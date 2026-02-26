import { Document, Types } from "mongoose";

export interface IAuthUser {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  refreshTokens: IRefreshToken[];
  isActive: boolean;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRefreshToken {
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface IAuthUserDocument extends IAuthUser, Document {
  _id: Types.ObjectId;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface ITokenPayload {
  userId: string;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface ISignupRequest {
  email: string;
  password: string;
  organizationName: string;
  firstName?: string;
  lastName?: string;
}

export interface IAuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      emailVerified: boolean;
      onboardingCompleted: boolean;
    };
  };
}

export interface ICurrentUserResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      isActive: boolean;
      emailVerified: boolean;
      onboardingCompleted: boolean;
    };
  };
}

export interface ISendOtpRequest {
  email: string;
  password: string;
  organizationName: string;
}

export interface ISendOtpResponse {
  success: boolean;
  message: string;
}

export interface IVerifyOtpRequest {
  email: string;
  otp: string;
}

export interface IVerifyOtpResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      emailVerified: boolean;
      onboardingCompleted: boolean;
    };
  };
}

export interface ICompleteOnboardingResponse {
  success: boolean;
  message: string;
}

export interface IForgotPasswordRequest {
  email: string;
}

export interface IResetPasswordRequest {
  token: string;
  newPassword: string;
}
