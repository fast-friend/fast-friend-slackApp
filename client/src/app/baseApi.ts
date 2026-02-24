import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  FetchBaseQueryMeta,
} from "@reduxjs/toolkit/query";

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: "include",
});

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError,
  object,
  FetchBaseQueryMeta
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && (result.error as FetchBaseQueryError).status === 401) {
    // Attempt to refresh the access token using the refresh token cookie
    const refreshResult = await baseQuery(
      { url: "/auth/refresh", method: "POST" },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      // Refresh succeeded — retry the original request with the new token
      result = await baseQuery(args, api, extraOptions);
    } else {
      // Refresh also failed — session is truly expired, log out
      api.dispatch({ type: "auth/logout" });
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Auth",
    "Organizations",
    "OrganizationMembers",
    "Profile",
    "Slack",
    "Workspaces",
    "SlackGameStats",
    "SlackGameLeaderboard",
    "SlackGameHistory",
    "Groups",
    "SlackUsers",
    "Games",
    "GameTemplates",
  ],
  endpoints: () => ({}),
});
