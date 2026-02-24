import { SlackUser } from "../types/slack.types";

/**
 * Generate 4 name options: 1 correct + 3 random wrong names
 */
export const generateNameOptions = (
    correctUser: SlackUser,
    allUsers: SlackUser[]
): string[] => {
    const correctName = correctUser.profile.real_name || "Unknown";

    // Filter out the correct user and get other users
    const otherUsers = allUsers.filter(
        (user) =>
            user.id !== correctUser.id &&
            !user.is_bot &&
            !user.deleted &&
            user.profile.real_name
    );

    // Shuffle and pick 3 random users
    const shuffled = otherUsers.sort(() => Math.random() - 0.5);
    const wrongOptions = shuffled
        .slice(0, 3)
        .map((user) => user.profile.real_name || "Unknown");

    // Combine correct + wrong options and shuffle
    const allOptions = [correctName, ...wrongOptions];
    return allOptions.sort(() => Math.random() - 0.5);
};
