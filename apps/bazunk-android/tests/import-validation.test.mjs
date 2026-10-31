import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decimalValue, positiveQuantity, validEbayImage, supplierPrice, importCounts } from '../src/utils/importValidation.ts';
test('prices and markup accept decimal keyboards and reject malformed amounts', () => {
  for (const [input, expected] of [['12.50',12.5],['12,50',12.5],[' 0 ',0],['35',35]]) assert.equal(decimalValue(input), expected);
  for (const input of ['', ' ', '-1', 'Infinity', 'NaN', '1e3', '0x10', '1.234', '1,234.56', '9'.repeat(400)]) assert.equal(decimalValue(input), null, input);
});
test('supplier prices reject unavailable or invalid values instead of displaying NaN', () => {
  for (const input of [undefined, null, false, true, '', ' ', 'NaN', NaN, Infinity, -1, 0, {}, [], '1e3']) assert.equal(supplierPrice(input), null);
  for (const [input, expected] of [[12.5, 12.5], ['12.50', 12.5], ['12,50', 12.5]]) assert.equal(supplierPrice(input), expected);
});
test('import confirmation requires nonnegative safe counts', () => {
  assert.deepEqual(importCounts(2, 1), { imported: 2, skipped: 1 });
  assert.deepEqual(importCounts(0, undefined), { imported: 0, skipped: 0 });
  for (const value of [-1, 1.5, '2', null, undefined, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => importCounts(value, 0), /not confirmed/);
  for (const value of [-1, 1.5, '2', null, NaN, Infinity]) assert.throws(() => importCounts(1, value), /not confirmed/);
});
test('stock must be a positive safe whole number', () => {
  assert.equal(positiveQuantity(' 12 '), 12);
  for (const input of ['', '0', '-1', '1.5', '1e3', 'Infinity', '9007199254740992']) assert.equal(positiveQuantity(input), null, input);
});
test('optional image only accepts HTTPS eBay image hosts', () => {
  for (const input of ['', ' https://i.ebayimg.com/images/test.jpg ', 'https://ebayimg.com/photo.jpg']) assert.equal(validEbayImage(input), true, input);
  for (const input of ['http://i.ebayimg.com/a', 'https://ebayimg.com.evil.test/a', 'https://fakeebayimg.com/a', 'https://user:pass@i.ebayimg.com/a', 'https://i.ebayimg.com:444/a', 'not a url']) assert.equal(validEbayImage(input), false, input);
});
