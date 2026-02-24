import GameMessage from "../models/GameMessage.model";
import { SlackUser } from "../types/slack.types";

interface UserPair {
  recipient: SlackUser;
  subject: SlackUser;
}

/**
 * Select pairs for this game round.
 *
 * `gameSessionId` scopes the "already seen" check to the CURRENT SESSION so
 * that frequency-based games (multiple rounds per day) can always find fresh
 * pairs within a session. Without this scope the very first round would mark
 * every subject as "seen forever" and all subsequent rounds would produce 0
 * pairs and silently skip.
 */
export const selectDailyPairs = async (
  workspaceId: string,
  slackUsers: SlackUser[],
  gameSessionId?: string,
): Promise<UserPair[]> => {
  const pairs: UserPair[] = [];

  // Filter out bots, deleted users, and Slackbot
  const activeUsers = slackUsers.filter(
    (user) => !user.is_bot && !user.deleted && user.id !== "USLACKBOT",
  );

  // console.log(
  //   `📊 [selectDailyPairs] Total: ${slackUsers.length}, Active: ${activeUsers.length}, sessionId: ${gameSessionId || "ALL (no scope)"}`,
  // );

  for (const recipient of activeUsers) {
    // Build the "already seen" query — scoped to this session if provided
    const seenQuery: Record<string, any> = {
      recipientSlackUserId: recipient.id,
    };
    if (gameSessionId) {
      seenQuery.gameSessionId = gameSessionId;
    }

    const seenMessages = await GameMessage.find(seenQuery).select(
      "subjectSlackUserId",
    );

    const seenSubjectIds = new Set(
      seenMessages.map((msg) => msg.subjectSlackUserId),
    );

    // Filter out: themselves + already-seen subjects (within scope)
    const availableSubjects = activeUsers.filter(
      (user) => user.id !== recipient.id && !seenSubjectIds.has(user.id),
    );

    // console.log(
    //   `  👤 ${recipient.profile.real_name || recipient.id}: seen ${seenSubjectIds.size} this session, available ${availableSubjects.length}`,
    // );

    // If no subjects available, skip this recipient
    if (availableSubjects.length === 0) {
      console.log(
        `  ⚠️  No available subjects for ${recipient.profile.real_name || recipient.id} — skipping`,
      );
      continue;
    }

    // Randomly pick one subject
    const randomIndex = Math.floor(Math.random() * availableSubjects.length);
    const subject = availableSubjects[randomIndex];

    pairs.push({ recipient, subject });
  }

  // console.log(`✅ [selectDailyPairs] Created ${pairs.length} pairs`);
  return pairs;
};
