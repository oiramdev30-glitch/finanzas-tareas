import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { Pause, Play, RotateCcw, Timer, X } from 'lucide-react-native';
import { GlassButton } from './GlassButton';
import { GlassCard } from './GlassCard';
import { ProgressBar } from './ProgressBar';
import { palette, withAlpha } from '../../theme/colors';
import { spacing } from '../../theme/glass';

const PRESETS = [15, 25, 50];

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function FocusTimer({
  visible,
  onClose,
  taskTitle,
  onLogMinutes,
}: {
  visible: boolean;
  onClose: () => void;
  taskTitle: string;
  onLogMinutes: (minutes: number) => void;
}) {
  const [preset, setPreset] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setRemaining(preset * 60);
      setRunning(false);
      setFinished(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setRunning(false);
          setFinished(true);
          Vibration.vibrate(300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running]);

  const total = preset * 60;
  const elapsed = total - remaining;
  const progress = total > 0 ? Math.min(100, Math.round((elapsed / total) * 100)) : 0;

  const selectPreset = (minutes: number) => {
    setPreset(minutes);
    setRemaining(minutes * 60);
    setRunning(false);
    setFinished(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <GlassCard style={styles.card}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Timer size={17} color={palette.accent} strokeWidth={2} />
                <Text style={styles.title}>Modo enfoque</Text>
              </View>
              <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Cerrar">
                <X size={15} color={palette.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>
            <Text style={styles.task} numberOfLines={2}>
              {taskTitle}
            </Text>
            <View style={styles.presets}>
              {PRESETS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => selectPreset(p)}
                  style={[styles.preset, preset === p && styles.presetActive]}
                >
                  <Text style={[styles.presetText, preset === p && styles.presetTextActive]}>
                    {p} min
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.clock}>{formatClock(remaining)}</Text>
            <ProgressBar value={progress} color={finished ? palette.success : palette.accent} />
            {finished ? (
              <View style={styles.finished}>
                <Text style={styles.finishedText}>¡Sesión completada! Buen enfoque.</Text>
                <GlassButton
                  title={`Sumar ${preset} min a la tarea`}
                  variant="primary"
                  size="sm"
                  icon={Timer}
                  onPress={() => {
                    onLogMinutes(preset);
                    onClose();
                  }}
                />
              </View>
            ) : (
              <View style={styles.actions}>
                <GlassButton
                  title={running ? 'Pausar' : elapsed > 0 ? 'Continuar' : 'Iniciar'}
                  variant="primary"
                  icon={running ? Pause : Play}
                  onPress={() => setRunning((v) => !v)}
                  style={styles.mainAction}
                />
                <GlassButton
                  title=""
                  variant="secondary"
                  icon={RotateCcw}
                  onPress={() => {
                    setRemaining(preset * 60);
                    setRunning(false);
                    setFinished(false);
                  }}
                />
              </View>
            )}
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
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
  task: {
    color: palette.textSecondary,
    fontSize: 13,
  },
  presets: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  preset: {
    borderWidth: 1,
    borderColor: withAlpha(palette.textPrimary, 0.15),
    backgroundColor: withAlpha(palette.textPrimary, 0.05),
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  presetActive: {
    borderColor: palette.accent,
    backgroundColor: withAlpha(palette.accent, 0.15),
  },
  presetText: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  presetTextActive: {
    color: palette.accent,
  },
  clock: {
    color: palette.textPrimary,
    fontSize: 52,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  finished: {
    gap: spacing.sm,
  },
  finishedText: {
    color: palette.success,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mainAction: {
    flex: 1,
  },
});
