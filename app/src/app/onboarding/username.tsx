import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
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
      return;
    }

    if (!USERNAME_REGEX.test(value)) {
      setValidationError('3–20 characters, letters, numbers, underscores only');
    } else {
      setValidationError(null);
    }
  }

  async function handleSubmit() {
    if (!USERNAME_REGEX.test(username)) {
      setValidationError('3–20 characters, letters, numbers, underscores only');
      return;
    }

    setLoading(true);
    setServerError(null);

    try {
      // 1. Check uniqueness
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

      // 2. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setServerError('Session expired. Please sign in again.');
        router.replace('/');
        return;
      }

      // 3. Insert profile row
      const { error: insertError } = await supabase
        .from('users')
        .insert({ id: user.id, username });

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
            This is how others will see you — keep it anonymous if you like
          </Text>
        </View>

        <View style={styles.inputGroup}>
          <TextInput
            style={[styles.input, displayedError ? styles.inputError : null]}
            value={username}
            onChangeText={handleChange}
            placeholder="e.g. film_nerd_42"
            placeholderTextColor="#4b5563"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <Text style={styles.rules}>
            3–20 characters, letters, numbers, underscores only
          </Text>
          {displayedError ? (
            <Text style={styles.errorText}>{displayedError}</Text>
          ) : null}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            (!isValid || loading) && styles.buttonDisabled,
            pressed && isValid && !loading && styles.buttonPressed,
          ]}
          onPress={handleSubmit}
          disabled={!isValid || loading}
          accessibilityRole="button"
          accessibilityLabel="Continue"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f0f',
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
    fontWeight: '700',
    color: '#ffffff',
  },
  subtext: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  inputGroup: {
    gap: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#f87171',
  },
  rules: {
    fontSize: 12,
    color: '#9ca3af',
  },
  errorText: {
    fontSize: 13,
    color: '#f87171',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
