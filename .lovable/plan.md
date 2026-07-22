# Plan: Admin-styrd onboarding med riktigt kryptoköp

## Kundresan (målet)

```text
Du skickar länk  →  Kund loggar in  →  Ser sin tilldelade nivå (t.ex. 5 000 kr)
       →  Kort onboarding (KYC-light + villkor)
       →  Köper krypto för exakt beloppet med kort (via on-ramp-partner)
       →  Kryptot skickas automatiskt till Nexoras mottagningsadress
       →  Portföljen krediteras med 5 000 kr — klart
```

Ingen självregistrering. Ingen "välj belopp". Kunden ser bara sin nivå och en enda knapp: **Aktivera ditt konto**.

## Admin-flöde (du)

1. **Skapa kund** i `/admin`: e-post + förnamn + efternamn + investeringsnivå (2 500 – 1 000 000 kr).
2. System skapar Supabase-user, sätter `assigned_level_sek` på profilen, och genererar en **magic link** som du kopierar och skickar till kunden (SMS/mail/WhatsApp).
3. Du ser status per kund: `inbjuden → inloggad → onboarding klar → betalning påbörjad → krypto mottagen → krediterad`.

## Kundflöde (steg för steg)

1. **Inloggning** — magic link öppnar `/auth/callback` → `/welcome`. Ingen signup-sida.
2. **Welcome** — "Välkommen [namn]. Ditt konto är förberett för **5 000 kr**." → *Fortsätt*.
3. **Onboarding (3 korta steg, ~90 sek)**
   - Verifiera namn + personnr (KYC-light, sparas).
   - Godkänn villkor + riskinformation.
   - Bekräfta insättningsbelopp (låst till admin-nivån).
4. **Betalning** — inbäddad on-ramp-widget (Transak/MoonPay/Ramp) förifylld med:
   - `fiatAmount = 5000`, `fiatCurrency = SEK`, `cryptoCurrency = USDC`
   - `walletAddress = <Nexoras mottagningsadress>` (fast, per-nätverk)
   - `partnerOrderId = <selection.id>` — kopplar betalningen till kunden
   - `email = <kundens mail>` (låst)
   - Betalning sker på kort direkt i widgeten.
5. **Bekräftelse** — "Vi väntar på blockchain-bekräftelse (2–10 min)". Realtidsstatus.
6. **Krediterad** — portföljen visar 5 000 kr. Dashboarden öppnas.

## Varför detta är smidigast

- **En on-ramp-partner (Transak eller MoonPay)** hanterar KYC-uppgradering, kort, 3DS, valutaväxling SEK→USDC, och sänder krypto direkt till din angivna adress. Du slipper egen PSP, egen wallet-infra, egen AML.
- **En fast mottagningsadress per nätverk** (t.ex. USDC på Polygon för låga fees). Ingen dynamisk adressgenerering behövs i v1.
- **Webhook från on-ramp** avgör när kontot krediteras — inte kunden, inte du manuellt.
- **`partnerOrderId`** gör att webhooken vet exakt vilken kund/nivå betalningen tillhör.

## Teknisk implementation

### Databas (migration)

- `profiles`: lägg till `assigned_level_sek NUMERIC`, `invited_at`, `activated_at`.
- `investment_selections`: återanvänds; ny rad skapas vid onboarding-start med `selected_amount_sek = assigned_level_sek`, `onramp_status = 'pending' | 'processing' | 'crypto_received' | 'credited' | 'failed'`.
- `onramp_events` (ny): rå webhook-logg (idempotency på `provider_order_id`).
- RLS: kund läser bara egen data; admin via `has_role`.

### Admin (`/admin`)

- Formulär: skapa kund → server fn `adminCreateCustomer` (använder `supabaseAdmin.auth.admin.inviteUserByEmail` + sätter `assigned_level_sek`).
- Returnerar magic-link som du kopierar.
- Tabell med statuskolumn (drivs av `investment_selections.onramp_status`).

### Kundens onboarding

- Ny route `/_authenticated/welcome` — läser `assigned_level_sek`, styr redirect:
  - saknas KYC → `/onboarding`
  - klar men obetald → `/activate` (on-ramp)
  - krediterad → `/dashboard`
- On-ramp-embed: iframe med signerade parametrar (URL byggs i server fn så API-nyckel aldrig läcker).

### Webhook

- Public route `src/routes/api/public/onramp/webhook.ts`.
- Verifierar HMAC-signatur → uppdaterar `investment_selections` → på `crypto_received` krediterar `profiles.cash_balance_sek += assigned_level_sek` → status `credited`.
- Idempotent via unik `provider_order_id`.

### Val av on-ramp-partner

Rekommendation: **Transak** (bäst SEK-stöd, Swish möjligt, låg minsta beloppsgräns 2 500 kr fungerar, färdig widget + webhook, kan skicka direkt till valfri adress). Kräver:
- Transak-konto (business KYB, 1–5 dagar).
- API-nyckel + webhook-secret (lagras via `add_secret`).
- Din mottagningsadress (USDC/Polygon rekommenderas).

Fram tills Transak-avtal är på plats: samma UI, samma webhook-kontrakt, men med **sandbox-läge** som ger riktigt kortflöde utan riktiga pengar. Byte till produktion = ändra en env-variabel.

## Vad du behöver ge mig för att bygga

1. Godkänn planen.
2. Bekräfta on-ramp-val (Transak vs. MoonPay vs. Ramp).
3. Mottagningsadress (eller "generera senare, kör sandbox nu").

När du säger kör bygger jag i denna ordning: migration → admin-skapa-kund → welcome/onboarding → on-ramp-embed (sandbox) → webhook → kreditering → statusvyer.
