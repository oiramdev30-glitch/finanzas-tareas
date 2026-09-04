import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/glass';

export interface LoadingViewProps {
  message?: string;
}

export function LoadingView({ message = 'Cargando…' }: LoadingViewProps) {
  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={palette.accent} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  text: {
    color: palette.textSecondary,
    fontSize: 14,
  },
});