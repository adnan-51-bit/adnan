const seen = new Set();

export function isDuplicate(key) {
  if (!key) return false;
  if (seen.has(key)) return true;
  seen.add(key);
  return false;
}

export function clearIdempotencyForTests() {
  seen.clear();
}
