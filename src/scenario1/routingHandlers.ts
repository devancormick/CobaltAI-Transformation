import type { ActionPlan, TeamPlatform } from "../core/types";
import type { ReviewInput } from "../core/types";

export interface DraftResult {
  draftText: string;
}

export interface Scenario1DispatchResult {
  dispatched: boolean;
  failedStep?: string;
  alert?: {
    channel: TeamPlatform;
    messagePrompt: string;
  };
}

export function buildSeniorLeadershipAlertPrompt(params: {
  channel: TeamPlatform;
  businessName: string;
  reviewerName: string;
  failureReason: string;
}): { channel: TeamPlatform; messagePrompt: string } {
  return {
    channel: params.channel,
    messagePrompt: `Scenario 1 failure. Immediate human attention needed. Business: ${params.businessName}. Reviewer: ${params.reviewerName}. Reason: ${params.failureReason}.`,
  };
}

export async function generateDraftPlaceholder(_review: ReviewInput, _actionPlan: ActionPlan): Promise<DraftResult> {
  return { draftText: "[DRAFT TEXT TO BE GENERATED]" };
}

export async function routeDraftForApprovalPlaceholder(_actionPlan: ActionPlan, _draft: DraftResult): Promise<void> {
  return;
}

export async function postResponseToGoogleMyBusinessPlaceholder(_review: ReviewInput, _draft: DraftResult): Promise<void> {
  return;
}

export async function postCelebrationMessagePlaceholder(_review: ReviewInput): Promise<void> {
  return;
}

