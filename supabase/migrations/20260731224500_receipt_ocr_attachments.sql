-- Private source photos and OCR metadata attached to warehouse receipts.
create table public.stock_receipt_attachments (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.stock_receipts(id) on delete cascade,
  file_path text not null unique,
  file_name text not null,
  mime_type text not null,
  file_size integer not null check (file_size > 0 and file_size <= 12582912),
  ocr_text text,
  detected_data jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index stock_receipt_attachments_receipt_id_idx on public.stock_receipt_attachments(receipt_id);
create index stock_receipt_attachments_created_by_idx on public.stock_receipt_attachments(created_by);
alter table public.stock_receipt_attachments enable row level security;
grant select,insert,update,delete on public.stock_receipt_attachments to authenticated;

create policy warehouse_staff_all_receipt_attachments
on public.stock_receipt_attachments for all to authenticated
using (private.has_role(array['OWNER','WAREHOUSE_STAFF']))
with check (private.has_role(array['OWNER','WAREHOUSE_STAFF']));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('receipt-scans','receipt-scans',false,12582912,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy receipt_scans_staff_select on storage.objects for select to authenticated
using (bucket_id='receipt-scans' and private.has_role(array['OWNER','WAREHOUSE_STAFF']));
create policy receipt_scans_staff_insert on storage.objects for insert to authenticated
with check (bucket_id='receipt-scans' and private.has_role(array['OWNER','WAREHOUSE_STAFF']));
create policy receipt_scans_staff_update on storage.objects for update to authenticated
using (bucket_id='receipt-scans' and private.has_role(array['OWNER','WAREHOUSE_STAFF']))
with check (bucket_id='receipt-scans' and private.has_role(array['OWNER','WAREHOUSE_STAFF']));
create policy receipt_scans_staff_delete on storage.objects for delete to authenticated
using (bucket_id='receipt-scans' and private.has_role(array['OWNER','WAREHOUSE_STAFF']));
