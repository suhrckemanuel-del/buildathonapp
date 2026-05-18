import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { FormTextInput } from '@/components/FormTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/components/theme';
import { isDemoSession, saveDemoFilmProfile } from '@/lib/demoAuth';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';
import type { FilmProfile } from '../../../../shared/types';

export default function FilmProfileScreen() {
  const [films, setFilms] = useState<[string, string, string]>(['', '', '']);
  const [actor, setActor] = useState('');
  const [director, setDirector] = useState('');
  const [disliked, setDisliked] = useState('');
  const [saving, setSaving] = useState(false);

  const setFilm = (index: 0 | 1 | 2, value: string) => {
    setFilms((prev) => {
      const next: [string, string, string] = [...prev] as [string, string, string];
      next[index] = value;
      return next;
    });
  };

  const allFilled =
    films[0].trim() &&
    films[1].trim() &&
    films[2].trim() &&
    actor.trim() &&
    director.trim() &&
    disliked.trim();

  const handleSubmit = async () => {
    if (!allFilled) {
      Alert.alert('All fields required', 'Please fill in every field before continuing.');
      return;
    }

    setSaving(true);
    try {
      const profile: FilmProfile = {
        top_films: [films[0].trim(), films[1].trim(), films[2].trim()],
        favourite_actor: actor.trim(),
        favourite_director: director.trim(),
        disliked_film: disliked.trim(),
      };

      if (await isDemoSession()) {
        await saveDemoFilmProfile(profile);
        router.replace('/(tabs)' as never);
        return;
      }

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        Alert.alert('Not signed in', 'Please sign in to save your profile.');
        return;
      }

      const { error } = await supabase.from('interest_profiles').upsert(
        {
          user_id: user.id,
          category: 'films',
          data: profile as unknown as Json,
        },
        { onConflict: 'user_id,category' },
      );

      if (error) throw error;

      router.replace('/(tabs)' as never);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert('Error saving profile', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.progress}>Step 2 of 2</Text>
        <Pressable onPress={() => router.replace('/(tabs)' as never)} hitSlop={12}>
          <Text style={styles.skip}>Skip for now</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Your film taste</Text>
        <Text style={styles.subtitle}>Help us find people who share your passion for cinema.</Text>

        <Text style={styles.sectionLabel}>Your top 3 films</Text>
        {(['Film 1', 'Film 2', 'Film 3'] as const).map((label, i) => (
          <View key={label} style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <FormTextInput
              value={films[i as 0 | 1 | 2]}
              onChangeText={(v) => setFilm(i as 0 | 1 | 2, v)}
              placeholder={`e.g. ${['2001: A Space Odyssey', 'The Godfather', 'Mulholland Drive'][i]}`}
              returnKeyType="next"
            />
          </View>
        ))}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Favourite actor</Text>
          <FormTextInput
            value={actor}
            onChangeText={setActor}
            placeholder="e.g. Cate Blanchett"
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Favourite director</Text>
          <FormTextInput
            value={director}
            onChangeText={setDirector}
            placeholder="e.g. Stanley Kubrick"
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>A film you dislike</Text>
          <FormTextInput
            value={disliked}
            onChangeText={setDisliked}
            placeholder="e.g. Transformers"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
        </View>

        <PrimaryButton
          label="Save and continue"
          onPress={handleSubmit}
          disabled={!allFilled || saving}
          loading={saving}
          style={styles.button}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  progress: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
  },
  skip: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: colors.muted,
    marginBottom: 28,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 6,
  },
  button: {
    marginTop: 8,
  },
});
