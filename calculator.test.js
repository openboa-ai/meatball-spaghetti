const test = require('node:test');
const assert = require('node:assert/strict');
const calculateGrams = require('./calculator.js');

test('calculates 100 grams per serving', () => {
  assert.equal(calculateGrams('1'), 100);
  assert.equal(calculateGrams('3'), 300);
});

test('rejects invalid serving counts', () => {
  for (const input of ['', '0', '-1', '2.5', '2abc']) {
    assert.equal(calculateGrams(input), null, `expected ${JSON.stringify(input)} to be rejected`);
  }
});
