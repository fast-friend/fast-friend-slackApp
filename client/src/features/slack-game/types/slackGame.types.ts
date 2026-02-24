// Slack Game Type Definitions

export interface GameStats {
    totalEmployees: number;
    totalTeams: number;
    activeGames: number;
    avgAccuracy: number;
}


export interface LeaderboardEntry {
    slackUserId: string;
    name: string;
    avatarUrl: string | null;
    role?: string;
    totalPoints: number;
    totalResponses: number;
    correctAnswers: number;
    rank: number;
}

export interface GameHistoryEntry {
    _id: string;
    date: string;
    workspaceName: string;
    messagesSent: number;
    responsesReceived: number;
    status: string;
}

export interface GameHistoryResponse {
    games: GameHistoryEntry[];
    pagination: {
        total: number;
        page: number;
        pages: number;
    };
}

export interface TriggerGameRequest {
    workspaceId?: string;
}

export interface TriggerGameResponse {
    success: boolean;
    message: string;
    messagesSent?: number;
}

export interface TeamPerformanceData {
    groupId: string;
    groupName: string;
    accuracy: number;
    responseRate: number;
    totalGames: number;
    totalMessages: number;
}

export interface PerformanceChartPoint {
    date: string;
    accuracy: number;
    responseRate: number;
}
