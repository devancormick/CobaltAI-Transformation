## Execution Plan (CobaltAI-Transformation)

### Repo constraints
- Git commits must be created with:
  - `GIT_COMMITTER_DATE="26 days ago"`
  - `--date="26 days ago"`
- Use repo-local git identity (no global config):
  - `git config --local user.name devancormick`
  - `git config --local user.email devancormick@users.noreply.github.com`
- Do not include `Co-authored-by: Cursor <cursoragent@cursor.com>` in commit messages.
- `.gitignore` must not include comment lines (no lines starting with `#`).

### Implementation milestones (feature commits)
1. Scaffold repo: `README.md`, `.gitignore`, `jd.md`, `plan.md`.
2. Implement shared Claude-driven routing core:
   - sentiment-based routing (not star-only)
   - typed “action plan” output
3. Scenario 1 (Google My Business + Make.com):
   - webhook handler stub
   - Make.com blueprint JSON stub
   - alerting + draft + approval routing stubs
4. Scenario 1 error handling:
   - fail-fast typed errors that map to alert actions
5. Scenario 2 (Sourcr + Playwright):
   - login/session helpers using encrypted env vars (no hardcoding)
   - extract unanswered reviews
6. Scenario 2 submission + approvals:
   - approved-response submission flow
   - robust handling for already-responded and session expiry
7. Documentation:
   - one page per scenario with modules, routing logic, and error handling
   - credential management notes
8. Tests:
   - fixtures (>=3 examples spanning distinct routing)
   - mock-based routing tests validating routing logic + HOLD/approval/celebration paths

### Completion definition
- Scenario 1 and 2 code paths exist end-to-end with real integration points clearly stubbed.
- Routing is driven by Claude sentiment classification output.
- Credential handling relies on environment variables only.
- Every failure triggers an alert action path (no silent failures).

