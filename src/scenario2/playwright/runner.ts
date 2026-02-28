import { promises as fs } from "node:fs";
import path from "node:path";
import { createClaudeClient } from "../../core/claudeClient";
import { routeReview } from "../../core/reviewRouting";
import type { ReviewInput, TeamPlatform } from "../../core/types";
import { createSourcrSession, closeSourcrSession } from "./sourcrBrowser";
import { extractUnansweredReviews } from "./reviewsExtractor";
import { submitApprovedResponse } from "./responseSubmitter";
import { getApprovedResponseForReview, upsertPendingApproval } from "../approvalQueue";

type Scenario2LogEntry = {
  timestamp: string;
  reviewId: string;
  routingPath: string;
  whoApproved?: string;
  responseSubmitted?: boolean;
  approvalStatus: "pending" | "approved" | "not_applicable" | "error";
  errorMessage?: string;
};

function getLogPath(): string {
  return process.env.SCENARIO2_LOG_PATH ?? "test-output/scenario2-action-log.jsonl";
}

async function logEntry(entry: Scenario2LogEntry): Promise<void> {
  const logPath = getLogPath();
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, JSON.stringify(entry) + "\n", "utf8");
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}.`);
  return value;
}

async function notifySeniorLeadershipPlaceholder(params: {
  channel: TeamPlatform;
  businessName: string;
  reviewerName: string;
  failureReason: string;
}): Promise<void> {
  const messagePrompt = `Scenario 2 alertSenior: immediate human attention needed. Business: ${params.businessName}. Reviewer: ${params.reviewerName}. Reason: ${params.failureReason}.`;
  await logEntry({
    timestamp: new Date().toISOString(),
    reviewId: "unknown",
    routingPath: "ALERT",
    approvalStatus: "error",
    errorMessage: messagePrompt,
  });
}

export async function runScenario2Once(): Promise<void> {
  const claudeApiKey = getRequiredEnv("CLAUDE_API_KEY");
  const claudeModel = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
  const sourcrBusinessName = process.env.SOURCR_BUSINESS_NAME ?? "Sourcr";
  const teamPlatformEnv = process.env.SOURCR_TEAM_PLATFORM ?? "connectteam";
  const teamPlatform = teamPlatformEnv === "teams" ? "teams" : "connectteam";

  const claudeClient = createClaudeClient({ apiKey: claudeApiKey, model: claudeModel });

  let session: Awaited<ReturnType<typeof createSourcrSession>> | null = null;
  try {
    session = await createSourcrSession();
    const reviews = await extractUnansweredReviews(session.page);

    for (const review of reviews) {
      const startedAt = new Date().toISOString();

      try {
        const input: ReviewInput = {
          rating: review.rating,
          text: review.text,
          reviewerName: review.reviewerName,
          reviewerType: review.reviewerType,
          businessContext: { businessName: sourcrBusinessName, teamPlatform },
        };

        const actionPlan = await routeReview(input, { claudeClient });

        if (!actionPlan.shouldDraft) {
          await notifySeniorLeadershipPlaceholder({
            channel: actionPlan.notifications[0]?.channel ?? teamPlatform,
            businessName: sourcrBusinessName,
            reviewerName: review.reviewerName,
            failureReason: "Routing path HOLD: leadership context required before drafting/submitting.",
          });

          await logEntry({
            timestamp: startedAt,
            reviewId: review.reviewId,
            routingPath: actionPlan.routingPath,
            approvalStatus: "not_applicable",
          });
          continue;
        }

        const draftText = `[DRAFT GENERATED PLACEHOLDER]`;

        if (actionPlan.approvalStage === "none") {
          // Should be rare for the provided routing table, but keep it future-proof.
          const approved = { approvedBy: "system", approvedAt: startedAt, approvedResponseText: draftText };
          await submitApprovedResponse({
            page: session.page,
            reviewId: review.reviewId,
            responseText: approved.approvedResponseText,
            ratingHint: review.rating,
          });
          await logEntry({
            timestamp: startedAt,
            reviewId: review.reviewId,
            routingPath: actionPlan.routingPath,
            whoApproved: approved.approvedBy,
            responseSubmitted: true,
            approvalStatus: "approved",
          });
          continue;
        }

        await upsertPendingApproval({
          reviewId: review.reviewId,
          routingPath: actionPlan.routingPath,
          approvalStage: actionPlan.approvalStage,
          requestedAt: startedAt,
          requestedBy: "automation",
          draftText,
          status: "pending",
        });

        const approved = await getApprovedResponseForReview(review.reviewId);
        if (!approved) {
          await logEntry({
            timestamp: startedAt,
            reviewId: review.reviewId,
            routingPath: actionPlan.routingPath,
            approvalStatus: "pending",
          });
          continue;
        }

        const approvedText = approved.approvedResponseText ?? draftText;
        const submitResult = await submitApprovedResponse({
          page: session.page,
          reviewId: review.reviewId,
          responseText: approvedText,
          ratingHint: review.rating,
        });

        await logEntry({
          timestamp: startedAt,
          reviewId: review.reviewId,
          routingPath: actionPlan.routingPath,
          whoApproved: approved.approvedBy,
          responseSubmitted: submitResult.submitted,
          approvalStatus: "approved",
        });

        if (actionPlan.celebration) {
          await logEntry({
            timestamp: startedAt,
            reviewId: review.reviewId,
            routingPath: actionPlan.routingPath,
            approvalStatus: "not_applicable",
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected error while processing review.";
        await notifySeniorLeadershipPlaceholder({
          channel: teamPlatform,
          businessName: sourcrBusinessName,
          reviewerName: review.reviewerName,
          failureReason: message,
        });

        await logEntry({
          timestamp: startedAt,
          reviewId: review.reviewId,
          routingPath: "ERROR",
          approvalStatus: "error",
          errorMessage: message,
        });
      }
    }
  } finally {
    if (session) await closeSourcrSession(session);
  }
}

