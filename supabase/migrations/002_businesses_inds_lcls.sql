alter table public.businesses
  add column if not exists inds_lcls_cd text;

create index if not exists idx_businesses_inds_lcls on public.businesses (inds_lcls_cd);
