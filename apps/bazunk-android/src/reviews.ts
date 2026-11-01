export type Review = {
  id: number;
  rating: number;
  comment: string;
  itemTitle: string;
  createdAt: string;
  editedAt: string | null;
  reply: string | null;
  repliedAt: string | null;
  itemAsDescribed: number | null;
  dispatchRating: number | null;
  packagingRating: number | null;
  verifiedPurchase: true;
};
export type Reputation = {
  reviews: {
    total: number;
    positive: number;
    neutral: number;
    negative: number;
    average: number;
  };
  positivePercent: number | null;
  successfulSales: number;
  repeatBuyers: number;
  dispatchMedianHours: number | null;
  dispatchSampleSize: number;
  replyMedianHours: number | null;
  memberSince: string | null;
  profile: { name: string; username: string | null; verified: boolean };
};
export type OrderReviews = {
  orderId: string;
  title: string;
  status: string;
  role: "buyer_to_seller" | "seller_to_buyer";
  canCreate: boolean;
  mine:
    | (Review & {
        removed: boolean;
        canEdit: boolean;
        canDelete: boolean;
        editDeadline: string;
      })
    | null;
  received: (Review & { canReply: boolean }) | null;
};
function record(x: unknown): Record<string, unknown> {
  if (!x || typeof x !== "object" || Array.isArray(x))
    throw Error("Unexpected review response.");
  return x as Record<string, unknown>;
}
function date(x: unknown, nullable = false) {
  return (
    (nullable && x === null) ||
    (typeof x === "string" && Number.isFinite(Date.parse(x)))
  );
}
function count(x: unknown) {
  return typeof x === "number" && Number.isSafeInteger(x) && x >= 0;
}
function stars(x: unknown, nullable = false) {
  return (
    (nullable && x === null) ||
    (typeof x === "number" && Number.isInteger(x) && x >= 1 && x <= 5)
  );
}
function hours(x: unknown) {
  return x === null || (typeof x === "number" && Number.isFinite(x) && x >= 0);
}
export function parseReview(x: unknown): Review {
  const r = record(x);
  if (
    !count(r.id) ||
    r.id === 0 ||
    !stars(r.rating) ||
    typeof r.comment !== "string" ||
    typeof r.itemTitle !== "string" ||
    !date(r.createdAt) ||
    !date(r.editedAt, true) ||
    !(r.reply === null || typeof r.reply === "string") ||
    !date(r.repliedAt, true) ||
    ![r.itemAsDescribed, r.dispatchRating, r.packagingRating].every((n) =>
      stars(n, true),
    ) ||
    r.verifiedPurchase !== true
  )
    throw Error("Unexpected review response.");
  return r as unknown as Review;
}
export function parseSellerReviews(x: unknown) {
  const r = record(x),
    p = record(r.reputation),
    reviews = record(p.reviews),
    profile = record(p.profile);
  if (
    !Array.isArray(r.reviews) ||
    r.reviews.length > 10 ||
    ![
      reviews.total,
      reviews.positive,
      reviews.neutral,
      reviews.negative,
      p.successfulSales,
      p.repeatBuyers,
      p.dispatchSampleSize,
    ].every(count) ||
    Number(reviews.positive) +
      Number(reviews.neutral) +
      Number(reviews.negative) !==
      reviews.total ||
    typeof reviews.average !== "number" ||
    !Number.isFinite(reviews.average) ||
    reviews.average < 0 ||
    reviews.average > 5 ||
    !(
      p.positivePercent === null ||
      (count(p.positivePercent) && Number(p.positivePercent) <= 100)
    ) ||
    !hours(p.dispatchMedianHours) ||
    !hours(p.replyMedianHours) ||
    !date(p.memberSince, true) ||
    typeof profile.name !== "string" ||
    !(profile.username === null || typeof profile.username === "string") ||
    typeof profile.verified !== "boolean"
  )
    throw Error("Unexpected seller profile.");
  return {
    reputation: p as unknown as Reputation,
    reviews: r.reviews.map(parseReview),
  };
}
export function parseOrderReviews(x: unknown): OrderReviews {
  const r = record(x);
  if (
    typeof r.orderId !== "string" ||
    typeof r.title !== "string" ||
    typeof r.status !== "string" ||
    !["buyer_to_seller", "seller_to_buyer"].includes(String(r.role)) ||
    typeof r.canCreate !== "boolean"
  )
    throw Error("Unexpected order review response.");
  if (r.mine !== null) {
    const mine = record(r.mine);
    parseReview(mine);
    if (
      ![mine.removed, mine.canEdit, mine.canDelete].every(
        (n) => typeof n === "boolean",
      ) ||
      !date(mine.editDeadline) ||
      (mine.removed && mine.canEdit)
    )
      throw Error("Unexpected review permissions.");
  }
  if (r.received !== null) {
    const received = record(r.received);
    parseReview(received);
    if (
      typeof received.canReply !== "boolean" ||
      (received.canReply &&
        (r.role !== "seller_to_buyer" || received.reply !== null))
    )
      throw Error("Unexpected reply permissions.");
  }
  if (r.mine !== null && r.canCreate)
    throw Error("Unexpected review permissions.");
  return r as unknown as OrderReviews;
}
export function parseReviewSaved(x: unknown) {
  if (record(x).ok !== true)
    throw Error("Review change was not confirmed. Refresh before retrying.");
  return true;
}
export const reportReasons = [
  ["abusive", "Abusive content"],
  ["spam", "Spam"],
  ["personal_information", "Personal information"],
  ["not_about_transaction", "Unrelated to transaction"],
  ["other", "Other"],
] as const;
