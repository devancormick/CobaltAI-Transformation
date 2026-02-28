import { chromium, type Browser, type Page } from "playwright";
import type { ReviewerType, StarRating } from "../../core/types";

export type SourcrLoginError =
  | { kind: "missing_credentials"; message: string }
  | { kind: "login_failed"; message: string }
  | { kind: "session_expired"; message: string };

export interface SourcrCredentials {
  username: string;
  password: string;
}

export interface SourcrSession {
  browser: Browser;
  page: Page;
}

function envOrError(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  return value;
}

export function getSourcrCredentialsFromEnv(): SourcrCredentials | SourcrLoginError {
  const username = envOrError("SOURCR_USERNAME");
  const password = envOrError("SOURCR_PASSWORD");
  if (!username || !password) {
    return { kind: "missing_credentials", message: "Sourcr login credentials missing from environment." };
  }
  return { username, password };
}

export async function createSourcrSession(): Promise<SourcrSession> {
  const credsOrError = getSourcrCredentialsFromEnv();
  if ("kind" in credsOrError) {
    throw new Error(credsOrError.message);
  }

  const storageStatePath = process.env.SOURCR_STORAGE_STATE_PATH ?? "playwright/.auth/sourcr.json";

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: undefined,
  });
  const page = await context.newPage();

  await loginToSourcr(page, credsOrError, storageStatePath);
  return { browser, page };
}

export async function loginToSourcr(page: Page, creds: SourcrCredentials, _storageStatePath: string): Promise<void> {
  const baseUrl = process.env.SOURCR_BASE_URL ?? "https://sourcr.com";
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });

  const alreadyAuthed = await isLikelyLoggedIn(page);
  if (!alreadyAuthed) {
    await performLogin(page, creds);
  }

  const authedNow = await isLikelyLoggedIn(page);
  if (!authedNow) {
    throw new Error("Sourcr login failed or session expired (authentication not confirmed).");
  }
}

async function isLikelyLoggedIn(page: Page): Promise<boolean> {
  // Placeholder heuristics. Replace selectors with stable elements from Sourcr.
  const hasLogout = await page.locator("text=Logout").first().isVisible().catch(() => false);
  if (hasLogout) return true;

  const hasDashboard = await page.locator("text=Dashboard").first().isVisible().catch(() => false);
  return hasDashboard;
}

async function performLogin(page: Page, creds: SourcrCredentials): Promise<void> {
  // Placeholder selectors. Replace with the actual username/password fields.
  await page.fill("input[name=\"username\"], input[type=\"email\"]", creds.username);
  await page.fill("input[name=\"password\"], input[type=\"password\"]", creds.password);
  await page.click("button[type=\"submit\"], button:has-text(\"Log in\"), button:has-text(\"Login\")");

  await page.waitForLoadState("domcontentloaded").catch(() => undefined);
}

export async function closeSourcrSession(session: SourcrSession): Promise<void> {
  await session.browser.close();
}

export interface UnansweredReviewCandidate {
  reviewId: string;
  rating: StarRating;
  text: string;
  reviewerName: string;
  reviewerType: ReviewerType;
}

