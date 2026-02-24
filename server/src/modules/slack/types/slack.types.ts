export interface ISlackOAuthResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id: string;
  app_id: string;
  team: {
    id: string;
    name: string;
  };
  enterprise?: {
    id: string;
    name: string;
  };
  authed_user: {
    id: string;
    scope: string;
    access_token: string;
    token_type: string;
  };
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
  };
  is_bot: boolean;
  is_app_user: boolean;
}

export interface ISlackUsersListResponse {
  ok: boolean;
  members: ISlackUser[];
  cache_ts: number;
  response_metadata?: {
    next_cursor: string;
  };
  error?: string;
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
}

export interface ISlackConversationOpenResponse {
  ok: boolean;
  channel: {
    id: string;
  };
  error?: string;
}

export interface ISlackMessageResponse {
  ok: boolean;
  channel: string;
  ts: string;
  message: {
    text: string;
    user: string;
    bot_id?: string;
  };
  error?: string;
}

export interface ISendMessageRequest {
  workspaceId: string;
  channelId?: string;
  userId?: string;
  text: string;
}

export interface ISlackConversationsListResponse {
  ok: boolean;
  channels: ISlackChannel[];
  response_metadata?: {
    next_cursor: string;
  };
  error?: string;
}

export interface ISlackConversationMembersResponse {
  ok: boolean;
  members: string[];
  response_metadata?: {
    next_cursor: string;
  };
  error?: string;
}
