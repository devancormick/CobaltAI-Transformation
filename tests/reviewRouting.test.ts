import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { routeReview } from "../src/core/reviewRouting";
import type { ClaudeClient } from "../src/core/claudeClient";
import type { ClaudeClassification, ReviewInput } from "../src/core/types";

type Fixture = {
  reviewInput: ReviewInput;
  claudeClassification: ClaudeClassification;
};

async function loadFixture(filename: string): Promise<Fixture> {
  const fixturePath = path.join(__dirname, "routing.fixtures", filename);
  const raw = await readFile(fixturePath, "utf8");
  return JSON.parse(raw) as Fixture;
}

function mockClaudeClient(classification: ClaudeClassification): ClaudeClient {
  return {
    async classifyReview(): Promise<ClaudeClassification> {
      return classification;
    },
  };
}

describe("routeReview (shared Claude-driven routing core)", () => {
  it("routes 1-star particularly-bad to HOLD (no draft) and alerts senior leadership", async () => {
    const fixture = await loadFixture("1star-hold.json");
    const actionPlan = await routeReview(fixture.reviewInput, { claudeClient: mockClaudeClient(fixture.claudeClassification) });

    expect(actionPlan.routingPath).toBe("HOLD");
    expect(actionPlan.shouldDraft).toBe(false);
    expect(actionPlan.approvalStage).toBe("none");
    expect(actionPlan.celebration).toBe(false);
    expect(actionPlan.leadershipContextRequired).toBe(true);
    expect(actionPlan.notifications).toHaveLength(1);
    expect(actionPlan.notifications[0].kind).toBe("alertSenior");
    expect(actionPlan.notifications[0].channel).toBe("teams");
  });

  it("routes 2-star to draft + senior approval (alerts senior leadership)", async () => {
    const fixture = await loadFixture("2star-draft-senior.json");
    const actionPlan = await routeReview(fixture.reviewInput, { claudeClient: mockClaudeClient(fixture.claudeClassification) });

    expect(actionPlan.routingPath).toBe("DRAFT_SENIOR_APPROVAL");
    expect(actionPlan.shouldDraft).toBe(true);
    expect(actionPlan.approvalStage).toBe("senior");
    expect(actionPlan.celebration).toBe(false);
    expect(actionPlan.notifications).toHaveLength(1);
    expect(actionPlan.notifications[0].kind).toBe("alertSenior");
    expect(actionPlan.notifications[0].channel).toBe("teams");
  });

  it("routes exceptional 5-star to draft + standard approval + celebration to the correct channel", async () => {
    const fixture = await loadFixture("5star-celebrate.json");
    const actionPlan = await routeReview(fixture.reviewInput, { claudeClient: mockClaudeClient(fixture.claudeClassification) });

    expect(actionPlan.routingPath).toBe("DRAFT_STANDARD_APPROVAL_WITH_CELEBRATION");
    expect(actionPlan.shouldDraft).toBe(true);
    expect(actionPlan.approvalStage).toBe("standard");
    expect(actionPlan.celebration).toBe(true);
    expect(actionPlan.notifications).toHaveLength(2);

    const celebration = actionPlan.notifications.find((n) => n.kind === "celebration");
    const seniorAlert = actionPlan.notifications.find((n) => n.kind === "alertSenior");

    expect(celebration).toBeTruthy();
    expect(celebration?.channel).toBe("connectteam");

    expect(seniorAlert).toBeTruthy();
    expect(seniorAlert?.channel).toBe("connectteam");
  });
});

