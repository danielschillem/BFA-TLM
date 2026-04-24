import {
  computeFallbackRate,
  computeSessionQualityScore,
  pushBoundedScore,
} from "@/pages/consultations/visioMetrics";

describe("visio metrics helpers", () => {
  test("pushBoundedScore keeps max bounded size", () => {
    const initial = [10, 20, 30];
    const next = pushBoundedScore(initial, 40, 3);
    expect(next).toEqual([20, 30, 40]);
  });

  test("computeSessionQualityScore returns rounded average", () => {
    expect(computeSessionQualityScore([100, 50, 75])).toBe(75);
    expect(computeSessionQualityScore([])).toBe(0);
  });

  test("computeFallbackRate guards against division by zero", () => {
    expect(computeFallbackRate(2, 0)).toBe(200);
    expect(computeFallbackRate(1, 4)).toBe(25);
  });
});

