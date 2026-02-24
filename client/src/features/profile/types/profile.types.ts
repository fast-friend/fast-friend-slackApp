// Profile Types

export interface IProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  avatar?: string;
  email: string;
}

export interface IUpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
}

export interface IProfileResponse {
  success: boolean;
  message: string;
  data?: {
    profile: IProfile;
  };
}
