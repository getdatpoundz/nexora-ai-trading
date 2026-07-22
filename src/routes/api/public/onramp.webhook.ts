import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Webhook från on-ramp (Transak). Krediterar kundens konto när kryptot bekräftats.
// Konfigurera i Transak-dashboarden:
//   URL: https://<din-domän>/api/public/onramp/webhook
//   Signaturhemlighet: env TRANSAK_WEBHOOK_SECRET

export const Route = createFileRoute("/api/public/onramp/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.TRANSAK_WEBHOOK_SECRET;
        const body = await request.text();

        // Signaturverifiering (om secret finns)
        if (secret) {
          const sig = request.headers.get("x-transak-signature") ?? "";
          const expected = createHmac("sha256", secret).update(body).digest("hex");
          const a = Buffer.from(sig);
          const b = Buffer.from(expected);
          if (a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Invalid signature", { status: 401 });
          }
        }

        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const eventType: string = payload?.eventID || payload?.webhookOrderID || payload?.event || "unknown";
        const order = payload?.webhookData || payload?.data || payload;
        const providerOrderId: string =
          order?.partnerOrderId || order?.id || order?.orderId || "";
        const status: string = String(order?.status || "").toUpperCase();
        const fiatAmount = Number(order?.fiatAmount || 0);
        const fiatCurrency = order?.fiatCurrency || "SEK";
        const cryptoAmount = Number(order?.cryptoAmount || 0);
        const cryptoCurrency = order?.cryptoCurrency || null;
        const walletAddress = order?.walletAddress || null;
        const txHash = order?.transactionHash || order?.txHash || null;

        if (!providerOrderId) {
          return new Response("Missing order id", { status: 400 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Hitta selection via id (partnerOrderId = selection.id)
        const { data: selection } = await supabaseAdmin
          .from("investment_selections")
          .select("id, user_id, selected_amount_sek, onramp_status")
          .eq("id", providerOrderId)
          .maybeSingle();

        // Logga händelsen (idempotent på provider + order + event_type)
        await supabaseAdmin.from("onramp_events").upsert(
          {
            provider: "transak",
            provider_order_id: providerOrderId,
            selection_id: selection?.id ?? null,
            user_id: selection?.user_id ?? null,
            event_type: eventType,
            status,
            fiat_amount: fiatAmount || null,
            fiat_currency: fiatCurrency,
            crypto_amount: cryptoAmount || null,
            crypto_currency: cryptoCurrency,
            wallet_address: walletAddress,
            tx_hash: txHash,
            raw: payload,
          },
          { onConflict: "provider,provider_order_id,event_type" },
        );

        if (!selection) return new Response("ok", { status: 200 });

        // Mappa status → onramp_status
        let newStatus: string | null = null;
        if (status === "COMPLETED" || status === "SUCCESS") newStatus = "funded";
        else if (status === "PROCESSING" || status === "PAYMENT_DONE") newStatus = "confirming";
        else if (status === "AWAITING_PAYMENT_FROM_USER") newStatus = "awaiting_transfer";
        else if (status === "FAILED" || status === "EXPIRED") newStatus = "failed";
        else if (status === "CANCELLED") newStatus = "cancelled";

        if (newStatus) {
          await supabaseAdmin
            .from("investment_selections")
            .update({
              onramp_status: newStatus,
              ...(newStatus === "funded"
                ? {
                    funded_amount_sek: selection.selected_amount_sek,
                    funded_at: new Date().toISOString(),
                    status: "approved",
                  }
                : {}),
            })
            .eq("id", selection.id);

          // Kreditera portföljen (bara första gången)
          if (newStatus === "funded" && selection.onramp_status !== "funded") {
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("cash_balance_sek")
              .eq("id", selection.user_id)
              .maybeSingle();
            const current = Number(profile?.cash_balance_sek) || 0;
            await supabaseAdmin
              .from("profiles")
              .update({
                cash_balance_sek: current + selection.selected_amount_sek,
                activated_at: new Date().toISOString(),
              })
              .eq("id", selection.user_id);
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
