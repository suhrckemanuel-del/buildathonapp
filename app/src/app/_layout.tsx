import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Platform, StyleSheet, View } from 'react-native';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const id = 'migos-hide-scrollbars';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.textContent = `*::-webkit-scrollbar { width: 0; height: 0; display: none; } * { scrollbar-width: none; -ms-overflow-style: none; }`;
    document.head.appendChild(s);
  }
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.outer}>
      <View style={styles.frame}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="chat/[groupId]"
            options={{
              headerStyle: { backgroundColor: '#0a0a0f' },
              headerTintColor: '#f0f0ff',
              headerTitleStyle: { color: '#f0f0ff' },
              headerBackTitle: 'Back',
            }}
          />
          <Stack.Screen name="onboarding/username" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/select-category" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/film-profile" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/gaming-profile" options={{ headerShown: false }} />
          <Stack.Screen name="events/create" options={{ headerShown: false }} />
          <Stack.Screen name="match/searching" options={{ headerShown: false }} />
          <Stack.Screen name="match/[groupId]" options={{ headerShown: false }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        </Stack>
      </View>
    </GestureHandlerRootView>
  );
}

const isWeb = Platform.OS === 'web';

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: isWeb ? '#000' : '#0a0a0f',
    ...(isWeb && { alignItems: 'center', justifyContent: 'center' }),
  },
  frame: isWeb
    ? {
        width: '100%',
        maxWidth: 430,
        height: '100%',
        maxHeight: 932,
        backgroundColor: '#0a0a0f',
        borderRadius: 32,
        overflow: 'hidden',
        boxShadow: '0 10px 50px rgba(0,0,0,0.6)',
      }
    : { flex: 1, backgroundColor: '#0a0a0f' },
});
