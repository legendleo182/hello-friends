## House Rent Management System

A full property/tenant management app with backend (Lovable Cloud / Supabase), file storage, auto rent generation, Telegram reminders, and reports.

### Scope (11 modules from PRD)

1. **Auth** — email/password login (single landlord/admin user). No public signup.
2. **Tenant Management** — full profile, photo, Aadhaar, police verification uploads, status.
3. **Agreement Management** — PDF upload, dates, deposit, lock-in/notice period, renew, expiry tracking.
4. **Rent Management** — monthly auto-generation via pg_cron, payment recording (mode, txn id, remarks), partial payment support.
5. **Electricity Bills** — monthly readings, auto units calc, rate + fixed charge, PDF upload.
6. **Notifications** — Telegram bot: rent due today, overdue, partial, agreement expiring (30d/7d/expired), electricity pending. Daily cron.
7. **Status indicators** — Green/Red/Yellow/Grey badges on tenant cards.
8. **Search & Filters** — name/phone/room/property + status/date/month filters.
9. **Reports** — monthly collection, pending rent, electricity, deposits, agreements, tenants. Export Excel/PDF/CSV.
10. **Timeline** — per-tenant chronological event log (agreement, payments, bills, reminders).
11. **File Manager** — browse/preview/download/delete files by category.

### Data model (Supabase)

- `properties` (name, address)
- `rooms` (property_id, room_number, floor)
- `tenants` (name, father_name, mobile, alt_mobile, room_id, joining_date, security_deposit, monthly_rent, electricity_rate, water_charges, rent_due_day, status, notes, photo_url, aadhaar_url, police_verification_url, telegram_chat_id)
- `agreements` (tenant_id, pdf_url, start_date, end_date, rent, deposit, lock_in_months, notice_period_days, status)
- `rent_records` (tenant_id, month, year, amount_due, amount_paid, status, due_date)
- `payments` (rent_record_id, date, amount, mode, transaction_id, remarks)
- `electricity_bills` (tenant_id, month, year, prev_reading, curr_reading, units, rate, fixed_charge, amount, pdf_url, paid)
- `timeline_events` (tenant_id, type, description, event_date)
- `notification_log` (tenant_id, type, sent_at, channel)
- `user_roles` (user_id, role) — admin role
- Storage buckets: `tenant-photos` (public), `documents` (private), `agreements` (private), `bills` (private)

### Cron jobs (pg_cron)

- **1st of month, 00:05** — generate rent record for every active tenant.
- **Daily 09:00** — scan agreements/rents/bills; call Telegram edge endpoint for due reminders.

### Telegram integration

- Uses Lovable Telegram connector.
- Server route `/api/public/cron/reminders` (secret-protected) triggered by pg_cron, sends messages via gateway.
- Per-tenant `telegram_chat_id` field; onboarding instructions in UI.

### UI

- Dark, modern dashboard theme (sidebar nav). Distinct — not generic purple/indigo. Deep navy + amber accent, Manrope + Inter.
- Pages: Dashboard, Tenants, Agreements, Rent, Electricity, Reports, Files, Settings.
- Tenant cards with colored status dot; detail page has tabs (Overview, Agreements, Rent, Electricity, Timeline, Files).

### Tech

- TanStack Start + Supabase (Lovable Cloud), RLS scoped to admin role.
- shadcn/ui, TanStack Query, react-hook-form + zod, recharts for reports.
- xlsx + jspdf for exports.

### Build order

1. Enable Cloud, create schema + storage + RLS + roles.
2. Auth + admin gate + shell/sidebar + theme.
3. Properties/Rooms + Tenants CRUD with uploads.
4. Agreements + expiry logic.
5. Rent auto-generation cron + payments.
6. Electricity bills.
7. Timeline + status computation.
8. Search/filters + dashboard widgets.
9. Reports + exports.
10. Telegram connector + reminder cron.
11. File manager.

### Questions before I start

- **Single admin user only**, or should the landlord be able to invite staff too?
- OK to make the **first user who signs up automatically the admin** (simple bootstrap), then disable public signup?
- **Telegram**: I'll wire it via the Lovable Telegram connector — you'll create a bot with BotFather and connect it when we reach that step. OK?
- **Water charges** — flat monthly amount per tenant included in rent record, or tracked separately like electricity?