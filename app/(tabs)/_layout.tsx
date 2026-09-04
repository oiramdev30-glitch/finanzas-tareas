import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { House, ListChecks, Settings, Wallet } from 'lucide-react-native';
import { AnimatedTabBar, type TabItem } from '../../components/ui/AnimatedTabBar';
import { spacing } from '../../theme/glass';

const TAB_ITEMS: readonly TabItem[] = [
  { key: 'index', label: 'Inicio', icon: House },
  { key: 'finanzas', label: 'Finanzas', icon: Wallet },
  { key: 'tareas', label: 'Tareas', icon: ListChecks },
  { key: 'config', label: 'Ajustes', icon: Settings },
];

interface TabBarRenderProps {
  state: { index: number; routes: readonly { name: string; key: string }[] };
  navigation: { navigate: (name: string) => void };
}

function renderTabBar({ state, navigation }: TabBarRenderProps) {
  const activeRoute = state.routes[state.index];
  const activeKey = activeRoute ? activeRoute.name : 'index';
  return (
    <View style={styles.tabBarWrap}>
      <AnimatedTabBar
        tabs={TAB_ITEMS}
        activeKey={activeKey}
        onChange={(key) => navigation.navigate(key)}
      />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={renderTabBar}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="finanzas" />
      <Tabs.Screen name="tareas" />
      <Tabs.Screen name="config" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});