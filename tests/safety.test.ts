import { describe, it, expect } from "vitest";
import {
  evaluateBp,
  evaluateWeightTrend,
  evaluateDeviations,
  evaluateSleepStreak,
} from "@/lib/safety";

describe("evaluateBp", () => {
  it("flags 11/6 as red bp_out_of_range", () => {
    const r = evaluateBp(110, 60);
    expect(r).toBeNull();
    const r2 = evaluateBp(109, 59);
    expect(r2?.level).toBe("red");
    expect(r2?.code).toBe("bp_out_of_range");
  });

  it("accepts 14/8 (in-range)", () => {
    expect(evaluateBp(140, 80)).toBeNull();
  });

  it("flags 15/9 as red", () => {
    const r = evaluateBp(151, 91);
    expect(r?.level).toBe("red");
  });
});

describe("evaluateWeightTrend", () => {
  it("returns null when no rapid loss (95 vs 97)", () => {
    expect(evaluateWeightTrend(95, 97)).toBeNull();
  });
  it("flags red rapid_weight_loss (94 vs 97)", () => {
    const r = evaluateWeightTrend(94, 97);
    expect(r?.level).toBe("red");
    expect(r?.code).toBe("rapid_weight_loss");
  });
});

describe("evaluateDeviations", () => {
  it("flags amber when 3+ deviations on 7 days", () => {
    const r = evaluateDeviations(3);
    expect(r?.level).toBe("amber");
    expect(r?.code).toBe("frequent_deviations");
  });
  it("returns null when 2 deviations", () => {
    expect(evaluateDeviations(2)).toBeNull();
  });
});

describe("evaluateSleepStreak", () => {
  it("flags amber for [4,5,5]", () => {
    const r = evaluateSleepStreak([4, 5, 5]);
    expect(r?.level).toBe("amber");
    expect(r?.code).toBe("poor_sleep_streak");
  });
  it("returns null with a single good night in the streak [4,7,5]", () => {
    expect(evaluateSleepStreak([4, 7, 5])).toBeNull();
  });
  it("returns null with fewer than 3 nights", () => {
    expect(evaluateSleepStreak([3, 4])).toBeNull();
  });
});
