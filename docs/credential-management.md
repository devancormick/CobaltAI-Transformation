# Credential Management Notes (Make.com encrypted env vars)

This repo is designed so secrets are never committed and are never hardcoded into scripts or scenario configs.
All credentials come from environment variables injected by Make.com.

## Claude API
Required:
- `CLAUDE_API_KEY`
Optional:
- `CLAUDE_MODEL` (defaults to `claude-sonnet-4-6` in code)

Used by:
- `src/core/claudeClient.ts` (`createClaudeClient()` reads `apiKey` passed in; scenario runners pass `process.env.CLAUDE_API_KEY`)
- `src/scenario1/webhookHandler.ts` (`process.env.CLAUDE_API_KEY` and `process.env.CLAUDE_MODEL`)
- `src/scenario2/playwright/runner.ts` (`process.env.CLAUDE_API_KEY` and `process.env.CLAUDE_MODEL`)

## Sourcr login (Scenario 2)
Required:
- `SOURCR_USERNAME`
- `SOURCR_PASSWORD`
Optional:
- `SOURCR_BASE_URL` (defaults to `https://sourcr.com`)
- `SOURCR_STORAGE_STATE_PATH` (optional storage state path)
- `SOURCR_BUSINESS_NAME` (used for logging/routing prompts)
- `SOURCR_TEAM_PLATFORM` (`teams` or `connectteam`)
- `SOURCR_APPROVAL_QUEUE_PATH` (file path for approval queue placeholder)

Used by:
- `src/scenario2/playwright/sourcrBrowser.ts` (reads username/password from `process.env`)
- `src/scenario2/playwright/runner.ts` (reads `SOURCR_TEAM_PLATFORM` and passes it into the shared routing input)
- `src/scenario2/approvalQueue.ts` (reads `SOURCR_APPROVAL_QUEUE_PATH`)

## Security guarantees expected by the brief
1. Do not hardcode secrets into committed source.
2. Do not include credentials in logs or error messages.
3. Ensure Make.com passes credentials at runtime via encrypted environment variables.

