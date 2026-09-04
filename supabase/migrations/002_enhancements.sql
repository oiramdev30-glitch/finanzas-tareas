-- ============================================================================
-- 002_enhancements.sql  (ejecutar UNA SOLA VEZ en el SQL Editor del Dashboard)
-- Añade soporte para:
--   - Balance inicial de cuentas   (transactions.is_opening_balance)
--   - Tareas recurrentes           (tasks.recurrence)
--   - Recordatorios de tareas      (tasks.reminder_at, tasks.reminder_enabled)
--   - Editar/borrar categorías     (deleteCategory ya cubierto por RLS)
-- ============================================================================

-- 1) Añadir columna para marcar el balance inicial de una cuenta
alter table public.transactions
  add column if not exists is_opening_balance boolean not null default false;

-- 2) Añadir columnas de recurrencia, recordatorio y orden manual a tareas
alter table public.tasks
  add column if not exists recurrence text not null default 'none'
    check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  add column if not exists reminder_enabled boolean not null default false,
  add column if not exists reminder_at timestamptz,
  add column if not exists sort_order integer not null default 0;

-- 3) Verificación: el recordatorio solo aplica si está habilitado
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_reminder_at_enabled_ck'
      and conrelid = 'public.tasks'::regclass
  ) then
    execute 'alter table public.tasks add constraint tasks_reminder_at_enabled_ck check (reminder_enabled = false or reminder_at is not null)';
  end if;
end $$;