export type Listing = { id: number; title: string; price: string | number; currency?: string; category: string; image?: string; description?: string; condition?: string; sellerEmail?: string; sellerName?: string; sellerUsername?: string; promotions?: string[] };
const base = (process.env.EXPO_PUBLIC_API_URL || 'https://bazunk-api.onrender.com/api').replace(/\/$/, '');
export async function getJson(path: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 15000);
  try {
    const response = await fetch(`${base}${path}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Could not load data (${response.status}). Please retry.`);
    const text = await response.text();
    if (!text.trim()) throw new Error('The server returned an empty response. Please try again shortly.');
    try { return JSON.parse(text); }
    catch { throw new Error('The server returned an unreadable response. Please try again shortly.'); }
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export function parseListing(value: unknown): Listing {
  const row = value as Listing;
  if (!row || !Number.isInteger(row.id) || typeof row.title !== 'string' || typeof row.category !== 'string' || !Number.isFinite(Number(row.price))) throw new Error('Unexpected listing response.');
  return row;
}
export function parseListings(value: unknown): Listing[] {
  if (!Array.isArray(value)) throw new Error('Unexpected listings response.');
  return value.map(parseListing);
}
export function price(item: Listing): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: /^[A-Z]{3}$/.test(item.currency || '') ? item.currency! : 'GBP' }).format(Number(item.price));
}

export type Account = { email: string; name: string; username: string | null };
export async function loadAccount(token: string, signal?: AbortSignal): Promise<Account> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 15000);
  try {
    const response = await fetch(`${base}/mobile/account`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : `Account request failed (${response.status}).`);
    if (!data || typeof data.email !== 'string' || typeof data.name !== 'string' || (data.username !== null && typeof data.username !== 'string')) throw new Error('Unexpected account response.');
    return data;
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}

export class ApiError extends Error {constructor(message:string,public status:number){super(message)}}
export async function memberJson(path: string, token: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<unknown> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort);
  if (options.signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 20000);
  try {
    const response = await fetch(`${base}${path}`, { method: options.method || 'GET', headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined, signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(typeof data?.error === 'string' ? data.error : `Request failed (${response.status}).`,response.status);
    return data;
  } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
}
export type OwnListing = Listing & { status: string };
export function parseOwnListings(value: unknown): OwnListing[] {
  return parseListings(value).map(row => {
    if (typeof (row as OwnListing).status !== 'string') throw new Error('Unexpected inventory response.');
    return row as OwnListing;
  });
}
