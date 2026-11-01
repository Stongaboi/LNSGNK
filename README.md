# 💅 Giggles & Kurls Salon App

A mobile-first Progressive Web App (PWA) for the **Giggles & Kurls** nail salon. It covers the whole visit lifecycle:

1. **Client** checks in from their phone and tracks loyalty progress and rewards.
2. **Staff** see a live queue, ring up services on a till, and generate a short-lived **checkout QR code**.
3. **Client** scans the QR, confirms the bill, is checked out, and rates their nail tech.
4. **Manager** watches revenue/visit metrics and can **force close** stuck visits or **void** completed ones (with optional loyalty clawback).

All business rules (visit state transitions, pricing, QR expiry, loyalty rewards, clawbacks, audit logging) live in **Supabase Postgres RPC functions**. The front end only calls those RPCs and reads data.

> ⚠️ **Mock auth:** There is no login yet. The app uses hardcoded IDs in `src/lib/mock-auth.ts` for the client, employee, and manager.

---

## 🧰 Stack

| Layer | Technology |
| --- | --- |
| Framework | **Next.js 15** (App Router) + **React 19** + **TypeScript** |
| Backend / DB | **Supabase** (Postgres, PostgREST, RPC functions) via `@supabase/supabase-js` |
| Styling | **Tailwind CSS 3** + `tailwindcss-animate` |
| UI components | **shadcn/ui** (Radix UI primitives) |
| Forms | `react-hook-form` + `zod` (`@hookform/resolvers`) |
| QR codes | `qrcode.react` |
| Icons | `lucide-react` |
| Toasts | `sonner` |
| Fonts | Fredoka (display) + Nunito (body) via `next/font` |
| PWA | Web app manifest (`src/app/manifest.ts`) + SVG app icon |

---

## 🗺️ Routes

| Route | Who | Purpose |
| --- | --- | --- |
| `/` | Client | Dashboard: check in, live visit status, loyalty card (x/5), active rewards, recent visits |
| `/history` | Client | Full visit history: date, services, total paid, nail tech |
| `/staff` | Employee | Live queue (`checked_in`, `in_service`) → Till → "Complete & Generate Checkout QR" |
| `/checkout/[token]` | Client | Opened from the QR: confirm and pay, "Thank You" screen, 1–5 star tech rating |
| `/admin` | Manager | Revenue/visit/client metrics, last 10 visits, **Force Close** and **Void** actions |

A floating pill navigation bar at the bottom of the screen switches between Client, History, Till and Manager. It's hidden on the checkout screen.

---

## 📁 Directory map

```
src/
├── app/                         # Next.js App Router: every folder is a route
│   ├── layout.tsx               # Root layout: fonts, metadata, floating nav, toaster
│   ├── globals.css              # Tailwind base + brand colour variables (pink / coral / lilac)
│   ├── manifest.ts              # PWA web app manifest
│   ├── page.tsx                 # "/": client dashboard
│   ├── history/page.tsx         # "/history": client visit history
│   ├── staff/page.tsx           # "/staff": employee queue + till
│   ├── checkout/[token]/page.tsx# "/checkout/:token": client checkout + rating
│   └── admin/page.tsx           # "/admin": manager dashboard
│
├── components/                  # Reusable React components
│   ├── ui/                      # shadcn/ui primitives (button, dialog, checkbox, form…)
│   ├── app-nav.tsx              # Floating bottom navigation between app areas
│   ├── brand-header.tsx         # Logo + salon name header
│   ├── status-badge.tsx         # Coloured pill for visit statuses
│   ├── dashboard/               # Client dashboard: hero, check-in card, loyalty card, rewards, recent visits
│   ├── history/                 # Client history: visit card with services and tech
│   ├── staff/                   # Till: queue list, till view (service checkboxes, total), checkout QR
│   ├── checkout/                # Star rating + per-tech rating form
│   └── admin/                   # Metric cards, visits table, Force Close dialog, Void dialog
│
├── hooks/                       # Data-fetching hooks (Supabase queries + polling)
│   ├── use-client-dashboard.ts  # Client, completed-visit count, rewards, loyalty config
│   ├── use-visit-history.ts     # Past visits with nested service lines, services and techs
│   ├── use-visit-queue.ts       # Staff live queue (polls every 5s)
│   └── use-admin-dashboard.ts   # Manager metrics + last 10 visits (polls every 15s)
│
├── integrations/supabase/
│   └── client.ts                # Supabase client (project URL + publishable key)
│
└── lib/                         # Plain TypeScript helpers and constants
    ├── mock-auth.ts             # Mock client/employee/manager IDs, checkout QR base URL, visit status groups
    └── utils.ts                 # cn() class merger + formatCurrency() (ZAR)

public/
├── icon.svg                     # App / PWA icon
└── confetti.svg                 # Subtle background pattern
```

---

## 🔌 Connecting to Supabase

### Option A: Through Dyad (how this project was built)
1. Open the app in Dyad and click the **Supabase** integration button.
2. Click **Connect to Supabase**, sign in, and authorize your organization.
3. Pick your project from the dropdown. Dyad writes the URL and publishable key into `src/integrations/supabase/client.ts`.

### Option B: Manually
1. In the Supabase dashboard open **Project Settings → API**.
2. Copy the **Project URL** and the **publishable (anon) key**.
3. Paste them into `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `src/integrations/supabase/client.ts`.

> Never put the `service_role` key in this file. It ships to the browser.

### Running the SQL schema / migrations

The database schema and RPC functions are **managed in Supabase, not generated by this app**. The app expects these to exist:

- **Tables:** `client`, `employee`, `service`, `visit`, `service_line`, `discount_code`, `loyalty_config`, `rating`, `voucher`, `consent_record`, `audit_log`
- **RPCs:** `rpc_start_visit`, `rpc_add_service_line`, `rpc_employee_complete_visit`, `rpc_checkout_complete`, `rpc_manager_override`, `rpc_void_visit`, `rpc_issue_reward` (called internally), `rpc_hide_rating`

To set up a **new** Supabase project (e.g. staging):

1. **Export from the existing project.** Use the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db dump -f schema.sql`. Or copy the DDL from the dashboard.
2. **Apply to the new project.** Either:
   - **SQL Editor:** Dashboard → **SQL Editor** → **New query** → paste `schema.sql` → **Run**, or
   - **CLI:** put the file in `supabase/migrations/<timestamp>_init.sql`, then `supabase link --project-ref <new-ref>` and `supabase db push`.
3. **Seed data.** Run the SQL below in the SQL Editor.
4. Point `src/integrations/supabase/client.ts` at the new project.

#### Seed data for testing

```sql
-- Mock client (used by "/", "/history" and "/checkout")
INSERT INTO client (id, phone, full_name)
VALUES ('11111111-1111-1111-1111-111111111101', '+27821234567', 'Test Client')
ON CONFLICT (id) DO NOTHING;

-- Mock employee (used by "/staff") and manager (used by "/admin")
INSERT INTO employee (id, full_name, role) VALUES
  ('11111111-1111-1111-1111-111111111102', 'Demo Staff', 'employee'),
  ('11111111-1111-1111-1111-111111111111', 'Aunt Manager', 'manager')
ON CONFLICT (id) DO NOTHING;

-- Services
INSERT INTO service (id, name, price, duration_minutes) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Classic Manicure', 180, 30),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Gel Manicure',     250, 45),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Classic Pedicure', 220, 40),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Gel Pedicure',     300, 50),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Full Set Acrylic', 350, 60)
ON CONFLICT (id) DO NOTHING;

-- Loyalty: 5 visits = R100 off, valid 60 days (only one active row)
INSERT INTO loyalty_config (visits_per_reward, reward_value, reward_expiry_days, is_active)
SELECT 5, 100.00, 60, true
WHERE NOT EXISTS (SELECT 1 FROM loyalty_config WHERE is_active);
```

> 🔐 **Security note:** Row Level Security is currently **disabled** and the `anon` role has broad table grants, which is what lets mock auth work. Before going live: add Supabase Auth, enable RLS on every table, restrict grants, and make the RPCs check `auth.uid()` and roles instead of trusting passed-in IDs.

---

## ▶️ Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🧪 Test scenarios

Use two browser tabs: one on `/` (client) and one on `/staff` or `/admin`. Each scenario starts from a client with **no open visit**.

### 1. Check-in → Till → QR checkout (happy path)
1. **`/`**: tap **Check In**. The card changes to *"You are checked in!"* (`rpc_start_visit`).
2. **`/staff`**: the client appears in **Live queue** as *Waiting* within ~5s. Click them.
3. Tick **Gel Manicure** and **Classic Pedicure**. Each tick calls `rpc_add_service_line`, the box locks, and the **Running total** shows R470. The visit becomes *In service*.
4. Click **Complete & Generate Checkout QR** (`rpc_employee_complete_visit`). A QR for `http://localhost:3000/checkout/<token>` appears with a 5-minute countdown.
5. Click **Open checkout link (testing)** (or scan the QR on the same machine). Review the bill and tap **Confirm & pay R470** (`rpc_checkout_complete`).
6. ✅ You should see the **"Thank You! You have been checked out"** screen. Rate the tech 1–5 stars and submit (a row is inserted into `rating`).
7. Back on **`/staff`**, the till switches to *"Paid & checked out!"*. On **`/`** the loyalty card goes up by one, and **`/history`** lists the visit.

**Edge cases to try**
- Reopen the same checkout link: *"This visit has already been checked out."*
- Wait more than 5 minutes before opening the link: *"This checkout code has expired."*
- Open `/checkout/not-a-real-token`: *"This checkout code isn't valid."*
- Tap **Check In** twice: the second attempt shows *"Client already has an open visit."*
- **Complete** is disabled until at least one service is added.

### 2. Loyalty reward
1. Repeat scenario 1 until the client has **5** completed visits.
2. ✅ On **`/`**, a reward card (e.g. **R100 off**, code `LOY-XXXXXXXX`) appears under **Your rewards**, and the loyalty card restarts at 0/5. The reward is created by `rpc_issue_reward` inside `rpc_checkout_complete`.

### 3. Manager override (Force Close)
1. Follow scenario 1 up to step 4 (QR generated) but **don't** open the checkout link.
2. **`/admin`**: the visit shows as **Awaiting scan** with a **Force Close** button.
3. Click it, keep or edit the **Amount paid**, enter a **Reason** (e.g. "Paid cash, phone died"), and submit (`rpc_manager_override`).
4. ✅ The status becomes **Override**, revenue and **Completed visits** go up, the QR token is cleared, and the visit counts toward loyalty. The opened QR link is now invalid.
- An empty reason is rejected by the form (and by the RPC).

### 4. Void and loyalty clawback
1. Make sure the client has a **completed** visit. Ideally use the 5th visit that earned a reward in scenario 2.
2. **`/admin`**: click **Void** on that visit, enter a **Reason**, and leave **Keep loyalty reward** **off**. Submit (`rpc_void_visit`).
3. ✅ The status becomes **Voided** and revenue and completed visits go down. All of its service lines are voided. Any reward earned or redeemed on it is set to `voided`, so it disappears from **Your rewards** on `/`. An `audit_log` row with action `loyalty_clawback` is written.
4. Repeat on another completed visit with **Keep loyalty reward** **on**. ✅ The visit is voided but the reward stays (`loyalty_clawback_skipped` in `audit_log`).

Check the audit trail at any time:

```sql
SELECT created_at, entity_type, action, actor_role, reason
FROM audit_log ORDER BY created_at DESC LIMIT 20;
```

---

## 🚀 Deploying

1. Deploy to Vercel (or any Next.js host).
2. Update `CHECKOUT_BASE_URL` in `src/lib/mock-auth.ts` to your production domain so the QR code points at the live checkout page.
3. Before real users get access, replace mock auth with Supabase Auth and lock down RLS (see the security note above).
