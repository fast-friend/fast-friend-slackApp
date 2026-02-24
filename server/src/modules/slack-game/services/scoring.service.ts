/**
 * Calculate points based on action ID
 * @param actionId - "correct" or "incorrect"
 */
export const calculatePoints = (actionId: string): number => {
    if (actionId === "correct") {
        return 10; // Correct answer
    }
    return 0; // Wrong answer
};

/**
 * Get display text for the option
 */
export const getOptionText = (actionId: string, selectedName: string): string => {
    return selectedName;
};
