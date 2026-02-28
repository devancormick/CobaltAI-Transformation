import type { ActionPlan, ClaudeClassification, ReviewInput } from "./types";
import type { ClaudeClient } from "./claudeClient";

export interface RouteReviewParams {
  claudeClient: ClaudeClient;
}

export async function routeReview(input: ReviewInput, params: RouteReviewParams): Promise<ActionPlan> {
  const classification: ClaudeClassification = await params.claudeClient.classifyReview(input);

  const plan: ActionPlan = {
    routingPath: classification.routingPath,
    shouldDraft: classification.shouldDraft,
    approvalStage: classification.approvalStage,
    leadershipContextRequired: classification.leadershipContextRequired,
    celebration: classification.celebration,
    rationale: classification.rationale,
    notifications: [],
  };

  if (classification.routingPath === "HOLD") {
    plan.notifications.push({
      channel: input.businessContext.teamPlatform,
      kind: "alertSenior",
      messagePrompt: `Alert senior leadership. Need context before drafting response for 1-star review from ${input.reviewerName}. Business: ${input.businessContext.businessName}.`,
    });
  }

  if (classification.routingPath === "DRAFT_STANDARD_APPROVAL_WITH_CELEBRATION") {
    plan.notifications.push({
      channel: input.businessContext.teamPlatform,
      kind: "celebration",
      messagePrompt: `Post celebration message to ${input.businessContext.teamPlatform} team channel for exceptional review by ${input.reviewerName}. Business: ${input.businessContext.businessName}.`,
    });
  }

  if (
    classification.routingPath === "DRAFT_SENIOR_APPROVAL" ||
    classification.routingPath === "DRAFT_STANDARD_APPROVAL" ||
    classification.routingPath === "DRAFT_STANDARD_APPROVAL_WITH_CELEBRATION"
  ) {
    plan.notifications.push({
      channel: input.businessContext.teamPlatform,
      kind: "alertSenior",
      messagePrompt:
        classification.approvalStage === "senior"
          ? `Route draft to senior leadership approval for response. Reviewer: ${input.reviewerName}. Business: ${input.businessContext.businessName}.`
          : `Route draft to standard approver for response. Reviewer: ${input.reviewerName}. Business: ${input.businessContext.businessName}.`,
    });
  }

  return plan;
}

