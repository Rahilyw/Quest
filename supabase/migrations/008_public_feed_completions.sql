-- Allow all authenticated users to read approved completions for the public activity feed.
create policy "Anyone can read approved completions"
  on completions for select
  using (status = 'approved');
