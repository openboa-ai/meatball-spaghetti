function calculateGrams(input) {
  var value = input.trim();
  if (!/^\d+$/.test(value)) return null;
  var servings = Number(value);
  if (!Number.isSafeInteger(servings) || servings <= 0 || !Number.isSafeInteger(servings * 100)) return null;
  return servings * 100;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = calculateGrams;
}
