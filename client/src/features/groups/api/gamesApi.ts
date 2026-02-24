import { baseApi } from "@/app/baseApi";
import type {
  Game,
  CreateGameRequest,
  UpdateGameRequest,
} from "../types/games.types";

export const gamesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all games for a group
    getGames: builder.query<Game[], { workspaceId: string; groupId: string }>({
      query: ({ workspaceId, groupId }) =>
        `/workspaces/${workspaceId}/groups/${groupId}/games`,
      transformResponse: (response: {
        success: boolean;
        data: { games: Game[] };
      }) => response.data.games,
      providesTags: (result, _error, { workspaceId, groupId }) =>
        result
          ? [
            ...result.map(({ _id }) => ({ type: "Games" as const, id: _id })),
            { type: "Games", id: `LIST-GROUP-${groupId}` },
            { type: "Games", id: `LIST-WORKSPACE-${workspaceId}` },
          ]
          : [
            { type: "Games", id: `LIST-GROUP-${groupId}` },
            { type: "Games", id: `LIST-WORKSPACE-${workspaceId}` },
          ],
    }),

    // Get a single game by ID
    getGameDetail: builder.query<
      Game,
      { workspaceId: string; groupId: string; gameId: string }
    >({
      query: ({ workspaceId, groupId, gameId }) =>
        `/workspaces/${workspaceId}/groups/${groupId}/games/${gameId}`,
      transformResponse: (response: {
        success: boolean;
        data: { game: Game };
      }) => response.data.game,
      providesTags: (_result, _error, { gameId }) => [
        { type: "Games" as const, id: gameId },
      ],
    }),

    // Create a new game
    createGame: builder.mutation<
      Game,
      { workspaceId: string; groupId: string; data: CreateGameRequest }
    >({
      query: ({ workspaceId, groupId, data }) => ({
        url: `/workspaces/${workspaceId}/groups/${groupId}/games`,
        method: "POST",
        body: data,
      }),
      transformResponse: (response: {
        success: boolean;
        data: { game: Game };
      }) => response.data.game,
      invalidatesTags: (_result, _error, { workspaceId, groupId }) => [
        { type: "Games" as const, id: `LIST-GROUP-${groupId}` },
        { type: "Games" as const, id: `LIST-WORKSPACE-${workspaceId}` },
      ],
    }),

    // Update a game
    updateGame: builder.mutation<
      Game,
      {
        workspaceId: string;
        groupId: string;
        gameId: string;
        data: UpdateGameRequest;
      }
    >({
      query: ({ workspaceId, groupId, gameId, data }) => ({
        url: `/workspaces/${workspaceId}/groups/${groupId}/games/${gameId}`,
        method: "PUT",
        body: data,
      }),
      transformResponse: (response: {
        success: boolean;
        data: { game: Game };
      }) => response.data.game,
      invalidatesTags: (_result, _error, { workspaceId, groupId, gameId }) => [
        { type: "Games" as const, id: `LIST-GROUP-${groupId}` },
        { type: "Games" as const, id: `LIST-WORKSPACE-${workspaceId}` },
        { type: "Games" as const, id: gameId },
      ],
    }),

    // Delete a game
    deleteGame: builder.mutation<
      { message: string },
      { workspaceId: string; groupId: string; gameId: string }
    >({
      query: ({ workspaceId, groupId, gameId }) => ({
        url: `/workspaces/${workspaceId}/groups/${groupId}/games/${gameId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { workspaceId, groupId, gameId }) => [
        { type: "Games" as const, id: `LIST-GROUP-${groupId}` },
        { type: "Games" as const, id: `LIST-WORKSPACE-${workspaceId}` },
        { type: "Games" as const, id: gameId },
      ],
    }),

    // Get all games across all groups in a workspace
    getAllGames: builder.query<
      Array<Game & { groupName: string; groupId: string }>,
      string
    >({
      query: (workspaceId) => `/workspaces/${workspaceId}/games`,
      transformResponse: (response: {
        success: boolean;
        data: { games: Array<Game & { groupName: string; groupId: string }> };
      }) => response.data.games,
      providesTags: (result, _error, workspaceId) =>
        result
          ? [
            ...result.map(({ _id }) => ({ type: "Games" as const, id: _id })),
            { type: "Games", id: `LIST-WORKSPACE-${workspaceId}` },
          ]
          : [{ type: "Games", id: `LIST-WORKSPACE-${workspaceId}` }],
    }),
  }),
});

export const {
  useGetGamesQuery,
  useGetGameDetailQuery,
  useCreateGameMutation,
  useUpdateGameMutation,
  useDeleteGameMutation,
  useGetAllGamesQuery,
} = gamesApi;
