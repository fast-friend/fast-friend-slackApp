import { Request, Response } from "express";
import axios from "axios";
import asyncHandler from "../../../utils/asyncHandler";
import AppError from "../../../utils/appError";
import SlackWorkspace from "../models/slackWorkspace.model";

/**
 * @desc    Handle incoming Events from Slack Subscriptions
 * @route   POST /api/v1/slack/events
 * @access  Public (Verified by Slack Signature via middleware)
 */
export const handleSlackEvent = asyncHandler(
  async (req: Request, res: Response) => {
    const { type } = req.body;

    // 1. Initial URL Verification Handshake
    if (type === "url_verification") {
      const { challenge } = req.body;
      res.status(200).send({ challenge });
      return;
    }

    // 2. Respond 200 OK immediately for all other events (Slack requirement)
    res.status(200).send();

    // 3. Process the actual Event Asynchronously
    if (type === "event_callback") {
      const eventPayload = req.body.event;

      if (eventPayload.type === "app_home_opened") {
        await handleAppHomeOpened(
          eventPayload,
          req.body.api_app_id,
          req.body.team_id,
        );
      }
    }
  },
);

/**
 * Handle when a user opens the Home tab of the Slack App
 */
const handleAppHomeOpened = async (
  eventPayload: any,
  apiAppId: string,
  teamId: string,
) => {
  const slackUserId = eventPayload.user;

  // Fetch the specific workspace that this event belongs to
  const workspace = await SlackWorkspace.findOne({ teamId });

  if (!workspace || !workspace.botToken) {
    console.error(
      `[AppHome] No workspace or botToken found for team ${teamId}`,
    );
    return;
  }

  // Verify the bot token is valid for this workspace
  try {
    const authTestRes = await axios.get("https://slack.com/api/auth.test", {
      headers: {
        Authorization: `Bearer ${workspace.botToken}`,
      },
    });

    if (!authTestRes.data.ok) {
      console.error(
        `[AppHome] Invalid bot token: ${authTestRes.data.error}. Reconnect workspace.`,
      );
      return;
    }

    if (authTestRes.data.team_id !== teamId) {
      console.error(
        `[AppHome] Team ID mismatch. Expected: ${teamId}, Got: ${authTestRes.data.team_id}`,
      );
      return;
    }
  } catch (error: any) {
    console.error(
      "[AppHome] Bot auth check failed:",
      error.response?.data || error.message,
    );
    return;
  }

  // Publish the App Home view using Slack's views.publish API
  try {
    const viewPayload = {
      type: "home",
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "Welcome to Fast Friends! 👋",
            emoji: true,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "This is your game hub. From here you can check your current standing or see how much XP you've earned from playing.",
          },
        },
        {
          type: "divider",
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "🏆 View Leaderboard",
                emoji: true,
              },
              style: "primary",
              value: "view_leaderboard",
              action_id: "view_leaderboard",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "⭐ Check My XP",
                emoji: true,
              },
              value: "check_xp",
              action_id: "check_xp",
            },
          ],
        },
      ],
    };

    const publishRes = await axios.post(
      "https://slack.com/api/views.publish",
      {
        user_id: slackUserId,
        view: viewPayload,
      },
      {
        headers: {
          Authorization: `Bearer ${workspace.botToken}`,
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );

    if (!publishRes.data.ok) {
      console.error(
        `[AppHome] Failed to publish view: ${publishRes.data.error}`,
      );
    }
  } catch (error: any) {
    console.error(
      "[AppHome] Exception:",
      error.response?.data || error.message,
    );
  }
};
