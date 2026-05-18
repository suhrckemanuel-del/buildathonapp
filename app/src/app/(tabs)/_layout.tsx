import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: '#333333',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Groups',
          tabBarLabel: 'Groups',
          tabBarIcon: ({ color }) => (
            // house emoji as a simple icon
            <TabIcon label="🏠" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Discover',
          tabBarLabel: 'Discover',
          tabBarIcon: ({ color }) => (
            <TabIcon label="🧭" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// Lightweight emoji icon wrapper — avoids needing an icon library
import { Text } from 'react-native';

function TabIcon({ label, color: _color }: { label: string; color: string }) {
  return (
    <Text style={{ fontSize: 20, lineHeight: 24 }}>{label}</Text>
  );
}
