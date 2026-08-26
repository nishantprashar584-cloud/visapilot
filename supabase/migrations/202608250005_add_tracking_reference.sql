alter table public.applications
  add column if not exists vfs_reference_number text;

create index if not exists applications_vfs_reference_number_idx
  on public.applications (vfs_reference_number);