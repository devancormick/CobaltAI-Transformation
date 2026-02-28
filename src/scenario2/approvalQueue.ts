import { promises as fs } from "node:fs";
import path from "node:path";
import type { ClaudeRoutingPath } from "../core/types";

export type ApprovalStage = "none" | "senior" | "standard";
export type ApprovalStatus = "pending" | "approved";

export interface ApprovalQueueItem {
  reviewId: string;
  routingPath: ClaudeRoutingPath;
  approvalStage: Exclude<ApprovalStage, "none">;
  requestedAt: string;
  requestedBy: string;
  draftText: string;
  status: ApprovalStatus;
  approvedAt?: string;
  approvedBy?: string;
  approvedResponseText?: string;
}

export interface ApprovalQueueUpdate {
  reviewId: string;
  approvedBy: string;
  approvedAt: string;
  approvedResponseText: string;
}

function getQueuePath(): string {
  return process.env.SOURCR_APPROVAL_QUEUE_PATH ?? "test-output/approval-queue.json";
}

async function readQueue(): Promise<ApprovalQueueItem[]> {
  const queuePath = getQueuePath();
  try {
    const raw = await fs.readFile(queuePath, "utf8");
    return JSON.parse(raw) as ApprovalQueueItem[];
  } catch {
    return [];
  }
}

async function writeQueue(items: ApprovalQueueItem[]): Promise<void> {
  const queuePath = getQueuePath();
  await fs.mkdir(path.dirname(queuePath), { recursive: true });
  await fs.writeFile(queuePath, JSON.stringify(items, null, 2), "utf8");
}

export async function upsertPendingApproval(item: ApprovalQueueItem): Promise<void> {
  const items = await readQueue();
  const next = items.filter((x) => x.reviewId !== item.reviewId);
  next.push(item);
  await writeQueue(next);
}

export async function getApprovedResponseForReview(reviewId: string): Promise<Pick<ApprovalQueueItem, "approvedBy" | "approvedAt" | "approvedResponseText"> | null> {
  const items = await readQueue();
  const match = items.find((x) => x.reviewId === reviewId && x.status === "approved");
  if (!match) return null;
  return { approvedBy: match.approvedBy ?? "unknown", approvedAt: match.approvedAt ?? match.requestedAt, approvedResponseText: match.approvedResponseText ?? match.draftText };
}

export async function markApproved(update: ApprovalQueueUpdate): Promise<void> {
  const items = await readQueue();
  const next = items.map((x) =>
    x.reviewId === update.reviewId
      ? { ...x, status: "approved" as const, approvedAt: update.approvedAt, approvedBy: update.approvedBy, approvedResponseText: update.approvedResponseText }
      : x,
  );
  await writeQueue(next);
}

