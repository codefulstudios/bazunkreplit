export type CaseKind = "return" | "dispute";
export type MemberCase = {
  id: string;
  kind: CaseKind;
  orderId: string | null;
  itemTitle: string;
  reason: string;
  condition: string | null;
  description: string;
  status: string;
  role: "buyer" | "seller";
  createdAt: string;
  updatedAt: string;
  resolution: string | null;
  refundAmount: string | null;
  sellerResponse: string | null;
  tracking: string | null;
  carrier: string | null;
  returnRequired: boolean;
  returnInstructions: string | null;
  labelUrl: string | null;
  canMessage: boolean;
  canShip: boolean;
};
export type CaseMessage = {
  id: string;
  role: "buyer" | "seller" | "admin";
  body: string;
  evidenceUrl: string | null;
  createdAt: string;
};
export type EligibleOrder = {
  id: string;
  title: string;
  createdAt: string;
  daysLeft: number | null;
};
const record = (x: unknown): Record<string, unknown> => {
  if (!x || typeof x !== "object" || Array.isArray(x))
    throw Error("Unexpected case response.");
  return x as Record<string, unknown>;
};
const date = (x: unknown) =>
  typeof x === "string" && Number.isFinite(Date.parse(x));
export function caseLink(value: string) {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password)
    throw Error("This link is not a valid HTTPS address.");
  return u.href;
}
export function parseCase(x: unknown): MemberCase {
  const r = record(x);
  if (
    !["id", "itemTitle", "reason", "description", "status"].every(
      (k) => typeof r[k] === "string",
    ) ||
    !["return", "dispute"].includes(String(r.kind)) ||
    !["buyer", "seller"].includes(String(r.role)) ||
    ![
      "orderId",
      "condition",
      "resolution",
      "refundAmount",
      "sellerResponse",
      "tracking",
      "carrier",
      "returnInstructions",
      "labelUrl",
    ].every((k) => r[k] === null || typeof r[k] === "string") ||
    ![r.createdAt, r.updatedAt].every(date) ||
    ![r.canMessage, r.canShip, r.returnRequired].every(
      (n) => typeof n === "boolean",
    ) ||
    (r.canShip && r.role !== "buyer") ||
    (r.canMessage && r.kind !== "dispute")
  )
    throw Error("Unexpected case details.");
  if (r.labelUrl) caseLink(String(r.labelUrl));
  return r as unknown as MemberCase;
}
export function parseCases(x: unknown) {
  if (!Array.isArray(x) || x.length > 25) throw Error("Unexpected case list.");
  return x.map(parseCase);
}
export function parseEligible(x: unknown): EligibleOrder[] {
  if (
    !Array.isArray(x) ||
    x.length > 25 ||
    x.some(
      (o) =>
        !o ||
        typeof o.id !== "string" ||
        typeof o.title !== "string" ||
        !date(o.createdAt) ||
        !(
          o.daysLeft === null ||
          (Number.isInteger(o.daysLeft) && o.daysLeft >= 0)
        ),
    )
  )
    throw Error("Unexpected eligible orders.");
  return x;
}
export function parseThread(x: unknown): CaseMessage[] {
  if (!Array.isArray(x) || x.length > 50)
    throw Error("Unexpected case messages.");
  return x.map((raw) => {
    const r = record(raw);
    if (
      typeof r.id !== "string" ||
      typeof r.body !== "string" ||
      !["buyer", "seller", "admin"].includes(String(r.role)) ||
      !date(r.createdAt) ||
      !(r.evidenceUrl === null || typeof r.evidenceUrl === "string")
    )
      throw Error("Unexpected case message.");
    if (r.evidenceUrl) caseLink(String(r.evidenceUrl));
    return r as unknown as CaseMessage;
  });
}
export function caseCreated(x: unknown) {
  const r = record(x);
  if (typeof r.id !== "string" || !r.id)
    throw Error(
      "Request was not confirmed. Refresh your cases before retrying.",
    );
  return r.id;
}
export function caseSaved(x: unknown) {
  if (record(x).ok !== true)
    throw Error("Change was not confirmed. Refresh before retrying.");
}
export const casePath = (kind: CaseKind) =>
  kind === "return" ? "/returns" : "/disputes";
export const returnReasons = [
  "changed_mind",
  "not_as_described",
  "damaged",
  "wrong_item",
  "faulty",
  "other",
];
export const disputeReasons = [
  "item_not_received",
  "not_as_described",
  "damaged",
  "wrong_item",
  "other",
];
export const conditions = ["unopened", "like_new", "used", "damaged"];
export const caseLabel = (value: string) => value.replace(/_/g, " ");
export const messageRef = () =>
  `msg-${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
