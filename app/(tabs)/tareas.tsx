import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, Vibration, View } from 'react-native';
import {
  CalendarClock,
  Circle,
  CircleCheck,
  Plus,
  Timer,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingView } from '../../components/ui/LoadingView';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { WeeklyProgressChart } from '../../components/ui/WeeklyProgressChart';
import { FocusTimer } from '../../components/ui/FocusTimer';
import { useTaskStore } from '../../stores/useTaskStore';
import { getWeeklyCompletion } from '../../lib/tasks';
import { formatDueLabel, formatMinutes } from '../../lib/format';
import type { Task, TaskPriority } from '../../lib/types';
import { palette, withAlpha } from '../../theme/colors';
import { radius, spacing } from '../../theme/glass';

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: palette.textTertiary,
  medium: palette.info,
  high: palette.warning,
  urgent: palette.danger,
};

interface TaskProgress {
  total: number;
  done: number;
}

interface TaskRowProps {
  task: Task;
  progress: TaskProgress;
  onComplete?: () => void;
  onFocus?: () => void;
}

function TaskRow({ task, progress, onComplete, onFocus }: TaskRowProps) {
  const done = task.status === 'done';
  const priorityColor = PRIORITY_COLOR[task.priority] ?? palette.textTertiary;
  const toggle = done ? null : onComplete;
  return (
    <View style={styles.taskRow}>
      {toggle ? (
        <Pressable
          onPress={toggle}
          hitSlop={10}
          style={styles.toggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`Completar ${task.title}`}
        >
          <Circle size={22} color={palette.textSecondary} strokeWidth={2} />
        </Pressable>
      ) : (
        <View style={styles.toggle}>
          <CircleCheck size={22} color={palette.success} strokeWidth={2} />
        </View>
      )}
      {!done && onFocus ? (
        <Pressable
          onPress={onFocus}
          hitSlop={10}
          style={styles.toggle}
          accessibilityLabel={`Enfocarse en ${task.title}`}
        >
          <Timer size={18} color={palette.textTertiary} strokeWidth={2} />
        </Pressable>
      ) : null}
      <View style={styles.taskBody}>
        <View style={styles.taskTitleRow}>
          <Text
            style={[styles.taskTitle, done && styles.taskTitleDone]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          <View
            style={[
              styles.priorityChip,
              {
                backgroundColor: withAlpha(priorityColor, 0.14),
                borderColor: withAlpha(priorityColor, 0.4),
              },
            ]}
          >
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {PRIORITY_LABEL[task.priority] ?? 'Media'}
            </Text>
          </View>
        </View>
        <View style={styles.taskMetaRow}>
          {task.due_date ? (
            <View style={styles.metaItem}>
              <CalendarClock size={13} color={palette.textSecondary} strokeWidth={2} />
              <Text style={styles.metaText}>{formatDueLabel(task.due_date)}</Text>
            </View>
          ) : null}
          {task.estimated_minutes ? (
            <View style={styles.metaItem}>
              <Timer size={13} color={palette.textSecondary} strokeWidth={2} />
              <Text style={styles.metaText}>{formatMinutes(task.estimated_minutes)}</Text>
            </View>
          ) : null}
          {task.subject ? <Text style={styles.subject}>{task.subject}</Text> : null}
        </View>
        {progress.total > 0 ? (
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>
              {progress.done}/{progress.total}
            </Text>
            <ProgressBar
              value={Math.round((progress.done / progress.total) * 100)}
              height={4}
              color={palette.accent}
              rounded
            />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const tasks = useTaskStore((state) => state.tasks);
  const subtasks = useTaskStore((state) => state.subtasks);
  const isLoading = useTaskStore((state) => state.isLoading);
  const error = useTaskStore((state) => state.error);

  useEffect(() => {
    void useTaskStore.getState().loadTasks();
  }, []);

  const pending = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== 'done' && task.status !== 'archived')
        .sort((a, b) => b.urgency_score - a.urgency_score),
    [tasks],
  );
  const completed = useMemo(
    () => tasks.filter((task) => task.status === 'done').slice(0, 8),
    [tasks],
  );
  const archived = useMemo(
    () => tasks.filter((task) => task.status === 'archived').slice(0, 10),
    [tasks],
  );
  const weekly = useMemo(() => getWeeklyCompletion(tasks), [tasks]);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [focusTask, setFocusTask] = useState<Task | null>(null);

  const handleQuickAdd = async () => {
    const title = quickTitle.trim();
    if (!title || quickSaving) return;
    setQuickSaving(true);
    try {
      await useTaskStore.getState().createTask({ title });
      setQuickTitle('');
      Vibration.vibrate(10);
    } catch {
    } finally {
      setQuickSaving(false);
    }
  };

  const progressOf = useCallback(
    (taskId: string): TaskProgress => {
      const taskSubtasks = subtasks.filter((item) => item.task_id === taskId);
      const total = taskSubtasks.length;
      const done = taskSubtasks.filter((item) => item.is_completed).length;
      return { total, done };
    },
    [subtasks],
  );

  const reload = () => {
    void useTaskStore.getState().loadTasks();
  };

  if (isLoading && tasks.length === 0) {
    return <LoadingView />;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 96 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={reload}
          tintColor={palette.accent}
          colors={[palette.accent]}
        />
      }
    >
      <ScreenTransition>
        <View style={styles.header}>
          <Text style={styles.title}>Tareas</Text>
        </View>
        <Text style={styles.pendingCount}>
          {pending.length} pendiente{pending.length === 1 ? '' : 's'}
        </Text>
        {error ? <Text style={styles.errorMessage}>{error}</Text> : null}

        <GlassCard compact>
          <Text style={styles.sectionTitleSmall}>Tu progreso semanal</Text>
          <WeeklyProgressChart days={weekly} />
        </GlassCard>

        <View style={styles.quickRow}>
          <Plus size={16} color={palette.accent} strokeWidth={2} />
          <TextInput
            value={quickTitle}
            onChangeText={setQuickTitle}
            onSubmitEditing={() => void handleQuickAdd()}
            placeholder="Agregar tarea rápida…"
            placeholderTextColor={palette.textTertiary}
            style={styles.quickInput}
            editable={!quickSaving}
          />
        </View>

        {pending.length === 0 ? (
          <GlassCard compact>
            <Text style={styles.emptyText}>No tienes tareas pendientes.</Text>
          </GlassCard>
        ) : (
          pending.map((task) => (
            <GlassCard key={task.id} compact>
              <TaskRow
                task={task}
                progress={progressOf(task.id)}
                onFocus={() => setFocusTask(task)}
                onComplete={() => {
                  Vibration.vibrate(15);
                  void useTaskStore.getState().completeTask(task.id).catch(() => undefined);
                }}
              />
            </GlassCard>
          ))
        )}

        {completed.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Completadas</Text>
            {completed.map((task) => (
              <GlassCard key={task.id} compact>
                <TaskRow task={task} progress={progressOf(task.id)} />
              </GlassCard>
            ))}
          </>
        ) : null}

        {archived.length > 0 ? (
          <>
            <Text style={styles.archivedTitle}>Archivadas ({archived.length})</Text>
            {archived.map((task) => (
              <GlassCard key={task.id} compact>
                <View style={styles.archivedRow}>
                  <Text style={styles.archivedText} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Pressable
                    onPress={() => {
                      void useTaskStore.getState().updateTask(task.id, { status: 'todo' }).catch(() => undefined);
                    }}
                    style={styles.restore}
                  >
                    <Text style={styles.restoreText}>Restaurar</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ))}
          </>
        ) : null}
      </ScreenTransition>

      <FocusTimer
        visible={focusTask !== null}
        onClose={() => setFocusTask(null)}
        taskTitle={focusTask?.title ?? ''}
        onLogMinutes={(minutes) => {
          if (!focusTask) return;
          const current = focusTask.estimated_minutes ?? 0;
          void useTaskStore
            .getState()
            .updateTask(focusTask.id, { estimated_minutes: current + minutes })
            .catch(() => undefined);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: palette.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pendingCount: {
    color: palette.textSecondary,
    fontSize: 14,
    marginTop: -12,
  },
  syncMessage: {
    color: palette.success,
    fontSize: 13,
  },
  errorMessage: {
    color: palette.danger,
    fontSize: 13,
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  emptyText: {
    color: palette.textSecondary,
    fontSize: 14,
  },
  taskRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  toggle: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskBody: {
    flex: 1,
    gap: spacing.sm,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  taskTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  taskTitleDone: {
    color: palette.textTertiary,
    textDecorationLine: 'line-through',
  },
  priorityChip: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: palette.textSecondary,
    fontSize: 12,
  },
  subject: {
    color: palette.info,
    fontSize: 12,
    fontWeight: '500',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressText: {
    color: palette.textTertiary,
    fontSize: 11,
    width: 36,
  },
  sectionTitleSmall: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  quickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: withAlpha(palette.textPrimary, 0.15),
    backgroundColor: withAlpha(palette.textPrimary, 0.05),
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  quickInput: {
    flex: 1,
    color: palette.textPrimary,
    fontSize: 14,
    paddingVertical: 4,
  },
  archivedTitle: {
    color: palette.textTertiary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  archivedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    opacity: 0.7,
  },
  archivedText: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 14,
  },
  restore: {
    borderWidth: 1,
    borderColor: withAlpha(palette.textPrimary, 0.15),
    backgroundColor: withAlpha(palette.textPrimary, 0.05),
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  restoreText: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
});