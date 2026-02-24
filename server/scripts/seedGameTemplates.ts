import mongoose from "mongoose";
import dotenv from "dotenv";
import { seedGameTemplates } from "../src/modules/groups/services/gameTemplate.service";
import { env } from "../src/config/env.config";

dotenv.config();

const runSeed = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Seed game templates
    await seedGameTemplates();

    console.log("✓ Game templates seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding game templates:", error);
    process.exit(1);
  }
};

runSeed();
