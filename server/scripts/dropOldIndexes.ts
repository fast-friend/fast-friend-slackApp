/**
 * Script to drop old/unused indexes from the database
 * Run with: npm run ts-node scripts/dropOldIndexes.ts
 */

import mongoose from "mongoose";
import { env } from "../src/config/env.config";

async function dropOldIndexes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Get the SlackWorkspace collection
    const collection = mongoose.connection.collection("slackworkspaces");

    // Get all indexes
    const indexes = await collection.indexes();
    console.log("\nCurrent indexes:");
    indexes.forEach((index: any) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    // Drop the appUserId index if it exists
    const appUserIdIndex = indexes.find(
      (idx: any) =>
        idx.key.appUserId !== undefined || idx.name.includes("appUserId"),
    );

    if (appUserIdIndex && appUserIdIndex.name) {
      console.log(`\nDropping old index: ${appUserIdIndex.name}`);
      await collection.dropIndex(appUserIdIndex.name);
      console.log("✅ Successfully dropped appUserId index");
    } else {
      console.log(
        "\n⚠️  No appUserId index found (might have been already dropped)",
      );
    }

    // Show remaining indexes
    const remainingIndexes = await collection.indexes();
    console.log("\nRemaining indexes:");
    remainingIndexes.forEach((index: any) => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key));
    });

    console.log("\n✅ Index cleanup complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

dropOldIndexes();
