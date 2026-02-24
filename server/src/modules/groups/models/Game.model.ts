import mongoose, { Schema, Document } from "mongoose";

export interface IGame {
  gameName: string;
  gameTemplateId: string;
  groupId: string;
  workspaceId: string;
  scheduleType: "weekly" | "monthly";
  scheduledDays: number[]; // For weekly: 0-6 (Sun-Sat), For monthly: 1-31
  scheduledTime: string; // HH:mm format (e.g., "09:00")
  timezone?: string; // Optional timezone
  frequencyMinutes?: number; // Optional frequency in total minutes (e.g. 90 for 1h 30m)
  status: "scheduled" | "active" | "completed" | "cancelled";
  createdBy: string;
  isActive: boolean;
}

export interface IGameDocument extends IGame, Document {
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema = new Schema<IGameDocument>(
  {
    gameName: {
      type: String,
      required: [true, "Game name is required"],
      trim: true,
    },
    gameTemplateId: {
      type: String,
      required: [true, "Game template ID is required"],
      ref: "GameTemplate",
    },
    groupId: {
      type: String,
      required: [true, "Group ID is required"],
      ref: "Group",
    },
    workspaceId: {
      type: String,
      required: [true, "Workspace ID is required"],
      ref: "SlackWorkspace",
    },
    scheduleType: {
      type: String,
      enum: ["weekly", "monthly"],
      required: [true, "Schedule type is required"],
    },
    scheduledDays: {
      type: [Number],
      required: [true, "Scheduled days are required"],
      validate: {
        validator: function (days: number[]) {
          return days.length > 0;
        },
        message: "At least one scheduled day is required",
      },
    },
    scheduledTime: {
      type: String,
      required: [true, "Scheduled time is required"],
      match: [
        /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
        "Time must be in HH:mm format",
      ],
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    frequencyMinutes: {
      type: Number,
      min: [1, "Frequency must be at least 1 minute"],
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "cancelled"],
      default: "scheduled",
    },
    createdBy: {
      type: String,
      required: [true, "Creator ID is required"],
      ref: "AuthUser",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index for querying games by group
GameSchema.index({ groupId: 1, isActive: 1 });

// Index for querying scheduled games
GameSchema.index({ status: 1, scheduleType: 1, isActive: 1 });

const Game = mongoose.model<IGameDocument>("Game", GameSchema);

export default Game;
