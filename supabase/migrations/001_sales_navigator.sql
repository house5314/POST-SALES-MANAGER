-- PRD 3절 스키마 + 5.1 housing_growth_pct(우선 분류용) + 5.3 제안서 연계용 메타

create table if not exists public.market_stats (
  region_code text primary key,
  region_label text not null,
  housing_count integer not null default 0,
  housing_growth_pct numeric(6, 2) not null default 0,
  target_age_group text,
  peak_time text,
  floating_pop integer not null default 0,
  dong_households integer not null default 0,
  updated_at timestamptz default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  address text not null,
  region_code text references public.market_stats (region_code) on delete set null,
  lat double precision not null,
  lng double precision not null,
  revenue_trend double precision not null default 0,
  external_store_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_businesses_region on public.businesses (region_code);
create index if not exists idx_businesses_category on public.businesses (category);

alter table public.market_stats enable row level security;
alter table public.businesses enable row level security;

-- 익명 조회(프런트에서 Supabase 직접 호출 시)
create policy "market_stats_select_public" on public.market_stats for select using (true);
create policy "businesses_select_public" on public.businesses for select using (true);

-- 시드(PRD 예시·데모)
insert into public.market_stats (region_code, region_label, housing_count, housing_growth_pct, target_age_group, peak_time, floating_pop, dong_households)
values
  ('2726010100', '대구 수성구 범어1동', 12630, 11.2, '50대 여성', '18–23시', 42000, 8560),
  ('2726010200', '대구 수성구 범어2동', 9800, 8.1, '40대 남성', '12–14시', 31000, 6200),
  ('2726010300', '대구 수성구 만촌동', 15200, 14.5, '30대 부부', '19–22시', 55000, 11200)
on conflict (region_code) do update set
  region_label = excluded.region_label,
  housing_count = excluded.housing_count,
  housing_growth_pct = excluded.housing_growth_pct,
  target_age_group = excluded.target_age_group,
  peak_time = excluded.peak_time,
  floating_pop = excluded.floating_pop,
  dong_households = excluded.dong_households;

insert into public.businesses (name, category, address, region_code, lat, lng, revenue_trend, external_store_id)
values
  ('범어도서 스터디카페', '독서실/스터디 카페', '대구 수성구 범어1동', '2726010100', 35.8628, 128.6285, -14.3, 'demo-b1'),
  ('범어 헬스 PT', '헬스/PT', '대구 수성구 범어1동', '2726010100', 35.8642, 128.632, 3.2, 'demo-b2'),
  ('만촌 미용실', '미용', '대구 수성구 만촌동', '2726010300', 35.854, 128.616, -6.8, 'demo-b3'),
  ('범어2동 카페', '카페', '대구 수성구 범어2동', '2726010200', 35.858, 128.605, -2.1, 'demo-b4'),
  ('만촌 한식당', '외식', '대구 수성구 만촌동', '2726010300', 35.852, 128.62, 5.4, 'demo-b5')
on conflict (external_store_id) do nothing;
