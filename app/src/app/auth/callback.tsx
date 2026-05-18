import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { getPostLoginRoute } from '@/lib/authFlow';
import { supabase } from '@/lib/supabase';
import { colors } from '@/components/theme';

export default function AuthCallbackScreen() {
  useEffect(() => {
    async function handleCallback() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error || !session) {
          router.replace('/');
          return;
        }

        router.replace((await getPostLoginRoute(session.user.id)) as never);
      } catch {
        router.replace('/');
      }
    }

    handleCallback();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.label}>Signing you in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  label: {
    color: colors.muted,
    fontSize: 14,
  },
});
