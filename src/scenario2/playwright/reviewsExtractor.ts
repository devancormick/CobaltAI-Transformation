import type { Page } from "playwright";
import type { ReviewerType, StarRating } from "../../core/types";

export type SourcrExtractionError =
  | { kind: "layout_changed"; message: string }
  | { kind: "authentication_missing"; message: string }
  | { kind: "unexpected"; message: string };

export interface UnansweredReview {
  reviewId: string;
  rating: StarRating;
  text: string;
  reviewerName: string;
  reviewerType: ReviewerType;
}

function parseStarRating(raw: string): StarRating | undefined {
  const normalized = raw.trim().toLowerCase();
  const match = normalized.match(/([1-5])\s*(star|stars)?/);
  if (!match) return undefined;
  const n = Number(match[1]);
  if (n < 1 || n > 5) return undefined;
  return n as StarRating;
}

export async function extractUnansweredReviews(page: Page): Promise<UnansweredReview[]> {
  try {
    const hasAuthenticatedUI = await page.locator("text=Reviews").first().isVisible().catch(() => false);
    if (!hasAuthenticatedUI) {
      throw { kind: "authentication_missing", message: "Sourcr UI not present; session may be expired." } satisfies SourcrExtractionError;
    }

    // Placeholder selectors. Replace with stable Sourcr DOM hooks.
    const reviewCards = page.locator("[data-testid^=\"review\"], .review-card, .review");
    const count = await reviewCards.count();
    const results: UnansweredReview[] = [];

    for (let i = 0; i < count; i++) {
      const card = reviewCards.nth(i);

      const alreadyHasResponse = await card
        .locator("[data-testid*=response], .response, text=/\\b(response|reply)\\b/i")
        .first()
        .isVisible()
        .catch(() => false);
      if (alreadyHasResponse) continue;

      const reviewText = (await card.locator(".review-text, [data-testid*=text]").first().innerText().catch(() => "")).trim();
      const reviewerName = (await card.locator(".reviewer-name, [data-testid*=name]").first().innerText().catch(() => "")).trim();
      const reviewId = (await card.getAttribute("data-review-id").catch(() => undefined)) ?? `row-${i}`;

      const ratingRaw = (await card.locator(".rating, [data-testid*=rating]").first().innerText().catch(() => "")).trim();
      const rating = parseStarRating(ratingRaw) ?? parseStarRating(reviewText);
      if (!rating) {
        // Treat missing rating as layout change so it alerts via scenario 2 failure handling.
        throw { kind: "layout_changed", message: "Could not parse star rating for an unanswered review (layout changed?)." } satisfies SourcrExtractionError;
      }

      const reviewerType: ReviewerType = (await card.locator(".reviewer-type, [data-testid*=type]").first().innerText().catch(() => "")) // placeholder
        .toLowerCase()
        .includes("candidate")
        ? "candidate"
        : "client";

      if (!reviewText || !reviewerName) continue;

      results.push({ reviewId, rating, text: reviewText, reviewerName, reviewerType });
    }

    return results;
  } catch (err) {
    const e = err as SourcrExtractionError;
    if (typeof e === "object" && e && "kind" in e) throw e;
    throw { kind: "unexpected", message: "Unexpected error while extracting Sourcr unanswered reviews." } satisfies SourcrExtractionError;
  }
}

