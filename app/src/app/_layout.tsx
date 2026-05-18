import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="discover" options={{ headerShown: false }} />
        <Stack.Screen
          name="chat/[groupId]"
          options={{
            headerStyle: { backgroundColor: '#0f0f0f' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { color: '#ffffff' },
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen name="onboarding/username" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding/film-profile" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
