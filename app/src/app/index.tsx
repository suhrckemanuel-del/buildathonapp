import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { FormTextInput } from '@/components/FormTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/components/theme';
import { getPostLoginRoute } from '@/lib/authFlow';
import { enableDemoSession, isDemoSession } from '@/lib/demoAuth';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState<'email' | 'google' | 'demo' | 'boot' | null>('boot');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        if (await isDemoSession()) {
          router.replace('/(tabs)' as never);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          router.replace((await getPostLoginRoute(user.id)) as never);
        }
      } finally {
        if (mounted) setLoading(null);
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleEmailAuth() {
    setLoading('email');
    setError(null);
    setMessage(null);

    try {
      const auth =
        mode === 'signin'
          ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
          : await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: { emailRedirectTo: getRedirectUrl() },
            });

      if (auth.error) throw auth.error;

      if (!auth.data.session) {
        setMessage('Check your email to confirm the account, then sign in here.');
        return;
      }

      router.replace((await getPostLoginRoute(auth.data.session.user.id)) as never);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(null);
    }
  }

  async function handleGoogleAuth() {
    setLoading('google');
    setError(null);
    setMessage(null);

    try {
      const redirectTo = getRedirectUrl();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: Platform.OS !== 'web',
        },
      });

      if (oauthError) throw oauthError;

      if (Platform.OS === 'web') return;
      if (!data.url) throw new Error('Google did not return an auth URL.');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success') {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
        if (exchangeError) throw exchangeError;

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) router.replace((await getPostLoginRoute(user.id)) as never);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign in failed.');
      setLoading(null);
    }
  }

  async function handleDemoMode() {
    setLoading('demo');
    await enableDemoSession();
    router.replace('/onboarding/username');
  }

  if (loading === 'boot') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const emailReady = email.trim().length > 4 && password.length >= 6;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Buildathon demo</Text>
          <Text style={styles.title}>Play Store</Text>
          <Text style={styles.subtitle}>
            Sign in, create a film profile, and jump into a matched group chat.
          </Text>
        </View>

        <View style={styles.modeRow}>
          <Pressable
            onPress={() => setMode('signin')}
            style={[styles.modeButton, mode === 'signin' && styles.modeButtonActive]}
          >
            <Text style={[styles.modeText, mode === 'signin' && styles.modeTextActive]}>Sign in</Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('signup')}
            style={[styles.modeButton, mode === 'signup' && styles.modeButtonActive]}
          >
            <Text style={[styles.modeText, mode === 'signup' && styles.modeTextActive]}>Create account</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <FormTextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
          <FormTextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
            textContentType={mode === 'signin' ? 'password' : 'newPassword'}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <PrimaryButton
            label={mode === 'signin' ? 'Sign in with email' : 'Create account'}
            onPress={handleEmailAuth}
            disabled={!emailReady || loading === 'email'}
            loading={loading === 'email'}
          />
          <PrimaryButton
            label="Continue with Google"
            onPress={handleGoogleAuth}
            loading={loading === 'google'}
            style={styles.secondaryButton}
          />
        </View>

        <View style={styles.demoCard}>
          <View style={styles.demoCopy}>
            <Text style={styles.demoTitle}>Need a reliable walkthrough?</Text>
            <Text style={styles.demoText}>
              Demo mode stores a local profile and sample chats so you can present the flow without auth setup.
            </Text>
          </View>
          <PrimaryButton
            label="Use demo mode"
            onPress={handleDemoMode}
            loading={loading === 'demo'}
            style={styles.demoButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getRedirectUrl() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/auth/callback`;
  }

  return Linking.createURL('/auth/callback');
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  content: {
    minHeight: '100%',
    paddingHorizontal: 20,
    paddingTop: 72,
    paddingBottom: 40,
    gap: 18,
  },
  header: {
    gap: 9,
    marginBottom: 8,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  modeRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  modeTextActive: {
    color: colors.text,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  secondaryButton: {
    backgroundColor: '#262626',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
  message: {
    color: colors.success,
    fontSize: 13,
    lineHeight: 18,
  },
  demoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3730a3',
    backgroundColor: '#18183a',
    padding: 16,
    gap: 14,
  },
  demoCopy: {
    gap: 6,
  },
  demoTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  demoText: {
    color: '#c7d2fe',
    fontSize: 14,
    lineHeight: 20,
  },
  demoButton: {
    backgroundColor: '#4f46e5',
  },
});
