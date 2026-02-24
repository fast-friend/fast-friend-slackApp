import cron from "node-cron";
import SlackWorkspace from "../../slack/models/slackWorkspace.model";
import Game from "../../groups/models/Game.model";
import GameSession from "../models/GameSession.model";
import GameMessage from "../models/GameMessage.model";
import { selectDailyPairs } from "../services/userSelection.service";
import { buildGameMessage } from "../services/slackBlockBuilder";
import { SlackUser } from "../types/slack.types";
import axios from "axios";

interface ISlackUsersListResponse {
  ok: boolean;
  members: SlackUser[];
}

interface ISlackConversationOpenResponse {
  ok: boolean;
  channel: {
    id: string;
  };
  error?: string;
}

interface ISlackMessageResponse {
  ok: boolean;
  channel: string;
  ts: string;
  error?: string;
}

import { toZonedTime, format } from "date-fns-tz";

/**
 * Check if a game should run based on current day and time
 */
const shouldGameRunNow = (game: any): boolean => {
  // Use the game's timezone, or default to UTC
  const timezone = game.timezone || "UTC";

  // Convert current UTC time to the game's timezone
  const now = new Date();
  const zonedNow = toZonedTime(now, timezone);

  const currentDay = zonedNow.getDay(); // 0-6 (Sunday-Saturday)
  const currentDate = zonedNow.getDate(); // 1-31
  // Safely format the original UTC Date object to the target timezone
  const currentTime = format(now, "HH:mm", { timeZone: timezone });

  // Check if current day matches scheduled days
  let isTargetDay = false;
  if (game.scheduleType === "weekly") {
    isTargetDay = game.scheduledDays.includes(currentDay);
  } else if (game.scheduleType === "monthly") {
    isTargetDay = game.scheduledDays.includes(currentDate);
  }

  if (!isTargetDay) {
    // console.log(`  ⏭️  Not a target day — skip (Game day: ${currentDay}, Expected: ${game.scheduledDays})`);
    return false;
  }

  // Check if current time matches or has passed the scheduled time
  if (!game.frequencyMinutes) {
    const matches = game.scheduledTime === currentTime;
    return matches;
  } else {
    // If frequency is set, the game can run any time on or after the scheduled time today
    const passed = currentTime >= game.scheduledTime;
    return passed;
  }
};

/**
 * Run daily game for all workspaces
 */
export const runDailyGame = async () => {
  const now = new Date();
  const today = now.toISOString().split("T")[0]; // YYYY-MM-DD
  // console.log(`\n🎮 [runDailyGame] Tick at ${now.toISOString()} (today=${today})`);

  try {
    // Fetch all active games
    const games = await Game.find({
      isActive: true,
      status: "scheduled",
    }).populate("groupId").populate("gameTemplateId");

    for (const game of games) {
      try {
        // Check if this game should run now
        if (!shouldGameRunNow(game)) {
          continue;
        }

        // Fetch workspace
        const workspace = await SlackWorkspace.findById(game.workspaceId);
        if (!workspace) {
          console.error(`❌ Workspace not found for game ${game._id}`);
          continue;
        }

        // Check existing session for today
        const existingSession = await GameSession.findOne({
          gameId: game._id,
          date: today,
        });

        if (existingSession) {
          if (!game.frequencyMinutes) {
            continue;
          } else {
            // Ensure enough time has passed based on frequency
            const lastSentAt = existingSession.lastSentAt || existingSession.createdAt;
            const minutesSinceLastSent =
              (Date.now() - new Date(lastSentAt).getTime()) / (1000 * 60);

            if (minutesSinceLastSent < game.frequencyMinutes) {
              continue;
            }
          }
        }

        // --- ONBOARDING GAME INTERCEPT ---
        // If this is the special onboarding game, we bypass normal pairing logic
        // and just use the existing sendOnboardingDMs service.
        const template = game.gameTemplateId as any;
        if (template?.templateName === "onboarding") {
          // We need the onboarding service
          const { sendOnboardingDMs } = await import("../../onboarding/services/onboarding.service");
          const sentCount = await sendOnboardingDMs(workspace._id.toString());
          console.log(`  🚀 Onboarding Game: Dispatched ${sentCount} links for workspace ${workspace.teamName}`);

          // Ensure session is marked so it respects frequency next time
          let gameSession = existingSession;
          if (!gameSession) {
            gameSession = await GameSession.create({
              gameId: game._id,
              workspaceId: workspace._id,
              date: today,
              status: "sent",
              lastSentAt: new Date(),
            });
          } else {
            await GameSession.findByIdAndUpdate(gameSession._id, {
              status: "sent",
              lastSentAt: new Date(),
            });
          }

          continue; // Skip the rest of the normal game pairing logic
        }

        // Fetch workspace users from Slack
        const usersResponse = await axios.get<ISlackUsersListResponse>(
          "https://slack.com/api/users.list",
          {
            headers: {
              Authorization: `Bearer ${workspace.botToken}`,
            },
          },
        );

        if (!usersResponse.data.ok) {
          console.error(`❌ Failed to fetch users for game ${game.gameName}`);
          continue;
        }

        const slackUsers = usersResponse.data.members;

        // Use the populated group
        const group = game.groupId as any;
        const groupMemberIds = group.members || [];
        const groupSlackUsers = slackUsers.filter((user) =>
          groupMemberIds.includes(user.id),
        );

        // console.log(
        //   `  👥 Group "${group.groupName}" — ${groupMemberIds.length} member IDs, ` +
        //   `${groupSlackUsers.length} found in Slack`,
        // );

        if (groupSlackUsers.length === 0) {
          // console.log(`  ⚠️  No group members matched Slack users — skip.`);
          continue;
        }

        if (groupSlackUsers.length < 2) {
          // console.log(`  ⚠️  Need at least 2 members — skip.`);
          continue;
        }

        // Create or reuse game session BEFORE calling selectDailyPairs
        // so we can pass the sessionId to scope the "already seen" check
        let gameSession = existingSession;
        if (!gameSession) {
          gameSession = await GameSession.create({
            gameId: game._id,
            workspaceId: workspace._id,
            date: today,
            status: "scheduled",
          });
          // console.log(`  🆕 Created new GameSession: ${gameSession._id}`);
        } else {
          // console.log(`  ♻️  Reusing existing GameSession: ${gameSession._id}`);
        }

        // Select pairs — scope to current session so frequency rounds can fire
        const pairs = await selectDailyPairs(
          workspace._id.toString(),
          groupSlackUsers,
          gameSession._id.toString(),   // ← KEY FIX: scope seen-check to THIS session
        );

        if (pairs.length === 0) {
          // console.log(`  ⚠️  No valid pairs found for game "${game.gameName}" in this session — all members have already seen everyone today.`);
          continue;
        }

        // console.log(`  📨 Sending ${pairs.length} messages...`);
        let sentCount = 0;

        // Send messages to each recipient
        for (const pair of pairs) {
          try {
            // Open DM conversation
            const dmResponse = await axios.post<ISlackConversationOpenResponse>(
              "https://slack.com/api/conversations.open",
              { users: pair.recipient.id },
              {
                headers: {
                  Authorization: `Bearer ${workspace.botToken}`,
                  "Content-Type": "application/json",
                },
              },
            );

            if (!dmResponse.data.ok) {
              throw new Error(`Failed to open DM: ${dmResponse.data.error}`);
            }

            const channelId = dmResponse.data.channel.id;

            // Create game message record
            const gameMessage = await GameMessage.create({
              gameSessionId: gameSession._id,
              workspaceId: workspace._id,
              recipientSlackUserId: pair.recipient.id,
              subjectSlackUserId: pair.subject.id,
              slackChannelId: channelId,
            });

            // Generate 4 name options (1 correct + 3 random)
            const { generateNameOptions } =
              await import("../services/nameGenerator.service");
            const nameOptions = generateNameOptions(pair.subject, slackUsers);

            // Build message blocks
            const messagePayload = buildGameMessage(
              pair.subject,
              gameMessage._id.toString(),
              nameOptions,
            );

            // Send message
            const messageResponse = await axios.post<ISlackMessageResponse>(
              "https://slack.com/api/chat.postMessage",
              {
                channel: channelId,
                ...messagePayload,
              },
              {
                headers: {
                  Authorization: `Bearer ${workspace.botToken}`,
                  "Content-Type": "application/json",
                },
              },
            );

            if (!messageResponse.data.ok) {
              throw new Error(
                `Failed to send message: ${messageResponse.data.error}`,
              );
            }

            // Update game message with Slack timestamp
            await GameMessage.findByIdAndUpdate(gameMessage._id, {
              slackMessageTs: messageResponse.data.ts,
            });

            // console.log(
            //   `    ✉️  Sent to ${pair.recipient.profile.real_name || pair.recipient.id} (subject: ${pair.subject.profile.real_name || pair.subject.id})`,
            // );
            sentCount++;
          } catch (error: any) {
            console.error(
              `    ❌ Error sending to ${pair.recipient.id}:`,
              error.message,
            );
          }
        }

        // Update session status and lastSentAt
        await GameSession.findByIdAndUpdate(gameSession._id, {
          status: sentCount > 0 ? "sent" : (gameSession.status || "scheduled"),
          lastSentAt: new Date(),
        });

        // console.log(
        //   `  ✅ Round complete — sent ${sentCount}/${pairs.length} messages for "${game.gameName}". lastSentAt updated.`,
        // );
      } catch (error: any) {
        console.error(`❌ Error processing game "${game.gameName}":`, error.message);
      }
    }

    console.log("🎮 [runDailyGame] Tick complete\n");
  } catch (error: any) {
    console.error("❌ Error in runDailyGame:", error.message);
  }
};

/**
 * Initialize cron job
 */
export const initDailyGameJob = (schedule: string) => {
  cron.schedule(schedule, runDailyGame);
  console.log(`📅 Game scheduler initialized: ${schedule}`);
};
