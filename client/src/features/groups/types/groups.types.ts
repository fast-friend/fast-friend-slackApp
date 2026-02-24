export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  real_name: string;
  profile: {
    email?: string;
    display_name: string;
    real_name: string;
    image_72: string;
    title?: string;
  };
  is_bot: boolean;
  is_app_user: boolean;
  // Onboarding profile fields (populated after onboarding form submitted)
  department?: string;
  role?: string;
  hobby?: string;
  photoUrl?: string;
}

export interface Group {
  _id: string;
  groupName: string;
  description?: string;
  workspaceId: string;
  members: string[];
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGroupRequest {
  groupName: string;
  description?: string;
  workspaceId: string;
  members?: string[];
}

export interface UpdateGroupRequest {
  groupName?: string;
  description?: string;
  members?: string[];
}
