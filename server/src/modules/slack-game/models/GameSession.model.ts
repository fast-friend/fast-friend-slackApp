import mongoose, { Schema, Document } from "mongoose";

export interface IGameSession extends Document {
  gameId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD format
  status: "scheduled" | "sent" | "completed";
  lastSentAt?: Date; // Tracks when the last batch of messages was sent for this session based on frequency
  createdAt: Date;
  updatedAt: Date;
}

const GameSessionSchema = new Schema<IGameSession>(
  {
    gameId: {
      type: Schema.Types.ObjectId,
      ref: "Game",
      required: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "SlackWorkspace",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "sent", "completed"],
      default: "scheduled",
    },
    lastSentAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Ensure one session per game per day
GameSessionSchema.index({ gameId: 1, date: 1 }, { unique: true });

const GameSession = mongoose.model<IGameSession>(
  "GameSession",
  GameSessionSchema,
);

export default GameSession;
