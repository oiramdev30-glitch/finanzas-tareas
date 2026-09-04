create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.apply_txn_effects(
  p_type text,
  p_amount numeric,
  p_account_id uuid,
  p_transfer_account_id uuid
)
returns void
language plpgsql
as $$
declare
  v_primary_delta numeric := 0;
  v_transfer_amount numeric := 0;
begin
  if p_type = 'income' then
    v_primary_delta := p_amount;
  elsif p_type = 'expense' then
    v_primary_delta := -p_amount;
  elsif p_type = 'transfer' then
    v_primary_delta := -p_amount;
    v_transfer_amount := p_amount;
  end if;

  if p_account_id is not null and v_primary_delta <> 0 then
    update public.accounts set balance = balance + v_primary_delta where id = p_account_id;
  end if;

  if p_transfer_account_id is not null and v_transfer_amount <> 0 then
    update public.accounts set balance = balance + v_transfer_amount where id = p_transfer_account_id;
  end if;
end;
$$;

create or replace function public.sync_account_balance()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    perform public.apply_txn_effects(new.type, new.amount, new.account_id, new.transfer_account_id);
  elsif tg_op = 'UPDATE' then
    perform public.apply_txn_effects(old.type, old.amount, old.account_id, old.transfer_account_id);
    perform public.apply_txn_effects(new.type, new.amount, new.account_id, new.transfer_account_id);
  elsif tg_op = 'DELETE' then
    perform public.apply_txn_effects(old.type, old.amount, old.account_id, old.transfer_account_id);
  end if;
  return null;
end;
$$;

create or replace function public.recalculate_budget_spent(
  p_user_id uuid,
  p_category_id uuid,
  p_month date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.budgets b
  set spent = coalesce((
    select sum(t.amount)
    from public.transactions t
    where t.user_id = p_user_id
      and t.category_id = p_category_id
      and t.type = 'expense'
      and date_trunc('month', t.date)::date = p_month
  ), 0)
  where b.user_id = p_user_id
    and b.category_id = p_category_id
    and b.month = p_month;
end;
$$;

create or replace function public.sync_budget_spent()
returns trigger
language plpgsql
as $$
declare
  v_old_month date;
  v_new_month date;
begin
  if tg_op in ('INSERT', 'UPDATE') then
    v_new_month := date_trunc('month', new.date)::date;
    perform public.recalculate_budget_spent(new.user_id, new.category_id, v_new_month);
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    v_old_month := date_trunc('month', old.date)::date;
    if tg_op = 'DELETE'
       or old.category_id is distinct from new.category_id
       or old.date::date <> new.date::date
    then
      perform public.recalculate_budget_spent(old.user_id, old.category_id, v_old_month);
    end if;
  end if;

  return null;
end;
$$;

create or replace function public.validate_transaction_ownership()
returns trigger
language plpgsql
as $$
declare
  v_account_user_id uuid;
  v_category_user_id uuid;
  v_transfer_user_id uuid;
begin
  select user_id into v_account_user_id from public.accounts where id = new.account_id;
  if v_account_user_id is distinct from new.user_id then
    raise exception 'account % is not owned by the current user', coalesce(new.account_id::text, 'NULL');
  end if;

  if new.category_id is not null then
    select user_id into v_category_user_id from public.categories where id = new.category_id;
    if v_category_user_id is distinct from new.user_id then
      raise exception 'category % is not owned by the current user', coalesce(new.category_id::text, 'NULL');
    end if;
  end if;

  if new.transfer_account_id is not null then
    select user_id into v_transfer_user_id from public.accounts where id = new.transfer_account_id;
    if v_transfer_user_id is distinct from new.user_id then
      raise exception 'transfer account % is not owned by the current user', coalesce(new.transfer_account_id::text, 'NULL');
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.set_subtask_user_id()
returns trigger
language plpgsql
as $$
declare
  v_user_id uuid;
begin
  select user_id into v_user_id from public.tasks where id = new.task_id;
  if v_user_id is null then
    raise exception 'task % does not exist', coalesce(new.task_id::text, 'NULL');
  end if;
  new.user_id := v_user_id;
  return new;
end;
$$;

create or replace function public.task_on_status_change()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' then
    if new.completed_at is null then
      new.completed_at := now();
    end if;
    new.urgency_score := 0;
  elsif old.status = 'done' then
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.seed_user_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categories (user_id, name, type, icon, color, is_default) values
    (new.id, 'Comida', 'expense', 'utensils', '#f59e0b', true),
    (new.id, 'Transporte', 'expense', 'bus', '#3b82f6', true),
    (new.id, 'Hogar', 'expense', 'home', '#8b5cf6', true),
    (new.id, 'Servicios', 'expense', 'zap', '#06b6d4', true),
    (new.id, 'Salud', 'expense', 'heart-pulse', '#ef4444', true),
    (new.id, 'Educacion', 'expense', 'graduation-cap', '#6366f1', true),
    (new.id, 'Entretenimiento', 'expense', 'clapperboard', '#ec4899', true),
    (new.id, 'Compras', 'expense', 'shopping-bag', '#10b981', true),
    (new.id, 'Personal', 'expense', 'shirt', '#f97316', true),
    (new.id, 'Suscripciones', 'expense', 'repeat', '#14b8a6', true),
    (new.id, 'Otro', 'expense', 'more-horizontal', '#64748b', true),
    (new.id, 'Salario', 'income', 'briefcase-business', '#22c55e', true),
    (new.id, 'Freelance', 'income', 'laptop', '#a855f7', true),
    (new.id, 'Regalo', 'income', 'gift', '#eab308', true),
    (new.id, 'Inversion', 'income', 'trending-up', '#0ea5e9', true),
    (new.id, 'Otros ingresos', 'income', 'coins', '#84cc16', true);
  return new;
end;
$$;

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  type text not null check (type in ('cash', 'debit', 'credit', 'savings', 'investment')),
  currency text not null default 'MXN' check (char_length(currency) = 3),
  balance numeric(20, 2) not null default 0,
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  icon text,
  include_in_balance boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  type text not null check (type in ('income', 'expense')),
  icon text,
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, name, type)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete restrict,
  category_id uuid references public.categories (id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(20, 2) not null check (amount > 0),
  currency text not null default 'MXN' check (char_length(currency) = 3),
  description text check (description is null or char_length(description) <= 500),
  merchant text check (merchant is null or char_length(merchant) <= 120),
  date timestamptz not null default now(),
  status text not null default 'completed' check (status in ('completed', 'pending')),
  source text not null default 'manual' check (source in ('manual', 'scan')),
  receipt_text text check (receipt_text is null or char_length(receipt_text) <= 4000),
  transfer_account_id uuid references public.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (type = 'transfer' or transfer_account_id is null),
  check (type <> 'transfer' or (transfer_account_id is not null and transfer_account_id <> account_id))
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  month date not null check (date_trunc('month', month) = month),
  amount numeric(20, 2) not null check (amount >= 0),
  spent numeric(20, 2) not null default 0 check (spent >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (description is null or char_length(description) <= 4000),
  subject text check (subject is null or char_length(subject) <= 120),
  source text not null default 'manual' check (source in ('manual', 'classroom')),
  classroom_course_id text check (classroom_course_id is null or char_length(classroom_course_id) <= 120),
  classroom_course_work_id text check (classroom_course_work_id is null or char_length(classroom_course_work_id) <= 120),
  due_date timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes between 1 and 10080),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'archived')),
  completed_at timestamptz,
  urgency_score integer not null default 0 check (urgency_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'done' or completed_at is null),
  check (status <> 'done' or completed_at is not null),
  unique (user_id, classroom_course_id, classroom_course_work_id)
);

create table public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  is_ai_generated boolean not null default false,
  order_index integer not null default 0,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (is_completed = false or completed_at is not null),
  check (is_completed = true or completed_at is null),
  unique (task_id, order_index)
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null check (char_length(token) between 20 and 4096),
  platform text not null check (platform in ('android', 'ios', 'web', 'unknown')),
  device_name text check (device_name is null or char_length(device_name) <= 120),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  unique (token)
);

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  type text not null check (char_length(type) between 1 and 80),
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) between 1 and 500),
  data jsonb,
  fcm_status text not null check (fcm_status in ('sent', 'error', 'skipped')),
  fcm_message_id text,
  fcm_error text check (fcm_error is null or char_length(fcm_error) <= 1000),
  sent_at timestamptz not null default now()
);

create index accounts_user_id_idx on public.accounts (user_id);
create index categories_user_id_idx on public.categories (user_id);
create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_account_date_idx on public.transactions (account_id, date desc);
create index transactions_category_date_idx on public.transactions (category_id, date desc);
create index budgets_user_month_idx on public.budgets (user_id, month);
create index tasks_user_status_due_idx on public.tasks (user_id, status, due_date);
create index tasks_user_urgency_idx on public.tasks (user_id, urgency_score desc);
create index subtasks_task_order_idx on public.subtasks (task_id, order_index);
create index push_tokens_user_id_idx on public.push_tokens (user_id);
create index notification_logs_user_sent_idx on public.notification_logs (user_id, sent_at desc);
create index notification_logs_task_type_idx on public.notification_logs (task_id, type, sent_at);

create unique index notification_logs_daily_dedup_idx
  on public.notification_logs (user_id, task_id, type, date_trunc('day', sent_at));

create trigger trg_accounts_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create trigger trg_budgets_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

create trigger trg_tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

create trigger trg_subtasks_updated_at
  before update on public.subtasks
  for each row execute function public.set_updated_at();

create trigger trg_push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.set_updated_at();

create trigger trg_transactions_validate_ownership
  before insert or update on public.transactions
  for each row execute function public.validate_transaction_ownership();

create trigger trg_transactions_sync_balance
  after insert or update or delete on public.transactions
  for each row execute function public.sync_account_balance();

create trigger trg_transactions_sync_budget
  after insert or update or delete on public.transactions
  for each row execute function public.sync_budget_spent();

create trigger trg_subtasks_set_user_id
  before insert or update of task_id on public.subtasks
  for each row execute function public.set_subtask_user_id();

create trigger trg_tasks_status_change
  before update on public.tasks
  for each row execute function public.task_on_status_change();

create trigger trg_seed_defaults_after_signup
  after insert on auth.users
  for each row execute function public.seed_user_defaults();

alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.tasks enable row level security;
alter table public.subtasks enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notification_logs enable row level security;

create policy "accounts_owner_all" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "categories_owner_all" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions_owner_all" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budgets_owner_all" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks_owner_all" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "subtasks_owner_all" on public.subtasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "push_tokens_owner_all" on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notification_logs_owner_all" on public.notification_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);