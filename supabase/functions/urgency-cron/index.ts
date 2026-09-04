import {
  createClient,
  type SupabaseClient,
} from 'npm:@supabase/supabase-js@2';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'todo' | 'in_progress' | 'done' | 'archived';

interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  priority: Priority;
  status: TaskStatus;
  due_date: string | null;
  urgency_score: number;
}

interface SubtaskRow {
  task_id: string;
  is_completed: boolean;
}

interface PushTokenRow {
  id: string;
  user_id: string;
  token: string;
  platform: string;
}

interface Reminder {
  type: string;
  title: string;
  body: string;
}

interface ExpoTicket {
  ok: boolean;
  ticketId?: string;
  error?: string;
}

function computeTimeComponent(dueDate: string | null, now: number): number {
  if (!dueDate) {
    return 0;
  }
  const remaining = new Date(dueDate).getTime() - now;
  if (remaining <= 0) {
    return 60;
  }
  const hours = remaining / HOUR_MS;
  if (hours <= 12) {
    return 55;
  }
  if (hours <= 24) {
    return 50;
  }
  if (hours <= 48) {
    return 40;
  }
  if (hours <= 72) {
    return 32;
  }
  if (hours <= 120) {
    return 22;
  }
  if (hours <= 168) {
    return 12;
  }
  return 0;
}

function computePriorityComponent(priority: Priority): number {
  switch (priority) {
    case 'urgent':
      return 22;
    case 'high':
      return 16;
    case 'medium':
      return 8;
    case 'low':
      return 3;
    default:
      return 8;
  }
}

function computeProgressComponent(
  totalSubtasks: number,
  completedSubtasks: number,
): number {
  if (totalSubtasks === 0) {
    return 5;
  }
  const completionRatio = completedSubtasks / totalSubtasks;
  return Math.round(12 * (1 - completionRatio));
}

function computeUrgencyScore(
  task: TaskRow,
  subtasks: SubtaskRow[],
  now: number,
): number {
  if (task.status === 'done' || task.status === 'archived') {
    return 0;
  }
  const taskSubtasks = subtasks.filter(
    (subtask) => subtask.task_id === task.id,
  );
  const completed = taskSubtasks.filter(
    (subtask) => subtask.is_completed,
  ).length;
  const rawScore =
    computeTimeComponent(task.due_date, now) +
    computePriorityComponent(task.priority) +
    computeProgressComponent(taskSubtasks.length, completed);
  return Math.min(100, Math.round(rawScore));
}

function buildDueTodayBody(title: string, dueDate: string): string {
  const due = new Date(dueDate);
  const time = due.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `La tarea "${title}" vence hoy a las ${time}.`;
}

function buildReminder(task: TaskRow): Reminder | null {
  if (task.status === 'done' || task.status === 'archived') {
    return null;
  }
  if (!task.due_date) {
    return null;
  }
  const remaining = new Date(task.due_date).getTime() - Date.now();
  if (remaining <= 0) {
    return {
      type: 'task_overdue',
      title: 'Tarea vencida',
      body: `La tarea "${task.title}" venció y sigue pendiente.`,
    };
  }
  if (remaining <= DAY_MS) {
    return {
      type: 'task_due_today',
      title: 'Vence hoy',
      body: buildDueTodayBody(task.title, task.due_date),
    };
  }
  if (task.urgency_score >= 70) {
    return {
      type: 'task_urgent',
      title: 'Alta prioridad',
      body: `La tarea "${task.title}" tiene prioridad urgente y requiere tu atención.`,
    };
  }
  return null;
}

async function sendPush(token: string, title: string, body: string): Promise<ExpoTicket> {
  try {
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([
        {
          to: token,
          sound: 'default',
          title,
          body,
          data: { url: '/tareas' },
        },
      ]),
    });
    if (!response.ok) {
      const errorText = await response.text();
      return { ok: false, error: `HTTP ${response.status}: ${errorText.slice(0, 400)}` };
    }
    const payload = await response.json() as {
      data?: Array<{ status?: string; message?: string; id?: string }>;
    };
    const ticket = payload.data?.[0];
    if (ticket?.status === 'error') {
      return {
        ok: false,
        error: ticket.message ?? 'Error al enviar la notificación.',
      };
    }
    return { ok: true, ticketId: ticket?.id };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

interface NotificationOutcome {
  status: 'sent' | 'error' | 'skipped';
  messageId?: string;
  error?: string;
  data?: Record<string, unknown>;
}

async function logNotification(
  admin: SupabaseClient,
  task: TaskRow,
  reminder: Reminder,
  outcome: NotificationOutcome,
): Promise<void> {
  const { error } = await admin.from('notification_logs').insert({
    user_id: task.user_id,
    task_id: task.id,
    type: reminder.type,
    title: reminder.title,
    body: reminder.body,
    data: outcome.data ?? null,
    fcm_status: outcome.status,
    fcm_message_id: outcome.messageId ?? null,
    fcm_error: outcome.error ?? null,
  });
  if (error) {
    console.error(
      `Could not persist notification log for task ${task.id} type ${reminder.type}: ${error.message}`,
    );
  }
}

async function runCron(): Promise<{
  tasksScored: number;
  remindersSent: number;
  remindersFailed: number;
  skipped: number;
}> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const now = Date.now();

  const { data: tasks, error: tasksError } = await admin
    .from('tasks')
    .select('id, user_id, title, priority, status, due_date, urgency_score')
    .in('status', ['todo', 'in_progress'])
    .order('due_date', { ascending: true });

  if (tasksError) {
    throw tasksError;
  }
  if (!tasks || tasks.length === 0) {
    return { tasksScored: 0, remindersSent: 0, remindersFailed: 0, skipped: 0 };
  }

  const taskRows = tasks as TaskRow[];
  const taskIds = taskRows.map((task) => task.id);
  const { data: subtasks, error: subtasksError } = await admin
    .from('subtasks')
    .select('task_id, is_completed')
    .in('task_id', taskIds);

  if (subtasksError) {
    throw subtasksError;
  }

  const subtaskRows = (subtasks ?? []) as SubtaskRow[];
  const scoreUpdates = taskRows.map((task) => ({
    id: task.id,
    urgency_score: computeUrgencyScore(task, subtaskRows, now),
  }));

  const { error: updateError } = await admin.from('tasks').upsert(scoreUpdates);
  if (updateError) {
    throw updateError;
  }

  const tasksWithScores = taskRows.map((task) => {
    const scored = scoreUpdates.find((update) => update.id === task.id);
    return {
      ...task,
      urgency_score: scored?.urgency_score ?? task.urgency_score,
    };
  });

  const reminders = tasksWithScores
    .map((task) => ({ task, reminder: buildReminder(task) }))
    .filter(
      (entry): entry is { task: TaskRow; reminder: Reminder } =>
        entry.reminder !== null,
    );

  if (reminders.length === 0) {
    return {
      tasksScored: scoreUpdates.length,
      remindersSent: 0,
      remindersFailed: 0,
      skipped: 0,
    };
  }

  const { data: tokens, error: tokensError } = await admin
    .from('push_tokens')
    .select('id, user_id, token, platform');
  if (tokensError) {
    throw tokensError;
  }

  const tokensByUser = new Map<string, PushTokenRow[]>();
  for (const token of (tokens ?? []) as PushTokenRow[]) {
    const userTokens = tokensByUser.get(token.user_id) ?? [];
    userTokens.push(token);
    tokensByUser.set(token.user_id, userTokens);
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  let remindersSent = 0;
  let remindersFailed = 0;
  let skipped = 0;

  for (const { task, reminder } of reminders) {
    const { data: alreadyLogged, error: logLookupError } = await admin
      .from('notification_logs')
      .select('id')
      .eq('task_id', task.id)
      .eq('type', reminder.type)
      .gte('sent_at', startOfToday.toISOString())
      .limit(1);
    if (logLookupError) {
      console.error(`Notification dedup lookup failed for task ${task.id}: ${logLookupError.message}`);
    }
    if (alreadyLogged && alreadyLogged.length > 0) {
      skipped += 1;
      continue;
    }

    const userTokens = tokensByUser.get(task.user_id) ?? [];
    if (userTokens.length === 0) {
      await logNotification(admin, task, reminder, {
        status: 'skipped',
        error: 'no push token registered',
      });
      skipped += 1;
      continue;
    }

    const dataPayload: Record<string, string> = {
      type: reminder.type,
      task_id: task.id,
      score: task.urgency_score.toString(),
    };

    for (const pushToken of userTokens) {
      const result = await sendPush(pushToken.token, reminder.title, reminder.body);
      await logNotification(admin, task, reminder, {
        status: result.ok ? 'sent' : 'error',
        messageId: result.ticketId,
        error: result.error,
        data: {
          ...dataPayload,
          token_id: pushToken.id,
          platform: pushToken.platform,
        },
      });
      if (result.ok) {
        remindersSent += 1;
      } else {
        remindersFailed += 1;
      }
    }
  }

  return {
    tasksScored: scoreUpdates.length,
    remindersSent,
    remindersFailed,
    skipped,
  };
}

Deno.serve(async (_request: Request) => {
  const startedAt = Date.now();
  try {
    const result = await runCron();
    return Response.json({
      ok: true,
      elapsedMs: Date.now() - startedAt,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('urgency-cron failed', error);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

if (typeof Deno.cron === 'function') {
  Deno.cron('urgency-cron-hourly', '0 * * * *', () => {
    runCron().catch(
      (error) => console.error('urgency-cron scheduled run failed', error),
    );
  });
}
