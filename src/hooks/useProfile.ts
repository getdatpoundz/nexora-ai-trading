import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  verification_status: string;
  onboarding_completed: boolean;
  risk_profile: string | null;
  active_strategy: string | null;
  cash_balance_sek: number | null;
  tour_completed: boolean | null;
  assigned_level_name: string | null;
  assigned_level_sek: number | null;
};

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId as string).maybeSingle();
      if (!cancelled) {
        setProfile(data as unknown as Profile | null);
        setLoading(false);
      }
    }
    load();
    // Live refresh when bot updates cash balance
    const ch = supabase
      .channel(`profile-${userId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` }, () => load())
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [userId]);

  return { profile, loading, setProfile };
}
