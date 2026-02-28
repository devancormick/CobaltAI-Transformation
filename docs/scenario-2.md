# Scenario 2: Sourcr (No API) Review Routing + Browser Automation (Playwright)

## Goal
Automate Sourcr review responses without a public API:
- Log in programmatically
- Identify unanswered reviews
- Extract review details
- Run the same shared Claude routing logic as Scenario 1
- Draft + route for approval
- After approval, submit the response via browser automation
- Fail gracefully with immediate alerting on any failure

## Key source modules
- `src/scenario2/playwright/sourcrBrowser.ts`
  - Session creation and login/session expiry detection (placeholder selectors)
  - Credentials are read only from environment variables (no hardcoding)
- `src/scenario2/playwright/reviewsExtractor.ts`
  - Extracts unanswered reviews (placeholder selectors + layout-change error handling)
- `src/scenario2/approvalQueue.ts`
  - File-based approval queue placeholder that represents human approval steps
- `src/scenario2/playwright/responseSubmitter.ts`
  - Submits an approved response back on the correct review card
- `src/scenario2/playwright/runner.ts`
  - End-to-end orchestrator for a single scheduled run

## Playwright approach (why)
Sourcr has no API, so any web application a human can use must be automated via a browser automation tool.
Playwright provides:
- Consistent headless browser automation
- Built-in waiting/retry patterns
- Structured error handling around UI changes

## Credential security
Credentials must be stored in Make.com as encrypted environment variables and injected at runtime.
The Playwright code:
- Reads `SOURCR_USERNAME` and `SOURCR_PASSWORD` from `process.env`
- Never logs credentials
- Avoids including credentials in thrown error messages

## Session management + failure cases
`sourcrBrowser.ts` implements placeholder heuristics to detect:
- Already-authenticated session (e.g., Logout/Dashboard UI visible)
- Session expired / authentication missing
- Layout changes or missing UI elements (throws typed errors)

During extraction and submission:
- Layout changes trigger typed failures (`layout_changed`)
- Already-responded reviews return `alreadyResponded` and do not attempt resubmission
- Runner catches any step failure and triggers a senior leadership alert placeholder

## Approval flow (queue + submission)
Because the test project needs a developer-maintainable approval path without embedding credentials:
- `approvalQueue.ts` stores pending approvals in a JSON file
- The runner upserts pending drafts based on Claude routing path
- The runner checks the queue for an approved response
- If approved, `responseSubmitter.ts` submits the approved response

In production, the queue should be replaced with your real approval mechanism (e.g., email approval + callback).

## Action logging
The runner logs actions as JSONL to:
`test-output/scenario2-action-log.jsonl` by default
Each entry is intended to include:
- timestamp
- review ID
- routing path taken
- who approved (when available)
- whether a response was submitted

