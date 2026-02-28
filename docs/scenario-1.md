# Scenario 1: Google My Business (Make.com) Review Routing

## Goal
Automate review response routing for Google My Business (GMB) using a single shared Claude-driven routing core.

This scenario focuses on:
- Receiving a new review via Make.com webhook/polling
- Running Claude sentiment classification
- Returning an action plan to downstream steps (alerting, draft generation, approvals, and posting)
- Ensuring every failure triggers an alert (no silent failures)

## Key source modules
- `src/core/claudeClient.ts`
  - Calls the Claude messages API and returns a typed `ClaudeClassification` (route, approval stage, draft/hold, celebration flag).
- `src/core/reviewRouting.ts`
  - Converts `ClaudeClassification` into an `ActionPlan` that downstream modules can execute.
- `src/scenario1/webhookHandler.ts`
  - Validates the Make.com payload, calls Claude routing, and returns `ok: true` + `actionPlan`, or `ok: false` + `leadershipAlert`.
- `src/scenario1/makeBlueprint.json`
  - Make.com blueprint stub describing the modules and the intended flow.
- `src/scenario1/routingHandlers.ts`
  - Placeholder stubs for draft generation, approvals, posting, and celebrations.

## Make.com wiring (intended module flow)
Blueprint modules (stubbed in `src/scenario1/makeBlueprint.json`) describe this chain:
- `trigger` (webhook)
- `validate` (payload normalization)
- `route` (calls `handleGoogleMyBusinessReviewWebhook`)
- `dispatch` (maps `actionPlan` to modules for draft generation, approval routing, and posting)
- `error-notify` (alerts senior leadership when any step fails)

## Payload contract
`src/scenario1/webhookHandler.ts` expects a normalized payload like:
- `rating` (1-5)
- `text` (review text)
- `reviewerName`
- `reviewerType` (`candidate` or `client`, optional)
- `businessName`
- `teamPlatform` (`teams` or `connectteam`)
- `businessId` (optional)

## Routing behavior
Routing is shared via `routeReview()` and must be driven by Claude sentiment/content analysis (not star rating alone).
Downstream actions are derived from the returned `ActionPlan`:
- `HOLD`
  - No draft generated
  - Alert senior leadership immediately
- `DRAFT_SENIOR_APPROVAL`
  - Draft generated
  - Route draft to senior leadership approval before posting
- `DRAFT_STANDARD_APPROVAL`
  - Draft generated
  - Standard approval flow via email
- `DRAFT_STANDARD_APPROVAL_WITH_CELEBRATION`
  - Draft generated
  - Standard approval + celebration message to the team channel

## No silent failures (error handling)
`handleGoogleMyBusinessReviewWebhook()` follows a fail-fast pattern:
- If the payload is invalid: returns `ok: false` with an error message.
- If Claude routing fails or environment is missing: returns `ok: false` plus `error.leadershipAlert`.

The `leadershipAlert` includes:
- `channel`: derived from `teamPlatform`
- `messagePrompt`: a human-readable prompt for senior leadership to take action.

Downstream Make modules should treat `ok: false` as a hard failure path and send the alert via Teams/ConnectTeam based on the channel.

