// Constantes du protocole MyCoach. Source: PROTOCOLE_COACH.md.

export const PROGRAM_START_ISO = "2026-05-12"; // J1 reset (mardi)
export const PROGRAM_DURATION_DAYS = 112; // 16 semaines

export type SessionType =
  | "push"
  | "pull_jambes"
  | "hiit"
  | "abdos_mobilite"
  | "tapis"
  | "marche"
  | "repos"
  | "rupture_protocole";

// Planning hebdomadaire (clé = jour ISO 1=lundi … 7=dimanche)
export const TRAINING_PLAN: Record<number, { type: SessionType; label: string; duration_min: number }> = {
  1: { type: "push", label: "PUSH (pecs/épaules/triceps)", duration_min: 45 },
  2: { type: "tapis", label: "Tapis 1h pendant travail", duration_min: 60 },
  3: { type: "pull_jambes", label: "PULL + JAMBES", duration_min: 50 },
  4: { type: "tapis", label: "Tapis 1h pendant travail", duration_min: 60 },
  5: { type: "hiit", label: "HIIT 25 min", duration_min: 25 },
  6: { type: "abdos_mobilite", label: "ABDOS + mobilité + marche 45 min", duration_min: 40 },
  7: { type: "marche", label: "Repos actif — messe + marche famille", duration_min: 45 },
};

export const PHASE = {
  phase1_weeks: 4,
  phase2_starts_week: 5,
} as const;

export const TARGETS = {
  hydration_l: 3.0,
  salt_g_min: 3,
  salt_g_max: 5,
  magnesium_mg: 400,
  potassium_g_min: 1,
  potassium_g_max: 2,
  protein_g_min: 150,
  protein_g_max: 160,
  net_carbs_g_phase1: 20,
  ketones_min_mmol: 0.5,
  weekly_weight_loss_min_kg: 0.5,
  weekly_weight_loss_max_kg: 0.9,
} as const;

export const SAFETY_THRESHOLDS = {
  bp_sys_min: 110,
  bp_sys_max: 150,
  bp_dia_min: 60,
  bp_dia_max: 90,
  weight_loss_red_kg_7d: 2.0,
  deviation_amber_count_7d: 3,
  sleep_quality_red_threshold: 6,
  sleep_streak_nights: 3,
} as const;

export const FEEDING_WINDOW = {
  start: "06:30",
  end: "14:00",
};

export const MEAL_TYPES = [
  { value: "petit_dej", label: "Petit-déjeuner" },
  { value: "dejeuner", label: "Déjeuner" },
  { value: "collation", label: "Collation" },
  { value: "refeed", label: "Refeed dominical" },
  { value: "rupture_jeune", label: "Rupture de jeûne" },
] as const;
export type MealType = (typeof MEAL_TYPES)[number]["value"];
