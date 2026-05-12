// Pure safety-rule evaluation for the Eliquis protocol.
// Tested by tests/safety.test.ts.

import { SAFETY_THRESHOLDS } from "./protocol";

export type SafetyAlertCode =
  | "bp_out_of_range"
  | "rapid_weight_loss"
  | "frequent_deviations"
  | "poor_sleep_streak";

export type SafetyAlert = {
  level: "red" | "amber";
  code: SafetyAlertCode;
  message: string;
};

export function evaluateBp(sys: number, dia: number): SafetyAlert | null {
  const {
    bp_sys_min,
    bp_sys_max,
    bp_dia_min,
    bp_dia_max,
  } = SAFETY_THRESHOLDS;
  if (sys < bp_sys_min || sys > bp_sys_max || dia < bp_dia_min || dia > bp_dia_max) {
    return {
      level: "red",
      code: "bp_out_of_range",
      message: `Tension ${sys}/${dia} hors bornes (${bp_sys_min}-${bp_sys_max}/${bp_dia_min}-${bp_dia_max}).`,
    };
  }
  return null;
}

export function evaluateWeightTrend(today: number, sevenDaysAgo: number): SafetyAlert | null {
  const delta = today - sevenDaysAgo;
  if (delta < -SAFETY_THRESHOLDS.weight_loss_red_kg_7d) {
    return {
      level: "red",
      code: "rapid_weight_loss",
      message: `Perte de ${Math.abs(delta).toFixed(1)} kg en 7 jours — risque déshydratation (Eliquis).`,
    };
  }
  return null;
}

export function evaluateDeviations(deviationsLast7Days: number): SafetyAlert | null {
  if (deviationsLast7Days >= SAFETY_THRESHOLDS.deviation_amber_count_7d) {
    return {
      level: "amber",
      code: "frequent_deviations",
      message: `${deviationsLast7Days} écarts sur 7 jours — audit recommandé.`,
    };
  }
  return null;
}

export function evaluateSleepStreak(lastThreeNightsQuality: number[]): SafetyAlert | null {
  const n = SAFETY_THRESHOLDS.sleep_streak_nights;
  if (lastThreeNightsQuality.length < n) return null;
  const recent = lastThreeNightsQuality.slice(-n);
  const allBad = recent.every((q) => q < SAFETY_THRESHOLDS.sleep_quality_red_threshold);
  if (allBad) {
    return {
      level: "amber",
      code: "poor_sleep_streak",
      message: `${n} nuits qualité < 6/10 — café post-déjeuner désactivé.`,
    };
  }
  return null;
}

export function evaluateAll(input: {
  bp?: { sys: number; dia: number };
  weight?: { today: number; sevenDaysAgo: number };
  deviationsLast7Days?: number;
  lastThreeNightsQuality?: number[];
}): SafetyAlert[] {
  const out: SafetyAlert[] = [];
  if (input.bp) {
    const r = evaluateBp(input.bp.sys, input.bp.dia);
    if (r) out.push(r);
  }
  if (input.weight) {
    const r = evaluateWeightTrend(input.weight.today, input.weight.sevenDaysAgo);
    if (r) out.push(r);
  }
  if (typeof input.deviationsLast7Days === "number") {
    const r = evaluateDeviations(input.deviationsLast7Days);
    if (r) out.push(r);
  }
  if (input.lastThreeNightsQuality) {
    const r = evaluateSleepStreak(input.lastThreeNightsQuality);
    if (r) out.push(r);
  }
  return out;
}
