import cron from "node-cron";
import OnboardingToken from "../models/OnboardingToken.model";
import SlackWorkspace from "../../slack/models/slackWorkspace.model";
import SlackUser from "../../groups/models/SlackUser.model";
import OrganizationMember from "../../organization/models/organizationMember.model";
import { OrganizationRole } from "../../organization/types/organization.types";
import { sendPendingOnboardingReminderEmail } from "../../../utils/email.service";

/**
 * Run the pending onboarding reminder job
 * Sends emails to organization admins when users haven't completed onboarding
 * between 24 hours and 3 days after token creation.
 */
export const runPendingOnboardingReminder = async () => {
  console.log(
    `📧 [PendingOnboardingReminder] Starting daily check at ${new Date().toISOString()}`,
  );

  try {
    // 1. Find tokens created between 24 hours and 3 days ago that are not used and not expired
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const pendingTokens = await OnboardingToken.find({
      createdAt: { $lt: twentyFourHoursAgo, $gte: threeDaysAgo },
      used: false,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (pendingTokens.length === 0) {
      console.log(
        `📧 [PendingOnboardingReminder] No pending onboarding tokens found.`,
      );
      return;
    }

    console.log(
      `📧 [PendingOnboardingReminder] Found ${pendingTokens.length} pending onboarding tokens.`,
    );

    // 2. Group tokens by workspaceId
    const workspaceGroups = pendingTokens.reduce(
      (acc, token) => {
        if (!acc[token.workspaceId]) {
          acc[token.workspaceId] = [];
        }
        acc[token.workspaceId].push(token);
        return acc;
      },
      {} as Record<string, typeof pendingTokens>,
    );

    let sentCount = 0;
    let errorCount = 0;

    // 3. Process each workspace
    for (const [workspaceId, tokens] of Object.entries(workspaceGroups)) {
      try {
        // Get workspace details
        const workspace = await SlackWorkspace.findById(workspaceId);

        if (!workspace) {
          console.error(`  ⚠️  Workspace ${workspaceId} not found. Skipping.`);
          errorCount++;
          continue;
        }

        // Count total active users (excluding CSV imports)
        const totalUsers = await SlackUser.countDocuments({
          workspaceId,
          isActive: true,
          csvImported: { $ne: true },
        });

        const pendingCount = tokens.length;

        // Get organization ADMIN and OWNER members
        const orgMembers = await OrganizationMember.find({
          organizationId: workspace.organizationId,
          role: {
            $in: [OrganizationRole.ADMIN, OrganizationRole.OWNER],
          },
          isActive: true,
        }).populate("userId", "email firstName lastName");

        // Extract admin emails
        const adminEmails = orgMembers
          .map((member) => (member.userId as any)?.email)
          .filter(Boolean) as string[];

        if (adminEmails.length === 0) {
          console.warn(
            `  ⚠️  No admin emails found for workspace ${workspace.teamName}. Skipping.`,
          );
          continue;
        }

        // Send email to each admin
        for (const email of adminEmails) {
          try {
            await sendPendingOnboardingReminderEmail(
              email,
              pendingCount,
              totalUsers,
              workspace.teamName,
              workspaceId,
            );
            sentCount++;
          } catch (emailError: any) {
            console.error(
              `  ❌ Failed to send email to ${email}:`,
              emailError.message,
            );
            errorCount++;
          }
        }

        console.log(
          `  ✅ Sent ${adminEmails.length} ${adminEmails.length === 1 ? "email" : "emails"} for workspace "${workspace.teamName}" (${pendingCount}/${totalUsers} pending)`,
        );
      } catch (workspaceError: any) {
        console.error(
          `  ❌ Failed to process workspace ${workspaceId}:`,
          workspaceError.message,
        );
        errorCount++;
      }
    }

    console.log(
      `📧 [PendingOnboardingReminder] Completed. Sent: ${sentCount}, Errors: ${errorCount}\n`,
    );
  } catch (error: any) {
    console.error(`❌ [PendingOnboardingReminder] Job failed:`, error.message);
  }
};

/**
 * Initialize the pending onboarding reminder cron job
 * @param schedule - Cron schedule string (default: "0 9 * * *" - daily at 9 AM)
 */
export const initPendingOnboardingReminderJob = (schedule: string) => {
  cron.schedule(schedule, runPendingOnboardingReminder);
  console.log(`📧 Pending onboarding reminder job initialized: ${schedule}`);
};
