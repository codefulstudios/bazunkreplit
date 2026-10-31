export type LegalKind = "terms" | "privacy";
export type LegalRegion = "uk" | "eu" | "usa";
export type LegalSection = { title: string; body: string };
export type LegalDocument = {
  kind: LegalKind;
  region: LegalRegion;
  title: string;
  updatedAt: string;
  updatedLabel: string;
  summary: string;
  regionLabel: string;
  regionalSummary: string;
  regionalSections: LegalSection[];
  sharedSections: LegalSection[];
};
export const legalRegions = [
  { id: "uk", label: "United Kingdom" },
  { id: "eu", label: "European Union" },
  { id: "usa", label: "United States" },
] as const;
function text(value: unknown, max: number) {
  return (
    typeof value === "string" && value.trim().length > 0 && value.length <= max
  );
}
function sections(value: unknown): value is LegalSection[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 100 &&
    value.every((s) => s && text(s.title, 300) && text(s.body, 20000))
  );
}
export function parseLegalDocument(
  value: unknown,
  kind: LegalKind,
  region: LegalRegion,
): LegalDocument {
  const d = value as LegalDocument;
  if (
    !d ||
    d.kind !== kind ||
    d.region !== region ||
    !text(d.title, 150) ||
    !text(d.summary, 4000) ||
    !text(d.regionalSummary, 4000) ||
    !text(d.regionLabel, 100) ||
    !text(d.updatedLabel, 100) ||
    typeof d.updatedAt !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(d.updatedAt) ||
    !Number.isFinite(Date.parse(d.updatedAt)) ||
    !sections(d.regionalSections) ||
    !sections(d.sharedSections)
  )
    throw Error("The policy response was incomplete. Please retry.");
  return d;
}
export function searchLegalSections(sections: LegalSection[], query: string) {
  const q = query.trim().toLocaleLowerCase();
  return q
    ? sections.filter((s) =>
        (s.title + " " + s.body).toLocaleLowerCase().includes(q),
      )
    : sections;
}
