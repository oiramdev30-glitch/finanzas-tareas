import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Plus, Trash2, X } from 'lucide-react-native';
import { GlassButton } from './GlassButton';
import { GlassCard } from './GlassCard';
import {
  ALL_DAYS,
  DAY_SHORT,
  DAY_NAMES,
  WEEKDAYS,
  WEEKENDS,
  normalizeTime,
  type ReminderInput,
  type ReminderSound,
  type ScheduledReminder,
} from '../../stores/useReminderStore';
import { palette, withAlpha } from '../../theme/colors';
import { spacing } from '../../theme/glass';

const SOUND_OPTIONS: { value: ReminderSound; label: string }[] = [
  { value: 'default', label: 'Predeterminado' },
  { value: 'discreet', label: 'Discreto' },
  { value: 'silent', label: 'Silencioso' },
];

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

function sameDays(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((d) => b.includes(d));
}

export function ReminderModal({
  visible,
  initial,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  initial: ScheduledReminder | null;
  onClose: () => void;
  onSave: (input: ReminderInput) => Promise<string | null>;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [times, setTimes] = useState<string[]>([]);
  const [timeDraft, setTimeDraft] = useState('');
  const [days, setDays] = useState<number[]>([...ALL_DAYS]);
  const [sound, setSound] = useState<ReminderSound>('default');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setTitle(initial?.title ?? '');
      setTimes(initial ? [...initial.times] : []);
      setTimeDraft('');
      setDays(initial ? [...initial.days] : [...ALL_DAYS]);
      setSound(initial?.sound ?? 'default');
      setFormError(null);
    }
  }, [visible, initial]);

  const preset: 'daily' | 'weekdays' | 'weekends' | 'custom' = sameDays(days, ALL_DAYS)
    ? 'daily'
    : sameDays(days, WEEKDAYS)
      ? 'weekdays'
      : sameDays(days, WEEKENDS)
        ? 'weekends'
        : 'custom';

  const toggleDay = (day: number) => {
    setDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day];
      return next.sort((a, b) => a - b);
    });
  };

  const addTime = () => {
    const normalized = normalizeTime(timeDraft);
    if (!normalized) {
      setFormError('Escribe una hora válida (HH:mm).');
      return;
    }
    if (!times.includes(normalized)) {
      setTimes((prev) => [...prev, normalized].sort());
    }
    setTimeDraft('');
    setFormError(null);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setFormError('Ponle un nombre al recordatorio.');
      return;
    }
    if (times.length === 0) {
      setFormError('Agrega al menos una hora.');
      return;
    }
    if (days.length === 0) {
      setFormError('Elige al menos un día.');
      return;
    }
    void onSave({ title: title.trim(), times, days, sound }).then((error) => {
      if (error) setFormError(error);
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <GlassCard style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>{initial ? 'Editar recordatorio' : 'Nuevo recordatorio'}</Text>
              <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Cerrar">
                <X size={15} color={palette.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>

            <Text style={styles.label}>Título</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Revisar tareas de la escuela"
              placeholderTextColor={palette.textTertiary}
              maxLength={120}
              style={styles.input}
            />

            <Text style={styles.label}>Horas</Text>
            {times.length > 0 ? (
              <View style={styles.chips}>
                {times.map((t) => (
                  <View key={t} style={styles.timeChip}>
                    <Text style={styles.timeChipText}>{t}</Text>
                    <Pressable
                      onPress={() => setTimes((prev) => prev.filter((x) => x !== t))}
                      accessibilityLabel={`Quitar hora ${t}`}
                    >
                      <X size={13} color={palette.accent} strokeWidth={2} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={styles.timeRow}>
              <TextInput
                value={timeDraft}
                onChangeText={setTimeDraft}
                placeholder="HH:mm"
                placeholderTextColor={palette.textTertiary}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                style={[styles.input, styles.timeInput]}
              />
              <GlassButton title="" size="sm" icon={Plus} onPress={addTime} />
            </View>

            <Text style={styles.label}>Repetición</Text>
            <View style={styles.chips}>
              {(
                [
                  { key: 'daily', label: 'Diario' },
                  { key: 'weekdays', label: 'Lun–Vie' },
                  { key: 'weekends', label: 'Fin de semana' },
                  { key: 'custom', label: 'Personalizado' },
                ] as const
              ).map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => {
                    if (p.key === 'daily') setDays([...ALL_DAYS]);
                    else if (p.key === 'weekdays') setDays([...WEEKDAYS]);
                    else if (p.key === 'weekends') setDays([...WEEKENDS]);
                  }}
                  style={[styles.pill, preset === p.key && styles.pillActive]}
                >
                  <Text style={[styles.pillText, preset === p.key && styles.pillTextActive]}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.days}>
              {DAY_ORDER.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => toggleDay(d)}
                  accessibilityLabel={DAY_NAMES[d]}
                  style={[styles.day, days.includes(d) && styles.dayActive]}
                >
                  <Text style={[styles.dayText, days.includes(d) && styles.dayTextActive]}>
                    {DAY_SHORT[d]}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Tono de notificación</Text>
            <View style={styles.chips}>
              {SOUND_OPTIONS.map((o) => (
                <Pressable
                  key={o.value}
                  onPress={() => setSound(o.value)}
                  style={[styles.pill, sound === o.value && styles.pillActive]}
                >
                  <Text style={[styles.pillText, sound === o.value && styles.pillTextActive]}>
                    {o.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {formError ? <Text style={styles.error}>{formError}</Text> : null}

            <View style={styles.actions}>
              <GlassButton
                title={initial ? 'Guardar' : 'Crear'}
                onPress={handleSave}
                style={styles.mainAction}
              />
              {initial ? (
                <GlassButton title="" variant="danger" icon={Trash2} onPress={() => onDelete(initial.id)} />
              ) : null}
            </View>
          </GlassCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
  },
  card: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: palette.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: withAlpha(palette.textPrimary, 0.15),
    backgroundColor: withAlpha(palette.textPrimary, 0.05),
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: withAlpha(palette.textPrimary, 0.15),
    backgroundColor: withAlpha(palette.textPrimary, 0.05),
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
    fontSize: 15,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: withAlpha(palette.accent, 0.4),
    backgroundColor: withAlpha(palette.accent, 0.1),
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  timeChipText: {
    color: palette.accent,
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  timeInput: {
    flex: 1,
  },
  pill: {
    borderWidth: 1,
    borderColor: withAlpha(palette.textPrimary, 0.15),
    backgroundColor: withAlpha(palette.textPrimary, 0.05),
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  pillActive: {
    borderColor: palette.accent,
    backgroundColor: withAlpha(palette.accent, 0.15),
  },
  pillText: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: palette.accent,
  },
  days: {
    flexDirection: 'row',
    gap: 6,
  },
  day: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: withAlpha(palette.textPrimary, 0.15),
    backgroundColor: withAlpha(palette.textPrimary, 0.05),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayActive: {
    borderColor: palette.accent,
    backgroundColor: withAlpha(palette.accent, 0.2),
  },
  dayText: {
    color: palette.textTertiary,
    fontSize: 13,
    fontWeight: '700',
  },
  dayTextActive: {
    color: palette.accent,
  },
  error: {
    color: palette.danger,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mainAction: {
    flex: 1,
  },
});
