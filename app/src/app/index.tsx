import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle the deep-link callback that Supabase redirects to after OAuth
  const url = Linking.useURL();
  useEffect(() => {
    if (!url) return;

    const parsed = Linking.parse(url);
    // Supabase returns tokens in the fragment (#access_token=...&refresh_token=...)
    const fragment = (parsed as { queryParams?: Record<string, string> }).queryParams;
    const accessToken = fragment?.access_token;
    const refreshToken = fragment?.refresh_token;

    if (accessToken && refreshToken) {
      (async () => {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setError(sessionError.message);
          return;
        }
        await checkProfileAndRedirect();
      })();
    }
  }, [url]);

  async function checkProfileAndRedirect() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      router.replace('/(tabs)/');
    } else {
      router.replace('/onboarding/username');
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);

    const redirectTo = makeRedirectUri({
      scheme: 'buildathon-app',
      path: 'auth/callback',
    });

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (oauthError || !data.url) {
      setError(oauthError?.message ?? 'Failed to start sign-in.');
      setLoading(false);
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== 'success') {
      // User cancelled or browser was dismissed
      setLoading(false);
      return;
    }

    // The deep-link useEffect above will handle token extraction + redirect
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.appName}>Buildathon</Text>
        <Text style={styles.tagline}>Meet people who get your taste</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          loading && styles.buttonDisabled,
        ]}
        onPress={handleGoogleSignIn}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue with Google</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  appName: {
    fontSize: 42,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  error: {
    color: '#f87171',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
