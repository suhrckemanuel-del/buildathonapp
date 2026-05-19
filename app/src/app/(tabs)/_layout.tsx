import { Tabs, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/components/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
      }}
      tabBar={(props) => <V2TabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Groups',
          tabBarLabel: 'Groups',
          tabBarIcon: ({ color }) => <TabIcon glyph={'\u{1F4AC}'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Match',
          tabBarLabel: 'Match',
          tabBarIcon: ({ color }) => <TabIcon glyph={'\u{1F9ED}'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarLabel: 'Events',
          tabBarIcon: ({ color }) => <TabIcon glyph={'\u{1F4C5}'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon glyph={'\u{1F464}'} color={color} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ color, fontSize: 18, lineHeight: 22 }}>{glyph}</Text>;
}

const TAB_LABELS: Record<string, string> = {
  index: 'Groups',
  discover: 'Match',
  events: 'Events',
  profile: 'Profile',
};

function V2TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.tabWrap, { paddingBottom: Math.max(insets.bottom, 18) }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create event"
        onPress={() => router.push('/events/create' as never)}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <View style={styles.navPillWrap}>
        {state.routes.map((route: any, index: number) => {
          const focused = state.index === index;
          const label = TAB_LABELS[route.name] ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              style={({ pressed }) => [
                styles.navPill,
                focused && styles.navPillActive,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.navPillText, focused && styles.navPillTextActive]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 10,
    backgroundColor: 'rgba(10,10,15,0.86)',
  },
  fab: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  fabText: {
    color: colors.background,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
  },
  navPillWrap: {
    flex: 1,
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: colors.text,
    padding: 5,
    flexDirection: 'row',
    gap: 4,
  },
  navPill: {
    flex: 1,
    minWidth: 0,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  navPillActive: {
    backgroundColor: colors.primary,
  },
  navPillText: {
    color: '#555663',
    fontSize: 11,
    fontWeight: '900',
  },
  navPillTextActive: {
    color: colors.text,
  },
  pressed: {
    opacity: 0.84,
  },
});
