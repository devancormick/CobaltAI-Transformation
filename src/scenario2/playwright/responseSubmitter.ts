import type { Page } from "playwright";
import type { StarRating } from "../../core/types";

export type SourcrSubmitError =
  | { kind: "login_required"; message: string }
  | { kind: "already_responded"; message: string }
  | { kind: "layout_changed"; message: string }
  | { kind: "unexpected"; message: string };

export interface SubmitResponseResult {
  submitted: boolean;
  alreadyResponded: boolean;
}

export async function submitApprovedResponse(params: {
  page: Page;
  reviewId: string;
  responseText: string;
  ratingHint?: StarRating;
}): Promise<SubmitResponseResult> {
  const { page, reviewId, responseText } = params;

  try {
    const hasReviewsUI = await page.locator("text=Reviews").first().isVisible().catch(() => false);
    if (!hasReviewsUI) {
      throw { kind: "login_required", message: "Cannot submit response; reviews UI not present." } satisfies SourcrSubmitError;
    }

    // Placeholder selectors. Replace with stable Sourcr DOM hooks.
    const reviewCard = page.locator(`[data-review-id=\"${reviewId}\"]`).first();
    const alreadyHasResponse = await reviewCard
      .locator("[data-testid*=response], .response, text=/\\b(response|reply)\\b/i")
      .first()
      .isVisible()
      .catch(() => false);

    if (alreadyHasResponse) {
      return { submitted: false, alreadyResponded: true };
    }

    const responseTextarea = reviewCard.locator("textarea").first();
    if (!responseTextarea) {
      throw { kind: "layout_changed", message: "Response textarea not found (layout changed?)." } satisfies SourcrSubmitError;
    }

    await responseTextarea.fill(responseText);
    await reviewCard.locator("button[type=\"submit\"], button:has-text(\"Submit\"), button:has-text(\"Send\")").first().click();

    await page.waitForLoadState("domcontentloaded").catch(() => undefined);
    return { submitted: true, alreadyResponded: false };
  } catch (err) {
    const e = err as SourcrSubmitError;
    if (typeof e === "object" && e && "kind" in e) throw e;
    throw { kind: "unexpected", message: "Unexpected error while submitting Sourcr response." } satisfies SourcrSubmitError;
  }
}

