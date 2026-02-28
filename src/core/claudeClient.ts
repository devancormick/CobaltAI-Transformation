import { z } from "zod";
import type { ClaudeClassification, ReviewInput, StarRating } from "./types";

export interface ClaudeClient {
  classifyReview(input: ReviewInput): Promise<ClaudeClassification>;
}

const ClaudeClassificationSchema = z.object({
  routingPath: z.enum([
    "HOLD",
    "DRAFT_SENIOR_APPROVAL",
    "DRAFT_STANDARD_APPROVAL",
    "DRAFT_STANDARD_APPROVAL_WITH_CELEBRATION",
  ]),
  approvalStage: z.enum(["none", "senior", "standard"]),
  shouldDraft: z.boolean(),
  celebration: z.boolean(),
  leadershipContextRequired: z.boolean(),
  rationale: z.string(),
});

export interface CreateClaudeClientParams {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export function createClaudeClient(params: CreateClaudeClientParams): ClaudeClient {
  const model = params.model ?? "claude-sonnet-4-6";
  const fetchImpl = params.fetchImpl ?? fetch;

  return {
    async classifyReview(input: ReviewInput): Promise<ClaudeClassification> {
      const payload = {
        model,
        max_tokens: 600,
        temperature: 0.2,
        system: [
          "You are routing review-response workflows.",
          "Use star rating as a starting point, but route based on sentiment/content analysis.",
          "Return JSON only. No Markdown, no commentary.",
        ].join("\n"),
        messages: [
          {
            role: "user",
            content: JSON.stringify(
              {
                routingTable: {
                  "1": {
                    classification: "particularly bad",
                    primaryAction: "HOLD (no draft until leadership provides context)",
                    additionalAction: "alertSeniorLeadership immediately",
                  },
                  "2": {
                    classification: "bad",
                    primaryAction: "DRAFT generated",
                    additionalAction: "route draft to senior leadership approval",
                  },
                  "3": {
                    classification: "neutral",
                    primaryAction: "DRAFT generated",
                    additionalAction: "standard approval flow",
                  },
                  "4": {
                    classification: "good",
                    primaryAction: "DRAFT generated",
                    additionalAction: "standard approval flow",
                  },
                  "5": {
                    classification: "exceptional",
                    primaryAction: "DRAFT generated",
                    additionalAction: "standard approval flow + celebration message to team channel",
                  },
                },
                criticalDesignNote:
                  "Routing must be driven by Claude sentiment analysis of the review content (not star rating alone).",
                input: {
                  rating: input.rating,
                  reviewerName: input.reviewerName,
                  reviewerType: input.reviewerType ?? null,
                  businessName: input.businessContext.businessName,
                  teamPlatform: input.businessContext.teamPlatform,
                  reviewText: input.text,
                },
              },
              null,
              2,
            ),
          },
        ],
      };

      const response = await fetchImpl("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": params.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Claude request failed with status ${response.status}`);
      }

      const data = (await response.json()) as unknown;

      const modelText: string | undefined = (data as any)?.content?.[0]?.text;
      if (!modelText) {
        throw new Error("Claude response missing content text");
      }

      const extractedJson = extractJson(modelText);
      const parsed = ClaudeClassificationSchema.parse(extractedJson);
      return parsed as ClaudeClassification;
    },
  };
}

function extractJson(text: string): unknown {
  // Claude should return JSON-only, but we still defensively extract the first JSON object.
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Claude response did not contain JSON");
  return JSON.parse(match[0]);
}

export function buildMockReviewInput(overrides?: Partial<ReviewInput>): ReviewInput {
  return {
    rating: 5 as StarRating,
    text: "Great experience.",
    reviewerName: "Example Reviewer",
    businessContext: { businessName: "Example Business", teamPlatform: "teams" },
    ...overrides,
  };
}

