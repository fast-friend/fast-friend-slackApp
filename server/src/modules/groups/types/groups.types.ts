export interface ISlackUser {
    userId: string;
    workspaceId: string;
    userName: string;
    realName: string;
    displayName?: string;
    email?: string;
    avatarUrl?: string;
    // Extended Slack profile fields
    jobTitle?: string;
    statusText?: string;
    statusEmoji?: string;
    phone?: string;
    pronouns?: string;
    timezone?: string;
    tzLabel?: string;
    tzOffset?: number;
    isOwner?: boolean;
    isAdmin?: boolean;
    csvImported?: boolean;
    groupsJoined: string[];
    messagesSent: number;
    responsesCount: number;
    lastActive?: Date;
    isActive: boolean;
    // Onboarding profile fields
    departments?: string[];
    roles?: string[];
    hobbies?: string[];
    birthdate?: Date;
    photoUrl?: string;
    onboardingCompleted?: boolean;
}

export interface IGroup {
    groupName: string;
    description?: string;
    workspaceId: string;
    members: string[];
    createdBy: string;
    isActive: boolean;
}
