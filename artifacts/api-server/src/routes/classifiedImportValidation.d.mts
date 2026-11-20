export type ClassifiedBatchValidation =
  | { ok: true; status: 200 }
  | { ok: false; status: 400; error: string; invalidCount?: number };
export declare function validateClassifiedBatch(ads: unknown): ClassifiedBatchValidation;
