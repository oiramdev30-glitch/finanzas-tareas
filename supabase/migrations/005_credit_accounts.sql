alter table public.accounts add column if not exists credit_limit numeric(20,2) check (credit_limit is null or credit_limit >= 0);
alter table public.accounts add column if not exists current_debt numeric(20,2) not null default 0 check (current_debt >= 0);
alter table public.accounts add column if not exists closing_day smallint check (closing_day is null or (closing_day between 1 and 31));
alter table public.accounts add column if not exists due_day smallint check (due_day is null or (due_day between 1 and 31));
