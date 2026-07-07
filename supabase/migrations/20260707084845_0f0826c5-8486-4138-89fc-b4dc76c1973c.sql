
-- ROLES
create type public.app_role as enum ('admin','staff');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role=_role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.user_roles where user_id=_user_id and role in ('admin','staff'))
$$;

create policy "users see own roles" on public.user_roles for select to authenticated using (user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Auto-promote first user to admin
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id,'admin');
  end if;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Shared updated_at
create or replace function public.tg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- PROPERTIES & ROOMS
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select,insert,update,delete on public.properties to authenticated;
grant all on public.properties to service_role;
alter table public.properties enable row level security;
create policy "staff read properties" on public.properties for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff write properties" on public.properties for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger properties_touch before update on public.properties for each row execute function public.tg_touch_updated_at();

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  room_number text not null,
  floor text,
  created_at timestamptz not null default now()
);
grant select,insert,update,delete on public.rooms to authenticated;
grant all on public.rooms to service_role;
alter table public.rooms enable row level security;
create policy "staff read rooms" on public.rooms for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff write rooms" on public.rooms for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- TENANTS
create type public.tenant_status as enum ('active','vacated','notice');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  father_name text,
  mobile text not null,
  alt_mobile text,
  room_id uuid references public.rooms(id) on delete set null,
  joining_date date not null,
  security_deposit numeric(12,2) not null default 0,
  monthly_rent numeric(12,2) not null default 0,
  electricity_rate numeric(10,2) not null default 0,
  water_charges numeric(10,2) not null default 0,
  rent_due_day int not null default 5 check (rent_due_day between 1 and 28),
  agreement_expiry date,
  status public.tenant_status not null default 'active',
  notes text,
  photo_url text,
  aadhaar_url text,
  police_verification_url text,
  telegram_chat_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select,insert,update,delete on public.tenants to authenticated;
grant all on public.tenants to service_role;
alter table public.tenants enable row level security;
create policy "staff read tenants" on public.tenants for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff write tenants" on public.tenants for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger tenants_touch before update on public.tenants for each row execute function public.tg_touch_updated_at();

-- AGREEMENTS
create type public.agreement_status as enum ('active','expired','terminated','renewed');
create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  pdf_url text,
  start_date date not null,
  end_date date not null,
  rent numeric(12,2) not null default 0,
  deposit numeric(12,2) not null default 0,
  lock_in_months int not null default 0,
  notice_period_days int not null default 30,
  status public.agreement_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select,insert,update,delete on public.agreements to authenticated;
grant all on public.agreements to service_role;
alter table public.agreements enable row level security;
create policy "staff read agreements" on public.agreements for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff write agreements" on public.agreements for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger agreements_touch before update on public.agreements for each row execute function public.tg_touch_updated_at();

-- RENT
create type public.rent_status as enum ('pending','paid','partial','overdue');
create table public.rent_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_month int not null check (period_month between 1 and 12),
  period_year int not null,
  amount_due numeric(12,2) not null default 0,
  water_charges numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  due_date date not null,
  status public.rent_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, period_month, period_year)
);
grant select,insert,update,delete on public.rent_records to authenticated;
grant all on public.rent_records to service_role;
alter table public.rent_records enable row level security;
create policy "staff read rent" on public.rent_records for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff write rent" on public.rent_records for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger rent_touch before update on public.rent_records for each row execute function public.tg_touch_updated_at();

-- PAYMENTS
create type public.payment_mode as enum ('cash','upi','bank_transfer','cheque','card','other');
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  rent_record_id uuid not null references public.rent_records(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(12,2) not null,
  mode public.payment_mode not null default 'cash',
  transaction_id text,
  remarks text,
  created_at timestamptz not null default now()
);
grant select,insert,update,delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "staff read payments" on public.payments for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff write payments" on public.payments for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Recalc rent status when payments change
create or replace function public.recalc_rent_status()
returns trigger language plpgsql as $$
declare rid uuid;
begin
  rid := coalesce(new.rent_record_id, old.rent_record_id);
  update public.rent_records r set
    amount_paid = coalesce((select sum(amount) from public.payments where rent_record_id=rid),0),
    status = case
      when coalesce((select sum(amount) from public.payments where rent_record_id=rid),0) >= (r.amount_due + r.water_charges) then 'paid'::public.rent_status
      when coalesce((select sum(amount) from public.payments where rent_record_id=rid),0) > 0 then 'partial'::public.rent_status
      when r.due_date < current_date then 'overdue'::public.rent_status
      else 'pending'::public.rent_status
    end,
    updated_at = now()
  where r.id = rid;
  return coalesce(new, old);
end $$;

create trigger payments_recalc_rent
after insert or update or delete on public.payments
for each row execute function public.recalc_rent_status();

-- ELECTRICITY
create table public.electricity_bills (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  period_month int not null check (period_month between 1 and 12),
  period_year int not null,
  previous_reading numeric(10,2) not null default 0,
  current_reading numeric(10,2) not null default 0,
  units numeric(10,2) generated always as (current_reading - previous_reading) stored,
  rate numeric(10,2) not null default 0,
  fixed_charge numeric(10,2) not null default 0,
  amount numeric(12,2) not null default 0,
  paid boolean not null default false,
  pdf_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, period_month, period_year)
);
grant select,insert,update,delete on public.electricity_bills to authenticated;
grant all on public.electricity_bills to service_role;
alter table public.electricity_bills enable row level security;
create policy "staff read bills" on public.electricity_bills for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff write bills" on public.electricity_bills for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create trigger bills_touch before update on public.electricity_bills for each row execute function public.tg_touch_updated_at();

-- TIMELINE
create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  event_type text not null,
  event_date timestamptz not null default now(),
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
grant select,insert,update,delete on public.timeline_events to authenticated;
grant all on public.timeline_events to service_role;
alter table public.timeline_events enable row level security;
create policy "staff read timeline" on public.timeline_events for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff write timeline" on public.timeline_events for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- NOTIFICATIONS
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  channel text not null default 'telegram',
  type text not null,
  message text,
  status text not null default 'sent',
  sent_at timestamptz not null default now()
);
grant select,insert,update,delete on public.notification_log to authenticated;
grant all on public.notification_log to service_role;
alter table public.notification_log enable row level security;
create policy "staff read notif" on public.notification_log for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff write notif" on public.notification_log for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Monthly rent generator
create or replace function public.generate_monthly_rent()
returns int language plpgsql security definer set search_path=public as $$
declare
  t record;
  cnt int := 0;
  m int := extract(month from current_date)::int;
  y int := extract(year from current_date)::int;
  due date;
begin
  for t in select * from public.tenants where status = 'active' loop
    due := make_date(y, m, least(t.rent_due_day, 28));
    insert into public.rent_records(tenant_id, period_month, period_year, amount_due, water_charges, due_date, status)
    values (t.id, m, y, t.monthly_rent, t.water_charges, due, 'pending')
    on conflict (tenant_id, period_month, period_year) do nothing;
    cnt := cnt + 1;
  end loop;
  return cnt;
end $$;

-- Storage buckets are created via storage tools separately

-- Storage RLS policies for our buckets
create policy "staff read tenant docs" on storage.objects for select to authenticated
  using (bucket_id in ('tenant-photos','documents','agreements','bills') and public.is_staff(auth.uid()));
create policy "staff upload tenant docs" on storage.objects for insert to authenticated
  with check (bucket_id in ('tenant-photos','documents','agreements','bills') and public.is_staff(auth.uid()));
create policy "staff update tenant docs" on storage.objects for update to authenticated
  using (bucket_id in ('tenant-photos','documents','agreements','bills') and public.is_staff(auth.uid()));
create policy "staff delete tenant docs" on storage.objects for delete to authenticated
  using (bucket_id in ('tenant-photos','documents','agreements','bills') and public.is_staff(auth.uid()));

-- Public read for tenant photos bucket (anyone)
create policy "public read photos" on storage.objects for select to anon
  using (bucket_id = 'tenant-photos');
