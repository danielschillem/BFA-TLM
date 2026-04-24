export function pushBoundedScore(samples, score, maxSize = 600) {
  const next = [...samples, score];
  if (next.length > maxSize) {
    next.shift();
  }
  return next;
}

export function computeSessionQualityScore(samples) {
  if (!samples.length) return 0;
  const avg = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  return Math.round(avg);
}

export function computeFallbackRate(fallbackCount, weakNetworkSamples) {
  const denominator = Math.max(weakNetworkSamples, 1);
  return Number(((fallbackCount / denominator) * 100).toFixed(2));
}

