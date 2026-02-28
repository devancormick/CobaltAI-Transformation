export type TeamPlatform = "teams" | "connectteam";

export type ReviewerType = "candidate" | "client";

export type StarRating = 1 | 2 | 3 | 4 | 5;

export interface ReviewInput {
  rating: StarRating;
  text: string;
  reviewerName: string;
  reviewerType?: ReviewerType;
  businessContext: {
    businessName: string;
    teamPlatform: TeamPlatform;
  };
}

export type ClaudeRoutingPath =
  | "HOLD"
  | "DRAFT_SENIOR_APPROVAL"
  | "DRAFT_STANDARD_APPROVAL"
  | "DRAFT_STANDARD_APPROVAL_WITH_CELEBRATION";

export interface ClaudeClassification {
  routingPath: ClaudeRoutingPath;
  approvalStage: "none" | "senior" | "standard";
  shouldDraft: boolean;
  celebration: boolean;
  leadershipContextRequired: boolean;
  rationale: string;
}

export interface ActionPlan {
  routingPath: ClaudeRoutingPath;
  shouldDraft: boolean;
  approvalStage: "none" | "senior" | "standard";
  leadershipContextRequired: boolean;
  celebration: boolean;
  notifications: Array<{
    channel: TeamPlatform;
    kind: "alertSenior" | "celebration";
    messagePrompt: string;
  }>;
  rationale: string;
}

