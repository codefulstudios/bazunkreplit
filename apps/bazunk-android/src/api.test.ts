import test from 'node:test';
import assert from 'node:assert/strict';
import { parseListing, parseListings, price } from './api';
test('rejects malformed API results rather than rendering broken cards', () => {
  for (const value of [null, {}, { error: 'failed' }, [{ id: '1', title: 'bad', price: 20, category: 'x' }]]) assert.throws(() => parseListings(value));
  assert.throws(() => parseListing({ id: 1, title: 'bad', category: 'x', price: 'oops' }));
  assert.equal(price(parseListing({ id: 1, title: 'Cage', category: 'pets', price: '20', currency: 'USD' })), 'US$20.00');
});
test('HTTP failures are surfaced rather than accepted as empty listings', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"error":"failed"}', { status: 500 });
  try { const { getJson } = await import('./api'); await assert.rejects(() => getJson('/listings'), /500/); }
  finally { globalThis.fetch = original; }
});
