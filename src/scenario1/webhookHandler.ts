import { z } from "zod";
import { createClaudeClient } from "../core/claudeClient";
import { routeReview } from "../core/reviewRouting";
import type { ActionPlan, ReviewInput, TeamPlatform } from "../core/types";

const TeamPlatformSchema = z.union([z.literal("teams"), z.literal("connectteam")]);

const MakeReviewPayloadSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().min(1),
  reviewerName: z.string().min(1),
  reviewerType: z.union([z.literal("candidate"), z.literal("client")]).optional(),
  businessName: z.string().min(1),
  teamPlatform: TeamPlatformSchema,
  businessId: z.string().optional(),
});

export type MakeWebhookResult =
  | { ok: true; actionPlan: ActionPlan; review: Pick<ReviewInput, "rating" | "reviewerName" | "text"> }
  | {
      ok: false;
      error: { message: string; leadershipAlert?: { channel: TeamPlatform; kind: "alertSenior"; messagePrompt: string } };
    };

export async function handleGoogleMyBusinessReviewWebhook(rawPayload: unknown): Promise<MakeWebhookResult> {
  const parse = MakeReviewPayloadSchema.safeParse(rawPayload);
  if (!parse.success) {
    return { ok: false, error: { message: "Invalid payload in webhook handler." } };
  }

  const payload = parse.data;
  const teamPlatform = payload.teamPlatform as TeamPlatform;
  const leadershipAlert = {
    channel: teamPlatform,
    kind: "alertSenior" as const,
    messagePrompt: `Scenario 1 failure. Need immediate human attention for Google My Business review from ${payload.reviewerName}. Business: ${payload.businessName}.`,
  };

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return { ok: false, error: { message: "Missing CLAUDE_API_KEY in environment.", leadershipAlert } };
  }

  try {
    const reviewInput: ReviewInput = {
      rating: payload.rating as ReviewInput["rating"],
      text: payload.text,
      reviewerName: payload.reviewerName,
      reviewerType: payload.reviewerType,
      businessContext: { businessName: payload.businessName, teamPlatform },
    };

    const claudeClient = createClaudeClient({
      apiKey,
      model: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6",
    });

    const actionPlan = await routeReview(reviewInput, { claudeClient });
    return {
      ok: true,
      actionPlan,
      review: { rating: payload.rating as ReviewInput["rating"], reviewerName: payload.reviewerName, text: payload.text },
    };
  } catch {
    return { ok: false, error: { message: "Failed to route review via Claude.", leadershipAlert } };
  }
}

