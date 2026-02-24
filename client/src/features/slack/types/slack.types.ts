export interface ISlackWorkspace {
  _id: string;
  appUserId: string;
  teamId: string;
  teamName: string;
  botUserId: string;
  connectedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISlackUser {
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
    title?: string;       // Slack job title field
  };
  is_bot: boolean;
  is_app_user: boolean;
  // Enriched stats from backend
  teams?: string[];
  gamesPlayed?: number;
  accuracy?: number;
  // Onboarding profile fields
  role?: string;
  department?: string;
  photoUrl?: string;
}

export interface IGetWorkspacesResponse {
  success: boolean;
  data: {
    workspaces: ISlackWorkspace[];
  };
}

export interface IGetWorkspaceUsersResponse {
  success: boolean;
  data: {
    users: ISlackUser[];
  };
}

export interface ISendMessageRequest {
  channelId?: string;
  userId?: string;
  text: string;
}

export interface ISendMessageResponse {
  success: boolean;
  message: string;
  data: {
    channel: string;
    ts: string;
  };
}

export interface ISlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_archived: boolean;
  num_members?: number;
}

export interface IGetChannelsResponse {
  success: boolean;
  data: {
    channels: ISlackChannel[];
  };
}

export interface IGetChannelMembersRequest {
  channelIds: string[];
}

export interface IGetChannelMembersResponse {
  success: boolean;
  data: {
    users: ISlackUser[];
  };
}
