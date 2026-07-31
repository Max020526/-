-- Development seed intentionally contains reference data only.
-- Business records must be created through the application workflows.
insert into public.categories(name,slug) values
  ('上装','tops'),('下装','bottoms'),('连衣裙','dresses'),('外套','outerwear'),('配饰','accessories')
on conflict(slug) do nothing;
