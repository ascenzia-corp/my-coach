// Hand-written Database types. Regenerate with:
//   pnpm dlx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [k: string]: Json | undefined }
  | Json[];

type TimestampStr = string;
type DateStr = string;

export type DailyLogRow = {
  id: string;
  user_id: string;
  log_date: DateStr;
  weight_kg: number | null;
  waist_cm: number | null;
  ketones_mmol: number | null;
  bp_morning_sys: number | null;
  bp_morning_dia: number | null;
  bp_evening_sys: number | null;
  bp_evening_dia: number | null;
  energy_10: number | null;
  hunger_10: number | null;
  sleep_hours: number | null;
  sleep_quality_10: number | null;
  deviation: boolean | null;
  deviation_detail: string | null;
  water_l: number | null;
  salt_g: number | null;
  magnesium_mg: number | null;
  potassium_g: number | null;
  notes: string | null;
  created_at: TimestampStr;
  updated_at: TimestampStr;
};

export type ProfileRow = {
  id: string;
  display_name: string;
  start_date: DateStr;
  target_weight_kg: number;
  target_waist_cm: number;
  target_bf_pct: number;
  baseline_weight_kg: number;
  baseline_waist_cm: number;
  baseline_bf_pct: number;
  doctor_phone: string | null;
  disable_pm_coffee: boolean;
  created_at: TimestampStr;
};

export type MealLogRow = {
  id: string;
  user_id: string;
  log_date: DateStr;
  meal_type: "petit_dej" | "dejeuner" | "collation" | "refeed" | "rupture_jeune";
  taken: boolean;
  deviation: boolean;
  deviation_detail: string | null;
  protein_g: number | null;
  veggies_g: number | null;
  net_carbs_g: number | null;
  notes: string | null;
  logged_at: TimestampStr;
};

export type TrainingLogRow = {
  id: string;
  user_id: string;
  log_date: DateStr;
  session_type:
    | "push"
    | "pull_jambes"
    | "hiit"
    | "abdos_mobilite"
    | "tapis"
    | "marche"
    | "repos"
    | "rupture_protocole";
  completed: boolean;
  duration_min: number | null;
  notes: string | null;
  logged_at: TimestampStr;
};

export type PingLogRow = {
  id: string;
  user_id: string;
  ping_slot: string;
  scheduled_at: TimestampStr;
  acknowledged_at: TimestampStr | null;
  action_done: boolean | null;
  sensation_global_10: number | null;
  notes: string | null;
};

export type WeeklyReviewRow = {
  id: string;
  user_id: string;
  week_start: DateStr;
  weight_avg_kg: number | null;
  weight_delta_kg: number | null;
  waist_cm: number | null;
  waist_delta_cm: number | null;
  ketones_avg: number | null;
  sessions_done: number | null;
  sessions_planned: number | null;
  deviations: number | null;
  sleep_avg_h: number | null;
  energy_avg_10: number | null;
  verdict: "on_track" | "retard" | "avance" | null;
  adjustments: string | null;
  created_at: TimestampStr;
};

export type PhotoRow = {
  id: string;
  user_id: string;
  log_date: DateStr;
  pose: "face" | "profil" | "dos";
  storage_path: string;
  uploaded_at: TimestampStr;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_label: string | null;
  created_at: TimestampStr;
};

export type NotificationScheduleRow = {
  id: string;
  user_id: string;
  slot_label: string;
  cron_expression: string;
  title: string;
  body: string;
  enabled: boolean;
  deep_link: string | null;
};

export type ErrorLogRow = {
  id: string;
  user_id: string | null;
  source: string;
  type: string;
  severity: "info" | "amber" | "red";
  message: string;
  context: Json | null;
  created_at: TimestampStr;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      profile: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      daily_log: {
        Row: DailyLogRow;
        Insert: Partial<DailyLogRow> & { user_id: string; log_date: string };
        Update: Partial<DailyLogRow>;
        Relationships: [];
      };
      meal_log: {
        Row: MealLogRow;
        Insert: Partial<MealLogRow> & { user_id: string; log_date: string; meal_type: MealLogRow["meal_type"] };
        Update: Partial<MealLogRow>;
        Relationships: [];
      };
      training_log: {
        Row: TrainingLogRow;
        Insert: Partial<TrainingLogRow> & { user_id: string; log_date: string; session_type: TrainingLogRow["session_type"] };
        Update: Partial<TrainingLogRow>;
        Relationships: [];
      };
      ping_log: {
        Row: PingLogRow;
        Insert: Partial<PingLogRow> & { user_id: string; ping_slot: string; scheduled_at: string };
        Update: Partial<PingLogRow>;
        Relationships: [];
      };
      weekly_review: {
        Row: WeeklyReviewRow;
        Insert: Partial<WeeklyReviewRow> & { user_id: string; week_start: string };
        Update: Partial<WeeklyReviewRow>;
        Relationships: [];
      };
      photo: {
        Row: PhotoRow;
        Insert: Partial<PhotoRow> & { user_id: string; log_date: string; pose: PhotoRow["pose"]; storage_path: string };
        Update: Partial<PhotoRow>;
        Relationships: [];
      };
      push_subscription: {
        Row: PushSubscriptionRow;
        Insert: Partial<PushSubscriptionRow> & { user_id: string; endpoint: string; p256dh: string; auth: string };
        Update: Partial<PushSubscriptionRow>;
        Relationships: [];
      };
      notification_schedule: {
        Row: NotificationScheduleRow;
        Insert: Partial<NotificationScheduleRow> & {
          user_id: string;
          slot_label: string;
          cron_expression: string;
          title: string;
          body: string;
        };
        Update: Partial<NotificationScheduleRow>;
        Relationships: [];
      };
      error_log: {
        Row: ErrorLogRow;
        Insert: Partial<ErrorLogRow> & { source: string; type: string; severity: ErrorLogRow["severity"]; message: string };
        Update: Partial<ErrorLogRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
