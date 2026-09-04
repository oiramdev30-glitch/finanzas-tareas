import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BellRing, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton } from '../../components/ui/GlassButton';
import { GlassCard } from '../../components/ui/GlassCard';
import { ScreenTransition } from '../../components/ui/ScreenTransition';
import { ReminderModal } from '../../components/ui/ReminderModal';
import {
  DAY_SHORT,
  useReminderStore,
  type ReminderInput,
  type ScheduledReminder,
} from '../../stores/useReminderStore';
import { palette, withAlpha } from '../../theme/colors';
import { spacing } from '../../theme/glass';

function describeReminder(item: ScheduledReminder): string {
  const daysLabel = item.days.length === 7
    ? 'Todos los días'
    : item.days.length === 5 && item.days.every((d) => d >= 1 && d <= 5)
      ? 'Lun–Vie'
      : item.days.length === 2 && item.days.includes(0) && item.days.includes(6)
        ? 'Fin de semana'
        : item.days.map((d) => DAY_SHORT[d]).join(' ');
  const soundLabel = item.sound === 'silent' ? 'Silencioso' : item.sound === 'discreet' ? 'Discreto' : 'Tono normal';
  return `${item.times.join(' · ')} — ${daysLabel} — ${soundLabel}`;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const items = useReminderStore((state) => state.items);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ScheduledReminder | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    void useReminderStore.getState().load();
  }, []);

  const handleSave = async (input: ReminderInput): Promise<string | null> => {
    const store = useReminderStore.getState();
    if (editing) {
      const ok = await store.update(editing.id, input);
      if (!ok) return 'Revisa los datos del recordatorio.';
    } else {
      const created = await store.add(input);
      if (!created) return 'Revisa los datos del recordatorio.';
    }
    setModalVisible(false);
    return null;
  };

  const handleDelete = (id: string) => {
    void useReminderStore.getState().remove(id);
    setModalVisible(false);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + 96 },
      ]}
    >
      <ScreenTransition>
        <Text style={styles.title}>Ajustes</Text>

        <GlassCard style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>Recordatorios programados</Text>
            <GlassButton
              title="Nuevo"
              variant="secondary"
              size="sm"
              icon={Plus}
              onPress={() => {
                setEditing(null);
                setModalError(null);
                setModalVisible(true);
              }}
            />
          </View>
          <Text style={styles.description}>
            Crea avisos con horarios y días a tu medida. Te notificaremos aunque la app esté cerrada.
          </Text>
          {items.length === 0 ? (
            <Text style={styles.empty}>No tienes recordatorios. Crea el primero con el botón Nuevo.</Text>
          ) : (
            items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  setEditing(item);
                  setModalError(null);
                  setModalVisible(true);
                }}
                style={styles.row}
              >
                <BellRing
                  size={16}
                  color={item.enabled ? palette.accent : palette.textTertiary}
                  strokeWidth={2}
                />
                <View style={styles.rowText}>
                  <Text
                    style={[styles.rowTitle, !item.enabled && styles.rowTitleOff]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {describeReminder(item)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    void useReminderStore.getState().toggle(item.id, !item.enabled);
                  }}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: item.enabled }}
                  accessibilityLabel={`${item.enabled ? 'Desactivar' : 'Activar'} ${item.title}`}
                  style={[styles.switch, item.enabled && styles.switchOn]}
                >
                  <View style={[styles.knob, item.enabled && styles.knobOn]} />
                </Pressable>
              </Pressable>
            ))
          )}
          {modalError ? <Text style={styles.error}>{modalError}</Text> : null}
        </GlassCard>
      </ScreenTransition>

      <ReminderModal
        visible={modalVisible}
        initial={editing}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        onDelete={handleDelete}
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
  title: {
    color: palette.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  card: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  empty: {
    color: palette.textTertiary,
    fontSize: 13,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: withAlpha(palette.textPrimary, 0.1),
    backgroundColor: withAlpha(palette.textPrimary, 0.04),
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  rowTitleOff: {
    color: palette.textTertiary,
  },
  rowSub: {
    color: palette.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: withAlpha(palette.textPrimary, 0.1),
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchOn: {
    backgroundColor: palette.accent,
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  knobOn: {
    alignSelf: 'flex-end',
  },
  error: {
    color: palette.danger,
    fontSize: 13,
  },
});
