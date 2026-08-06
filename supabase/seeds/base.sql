-- Shared reference data only. Safe for local/staging and eligible for a
-- separately approved production bootstrap. It never creates users, orders,
-- inventory, payments or financial records.
\ir ../seed.sql
