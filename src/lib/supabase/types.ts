// Generated types placeholder. Replace with:
//   pnpm dlx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [k: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profile: {
        Row: {
          id: string;
          display_name: string;
          start_date: string;
          target_weight_kg: number;
          target_waist_cm: number;
          target_bf_pct: number;
          baseline_weight_kg: number;
          baseline_waist_cm: number;
          baseline_bf_pct: number;
          doctor_phone: string | null;
          disable_pm_coffee: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profile"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profile"]["Row"]>;
      };
      daily_log: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
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
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["daily_log"]["Row"],
          "id" | "created_at" | "updated_at"
        > & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["daily_log"]["Row"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
