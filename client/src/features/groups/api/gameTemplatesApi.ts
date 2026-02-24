import { baseApi } from "@/app/baseApi";
import type { GameTemplate } from "../types/games.types";

export const gameTemplatesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get all game templates
    getGameTemplates: builder.query<GameTemplate[], string>({
      query: (workspaceId) => `/workspaces/${workspaceId}/game-templates`,
      transformResponse: (response: {
        success: boolean;
        data: { templates: GameTemplate[] };
      }) => response.data.templates,
      providesTags: ["GameTemplates"],
    }),

    // Get a single game template by ID
    getGameTemplate: builder.query<
      GameTemplate,
      { workspaceId: string; templateId: string }
    >({
      query: ({ workspaceId, templateId }) =>
        `/workspaces/${workspaceId}/game-templates/${templateId}`,
      transformResponse: (response: {
        success: boolean;
        data: { template: GameTemplate };
      }) => response.data.template,
      providesTags: (_result, _error, { templateId }) => [
        { type: "GameTemplates", id: templateId },
      ],
    }),
  }),
});

export const { useGetGameTemplatesQuery, useGetGameTemplateQuery } =
  gameTemplatesApi;
