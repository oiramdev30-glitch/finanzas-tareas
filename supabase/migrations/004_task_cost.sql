-- Costo estimado opcional por tarea (para sugerir el gasto en Finanzas).
alter table tasks add column if not exists estimated_cost numeric null;
