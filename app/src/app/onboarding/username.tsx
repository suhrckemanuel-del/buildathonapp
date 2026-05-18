import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { FormTextInput } from '@/components/FormTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/components/theme';
import { isDemoSession, saveDemoUsername } from '@/lib/demoAuth';
import { supabase } from '@/lib/supabase';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function UsernameScreen() {
  const [username, setUsername] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleChange(value: string) {
    setUsername(value);
    setServerError(null);

    if (value.length === 0) {
      setValidationError(null);
    } else if (!USERNAME_REGEX.test(value)) {
      setValidationError('3-20 characters, letters, numbers, underscores only');
    } else {
      setValidationError(null);
    }
  }

  async function handleSubmit() {
    if (!USERNAME_REGEX.test(username)) {
      setValidationError('3-20 characters, letters, numbers, underscores only');
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      if (await isDemoSession()) {
        await saveDemoUsername(username);
        router.replace('/onboarding/film-profile');
        return;
      }

      const { data: existing, error: lookupError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle();

      if (lookupError) {
        setServerError('Something went wrong. Please try again.');
        return;
      }

      if (existing) {
        setServerError('Username already taken');
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setServerError('Session expired. Please sign in again.');
        router.replace('/');
        return;
      }

      const { error: insertError } = await supabase.from('users').insert({ id: user.id, username });

      if (insertError) {
        setServerError(insertError.message);
        return;
      }

      router.replace('/onboarding/film-profile');
    } finally {
      setLoading(false);
    }
  }

  const isValid = USERNAME_REGEX.test(username);
  const displayedError = serverError ?? validationError;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <Text style={styles.heading}>Choose your username</Text>
          <Text style={styles.subtext}>
            This is how others will see you. Keep it anonymous if you like.
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <FormTextInput
            value={username}
            onChangeText={handleChange}
            placeholder="e.g. film_nerd_42"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            error={displayedError}
          />
          <Text style={styles.rules}>3-20 characters, letters, numbers, underscores only</Text>
        </View>

        <PrimaryButton
          label="Continue"
          onPress={handleSubmit}
          disabled={!isValid || loading}
          loading={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
    gap: 32,
  },
  header: {
    gap: 10,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtext: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  inputGroup: {
    gap: 8,
  },
  rules: {
    fontSize: 12,
    color: colors.muted,
  },
});
