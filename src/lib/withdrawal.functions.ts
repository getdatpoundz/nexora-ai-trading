import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const createSchema = z.object({
  amount_sek: z.number().positive().max(10_000_000),
  btc_address: z
    .string()
    .trim()
    .min(20)
    .max(120)
    .regex(/^(bc1|tb1|[13])[a-zA-HJ-NP-Z0-9]{15,90}$/i, "Ogiltig BTC-adress"),
});

export const createWithdrawalRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof createSchema>) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("cash_balance_sek, withdrawals_enabled, withdrawal_block_reason")
      .eq("id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("Profil saknas");
    if (!profile.withdrawals_enabled)
      throw new Error(
        profile.withdrawal_block_reason ??
          "Uttag är spärrat. Kontakta support för verifiering.",
      );
    if (Number(profile.cash_balance_sek) < data.amount_sek)
      throw new Error("Otillräckligt saldo");

    const { data: pending } = await supabase
      .from("withdrawal_requests")
      .select("amount_sek")
      .eq("user_id", userId)
      .eq("status", "pending");
    const pendingSum = (pending ?? []).reduce(
      (s, r) => s + Number(r.amount_sek ?? 0),
      0,
    );
    if (pendingSum + data.amount_sek > Number(profile.cash_balance_sek))
      throw new Error(
        "Du har redan väntande uttagsförfrågningar som täcker ditt saldo",
      );

    const { data: created, error } = await supabase
      .from("withdrawal_requests")
      .insert({
        user_id: userId,
        amount_sek: data.amount_sek,
        btc_address: data.btc_address,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const listMyWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("withdrawal_requests")
      .select("id, amount_sek, btc_address, status, admin_note, created_at, reviewed_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const cancelSchema = z.object({ id: z.string().uuid() });

export const cancelMyWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof cancelSchema>) => cancelSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("withdrawal_requests")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const adminListWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("withdrawal_requests")
      .select(
        "id, user_id, amount_sek, btc_address, status, admin_note, created_at, reviewed_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((data ?? []).map((r) => r.user_id)));
    const { data: profiles } = ids.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, email, first_name, last_name, cash_balance_sek")
          .in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return (data ?? []).map((r) => ({ ...r, customer: map.get(r.user_id) ?? null }));
  });

const decideSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().max(500).optional(),
  block_future_withdrawals: z.boolean().optional(),
});

export const adminDecideWithdrawal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof decideSchema>) => decideSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: wr, error: wrErr } = await supabaseAdmin
      .from("withdrawal_requests")
      .select("id, user_id, amount_sek, status")
      .eq("id", data.id)
      .maybeSingle();
    if (wrErr || !wr) throw new Error("Uttag hittades inte");
    if (wr.status !== "pending") throw new Error("Redan behandlad");

    const nowIso = new Date().toISOString();

    if (data.decision === "approve") {
      const { data: prof, error: pErr } = await supabaseAdmin
        .from("profiles")
        .select("cash_balance_sek")
        .eq("id", wr.user_id)
        .maybeSingle();
      if (pErr || !prof) throw new Error("Kund saknas");
      const balance = Number(prof.cash_balance_sek);
      if (balance < Number(wr.amount_sek))
        throw new Error("Kundens saldo räcker inte längre");

      const { error: uErr } = await supabaseAdmin
        .from("profiles")
        .update({ cash_balance_sek: balance - Number(wr.amount_sek) })
        .eq("id", wr.user_id);
      if (uErr) throw new Error(uErr.message);

      await supabaseAdmin
        .from("withdrawal_requests")
        .update({
          status: "approved",
          admin_note: data.note ?? null,
          reviewed_by: context.userId,
          reviewed_at: nowIso,
        })
        .eq("id", wr.id);
    } else {
      await supabaseAdmin
        .from("withdrawal_requests")
        .update({
          status: "rejected",
          admin_note: data.note ?? null,
          reviewed_by: context.userId,
          reviewed_at: nowIso,
        })
        .eq("id", wr.id);

      if (data.block_future_withdrawals) {
        await supabaseAdmin
          .from("profiles")
          .update({
            withdrawals_enabled: false,
            withdrawal_block_reason:
              data.note ??
              "Ditt uttag kräver ytterligare verifiering. Kontakta support.",
          })
          .eq("id", wr.user_id);
      }
    }
    return { ok: true };
  });

const toggleSchema = z.object({
  user_id: z.string().uuid(),
  enabled: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const adminSetWithdrawalsEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof toggleSchema>) => toggleSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        withdrawals_enabled: data.enabled,
        withdrawal_block_reason: data.enabled ? null : data.reason ?? null,
      })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
