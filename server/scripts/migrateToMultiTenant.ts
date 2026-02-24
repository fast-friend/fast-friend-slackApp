/**
 * Migration script to convert single-tenant data to multi-tenant architecture
 *
 * This script:
 * 1. Gets all existing AuthUsers
 * 2. Creates an Organization for each user
 * 3. Makes each user the OWNER of their organization
 * 4. Updates all SlackWorkspaces to reference the organization instead of user
 * 5. Removes the role field from AuthUser documents
 */

import mongoose from "mongoose";
import { env } from "../src/config/env.config";
import AuthUser from "../src/modules/auth/models/authuser.model";
import SlackWorkspace from "../src/modules/slack/models/slackWorkspace.model";
import Organization from "../src/modules/organization/models/organization.model";
import OrganizationMember from "../src/modules/organization/models/organizationMember.model";
import { OrganizationRole } from "../src/modules/organization/types/organization.types";

/**
 * Generate URL-friendly slug from text
 */
const generateSlug = (text: string, suffix?: string): string => {
  let slug = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  if (suffix) {
    slug = `${slug}-${suffix}`;
  }

  return slug;
};

async function migrateToMultiTenant() {
  try {
    console.log("🚀 Starting migration to multi-tenant architecture...\n");

    // Connect to database
    await mongoose.connect(env.MONGO_URI);
    console.log("✅ Connected to database\n");

    // Get all existing users (excluding any test/system users if needed)
    const users = await AuthUser.find({ isActive: true });
    console.log(`📊 Found ${users.length} users to migrate\n`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        console.log(`\n👤 Processing user: ${user.email} (ID: ${user._id})`);

        // Check if organization already exists for this user
        const existingMembership = await OrganizationMember.findOne({
          userId: user._id,
          isActive: true,
        });

        if (existingMembership) {
          console.log(`  ℹ️  User already has an organization, skipping...`);
          continue;
        }

        // Generate organization name from email domain or use email
        const emailDomain = user.email.split("@")[1];
        const orgName = emailDomain
          ? `${emailDomain.split(".")[0]} Organization`
          : `${user.email}'s Organization`;

        // Generate unique slug
        let slug = generateSlug(orgName);
        let slugExists = await Organization.findOne({ slug, isActive: true });
        let counter = 1;
        while (slugExists) {
          slug = generateSlug(orgName, counter.toString());
          slugExists = await Organization.findOne({ slug, isActive: true });
          counter++;
        }

        console.log(`  📝 Creating organization: ${orgName} (slug: ${slug})`);

        // Create organization
        const organization = await Organization.create({
          name: orgName,
          slug,
          isActive: true,
          createdAt: user.createdAt || new Date(),
          updatedAt: user.updatedAt || new Date(),
        });

        console.log(`  ✅ Organization created: ${organization._id}`);

        // Create organization member (user is OWNER)
        await OrganizationMember.create({
          userId: user._id,
          organizationId: organization._id,
          role: OrganizationRole.OWNER,
          joinedAt: user.createdAt || new Date(),
          isActive: true,
        });

        console.log(`  ✅ User set as OWNER of organization`);

        // Update all workspaces for this user to reference the organization
        const workspacesResult = await SlackWorkspace.updateMany(
          { appUserId: user._id },
          {
            $set: {
              organizationId: organization._id,
              connectedBy: user._id,
            },
            $unset: { appUserId: 1 },
          },
        );

        console.log(
          `  ✅ Updated ${workspacesResult.modifiedCount} workspace(s)`,
        );

        // Remove role field from user document
        await AuthUser.updateOne({ _id: user._id }, { $unset: { role: 1 } });

        console.log(`  ✅ Removed role field from user`);

        migratedCount++;
        console.log(`  ✨ Migration completed for ${user.email}`);
      } catch (error: any) {
        console.error(
          `  ❌ Error migrating user ${user.email}:`,
          error.message,
        );
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 Migration Summary:");
    console.log("=".repeat(60));
    console.log(`Total users found: ${users.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log("=".repeat(60));

    if (errorCount === 0) {
      console.log("\n✅ ✨ Migration completed successfully! ✨\n");
    } else {
      console.log(
        "\n⚠️  Migration completed with some errors. Please review the logs.\n",
      );
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from database\n");
  }
}

// Run migration
migrateToMultiTenant()
  .then(() => {
    console.log("Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script error:", error);
    process.exit(1);
  });
