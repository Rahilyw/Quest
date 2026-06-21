-- Public bucket for quest cover images (uploaded via admin service role)

insert into storage.buckets (id, name, public)
values ('quest-covers', 'quest-covers', true)
on conflict (id) do nothing;

create policy "Anyone can view quest covers"
  on storage.objects for select
  using (bucket_id = 'quest-covers');
