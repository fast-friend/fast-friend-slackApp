export interface GameTemplate {
  _id: string;
  templateName: string;
  displayName: string;
  description: string;
  questionFormat: string;
  imageRequired: boolean;
  minOptions: number;
  maxOptions: number;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Game {
  _id: string;
  gameName: string;
  gameTemplateId: string;
  groupId: string;
  workspaceId: string;
  scheduleType: "weekly" | "monthly";
  scheduledDays: number[]; // For weekly: 0-6 (Sun-Sat), For monthly: 1-31
  scheduledTime: string; // HH:mm format
  timezone?: string;
  frequencyMinutes?: number;
  status: "scheduled" | "active" | "completed" | "cancelled";
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGameRequest {
  gameName: string;
  gameTemplateId: string;
  scheduleType: "weekly" | "monthly";
  scheduledDays: number[];
  scheduledTime: string;
  timezone?: string;
  frequencyMinutes?: number;
}

export interface UpdateGameRequest {
  gameName?: string;
  scheduleType?: "weekly" | "monthly";
  scheduledDays?: number[];
  scheduledTime?: string;
  timezone?: string;
  frequencyMinutes?: number;
  status?: "scheduled" | "active" | "completed" | "cancelled";
}
