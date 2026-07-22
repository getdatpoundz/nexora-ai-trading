import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

const createCustomerSchema = z.object({
  email: z.string().email(),
  first_name: z.string().min(1).max(80),
  last_name: z.string().min(1).max(80),
  phone: z.string().max(30).optional().nullable(),
  assigned_level_sek: z.number().int().min(2500).max(2_000_000),
  assigned_level_name: z.string().min(1).max(80),
});

function generatePassword(len = 14) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%&*";
  const all = upper + lower + digits + symbols;
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out =
    upper[bytes[0] % upper.length] +
    lower[bytes[1] % lower.length] +
    digits[bytes[2] % digits.length] +
    symbols[bytes[3] % symbols.length];
  for (let i = 4; i < len; i++) out += all[bytes[i] % all.length];
  return out;
}

export const adminCreateCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof createCustomerSchema>) =>
    createCustomerSchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const password = generatePassword(14);

    // 1. Create user with generated password (auto-confirmed so they can log in immediately)
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone ?? null,
        },
      });

    let userId = created?.user?.id;
    let existed = false;

    // If user already exists, look them up and reset their password
    if (createErr && /already|registered|exists/i.test(createErr.message)) {
      existed = true;
      const { data: list } = await supabaseAdmin.auth.admin.listUsers();
      const existing = list?.users.find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
      );
      userId = existing?.id;
      if (userId) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
        });
      }
    } else if (createErr) {
      throw new Error(createErr.message);
    }

    if (!userId) throw new Error("Kunde inte skapa användare");

    // 2. Upsert profile with assigned level
    const { error: profErr } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone ?? null,
        assigned_level_sek: data.assigned_level_sek,
        assigned_level_name: data.assigned_level_name,
        invited_at: new Date().toISOString(),
      })
      .eq("id", userId);
    if (profErr) throw new Error(profErr.message);

    return {
      user_id: userId,
      email: data.email,
      password,
      existed,
    };
  });

const resetPwSchema = z.object({ email: z.string().email() });

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof resetPwSchema>) => resetPwSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    const user = list?.users.find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );
    if (!user) throw new Error("Användaren hittades inte");
    const password = generatePassword(14);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { email: data.email, password };
  });

export const adminListCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, email, first_name, last_name, phone, assigned_level_sek, assigned_level_name, invited_at, activated_at, onboarding_completed, verification_status, cash_balance_sek",
      )
      .order("invited_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);

    // Attach latest selection status
    const ids = (profiles ?? []).map((p) => p.id);
    const { data: sels } = ids.length
      ? await supabaseAdmin
          .from("investment_selections")
          .select("user_id, onramp_status, funded_amount_sek, funded_at, created_at")
          .in("user_id", ids)
          .order("created_at", { ascending: false })
      : { data: [] as any[] };

    const latestByUser = new Map<string, any>();
    for (const s of sels ?? []) {
      if (!latestByUser.has(s.user_id)) latestByUser.set(s.user_id, s);
    }

    return (profiles ?? []).map((p) => ({
      ...p,
      latest_selection: latestByUser.get(p.id) ?? null,
    }));
  });


const markFundedSchema = z.object({ user_id: z.string().uuid() });

// Manuell kreditering — för testning innan on-ramp webhook är live
export const adminMarkFunded = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof markFundedSchema>) => markFundedSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, assigned_level_sek, cash_balance_sek")
      .eq("id", data.user_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile?.assigned_level_sek)
      throw new Error("Kunden saknar tilldelad nivå");

    const amount = profile.assigned_level_sek;

    // Find or create latest selection
    const { data: existing } = await supabaseAdmin
      .from("investment_selections")
      .select("id")
      .eq("user_id", data.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let selectionId = existing?.id;
    if (!selectionId) {
      const { data: sel, error: sErr } = await supabaseAdmin
        .from("investment_selections")
        .insert({
          user_id: data.user_id,
          level_name: "Manuell kreditering",
          selected_amount_sek: amount,
          risk_acknowledged: true,
          status: "approved",
          onramp_status: "funded",
          funded_amount_sek: amount,
          funded_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (sErr) throw new Error(sErr.message);
      selectionId = sel.id;
    } else {
      await supabaseAdmin
        .from("investment_selections")
        .update({
          onramp_status: "funded",
          funded_amount_sek: amount,
          funded_at: new Date().toISOString(),
          status: "approved",
        })
        .eq("id", selectionId);
    }

    await supabaseAdmin
      .from("profiles")
      .update({
        cash_balance_sek: (Number(profile.cash_balance_sek) || 0) + amount,
        activated_at: new Date().toISOString(),
      })
      .eq("id", data.user_id);

    return { ok: true, credited_sek: amount };
  });
