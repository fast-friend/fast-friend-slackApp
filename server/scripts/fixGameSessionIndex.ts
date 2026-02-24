import mongoose from "mongoose";
import { env } from "../src/config/env.config";

/**
 * Script to drop old index and ensure new index exists
 */
async function fixGameSessionIndex() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("📦 Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db!.collection("gamesessions");

    // Get all indexes
    const indexes = await collection.indexes();
    console.log(
      "Current indexes:",
      indexes.map((i) => i.name),
    );

    // Drop old index if it exists
    try {
      await collection.dropIndex("workspaceId_1_date_1");
      console.log("✅ Dropped old index: workspaceId_1_date_1");
    } catch (error: any) {
      if (error.code === 27) {
        console.log("ℹ️  Old index doesn't exist (already dropped)");
      } else {
        console.log("⚠️  Error dropping old index:", error.message);
      }
    }

    // Create new index
    await collection.createIndex(
      { gameId: 1, date: 1 },
      { unique: true, name: "gameId_1_date_1" },
    );
    console.log("✅ Created new index: gameId_1_date_1");

    // Verify
    const newIndexes = await collection.indexes();
    console.log(
      "Updated indexes:",
      newIndexes.map((i) => i.name),
    );

    console.log("🎉 Index migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixGameSessionIndex();
