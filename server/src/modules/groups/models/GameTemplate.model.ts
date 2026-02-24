import mongoose, { Schema, Document } from "mongoose";

export interface IGameTemplate {
  templateName: string;
  displayName: string;
  description: string;
  questionFormat: string;
  imageRequired: boolean;
  minOptions: number;
  maxOptions: number;
  icon?: string;
  isActive: boolean;
}

export interface IGameTemplateDocument extends IGameTemplate, Document {
  createdAt: Date;
  updatedAt: Date;
}

const GameTemplateSchema = new Schema<IGameTemplateDocument>(
  {
    templateName: {
      type: String,
      required: [true, "Template name is required"],
      unique: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    questionFormat: {
      type: String,
      required: [true, "Question format is required"],
      trim: true,
    },
    imageRequired: {
      type: Boolean,
      default: true,
    },
    minOptions: {
      type: Number,
      required: [true, "Minimum options is required"],
      min: 2,
      default: 2,
    },
    maxOptions: {
      type: Number,
      required: [true, "Maximum options is required"],
      min: 2,
      default: 4,
    },
    icon: {
      type: String,
      trim: true,
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

// Index for querying active templates
GameTemplateSchema.index({ isActive: 1 });

const GameTemplate = mongoose.model<IGameTemplateDocument>(
  "GameTemplate",
  GameTemplateSchema,
);

export default GameTemplate;
