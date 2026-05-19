import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { FormTextInput } from '@/components/FormTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radii } from '@/components/theme';
import { api } from '@/lib/api';
import { isDemoSession, saveDemoGamingProfile } from '@/lib/demoAuth';
import { supabase } from '@/lib/supabase';
import type { Json } from '@/lib/database.types';
import type { GamingProfile } from '../../../../shared/types';

const GENRES = [
  'RPG',
  'FPS',
  'Battle Royale',
  'Strategy',
  'Sports',
  'MOBA',
  'Indie',
  'Horror',
  'Simulation',
];

export default function GamingProfileScreen() {
  const [games, setGames] = useState<[string, string, string]>(['', '', '']);
  const [genres, setGenres] = useState<string[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState('');
  const [shameGame, setShameGame] = useState('');
  const [saving, setSaving] = useState(false);

  const setGame = (index: 0 | 1 | 2, value: string) => {
    setGames((prev) => {
      const next: [string, string, string] = [...prev] as [string, string, string];
      next[index] = value;
      return next;
    });
  };

  const toggleGenre = (genre: string) => {
    setGenres((prev) => (prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]));
  };

  const allFilled =
    games[0].trim() &&
    games[1].trim() &&
    games[2].trim() &&
    genres.length > 0 &&
    recentlyPlayed.trim() &&
    shameGame.trim();

  const handleSubmit = async () => {
    if (!allFilled) {
      Alert.alert('All fields required', 'Please fill in every field before continuing.');
      return;
    }

    setSaving(true);
    try {
      const profile: GamingProfile = {
        top_games: [games[0].trim(), games[1].trim(), games[2].trim()],
        favourite_genre: genres[0],
        genres,
        recently_played: recentlyPlayed.trim(),
        shame_game: shameGame.trim(),
      };

      if (await isDemoSession()) {
        await saveDemoGamingProfile(profile);
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
          category: 'games',
          data: profile as unknown as Json,
        },
        { onConflict: 'user_id,category' },
      );

      if (error) throw error;

      // Fire-and-forget: populate embedding column so matching can use it
      api.embedProfile({ user_id: user.id, category: 'games' }).catch(() => {});

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
        <Text style={styles.progress}>Step 3 of 3</Text>
        <Pressable onPress={() => router.replace('/(tabs)' as never)} hitSlop={12}>
          <Text style={styles.skip}>Skip for now</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryGlyph}>{'\u{1F3AE}'}</Text>
          <Text style={styles.categoryLabel}>Gaming</Text>
        </View>

        <Text style={styles.title}>Your gaming taste</Text>
        <Text style={styles.subtitle}>
          Genre, playstyle, and the one game you secretly love — that's what we match on.
        </Text>

        <Text style={styles.sectionLabel}>Your top 3 games</Text>
        {(['Game 1', 'Game 2', 'Game 3'] as const).map((label, i) => (
          <View key={label} style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <FormTextInput
              value={games[i as 0 | 1 | 2]}
              onChangeText={(v) => setGame(i as 0 | 1 | 2, v)}
              placeholder={`e.g. ${['Elden Ring', 'Hades', 'Valorant'][i]}`}
              returnKeyType="next"
            />
          </View>
        ))}

        <Text style={styles.sectionLabel}>Genres you play</Text>
        <View style={styles.chipsRow}>
          {GENRES.map((genre) => {
            const selected = genres.includes(genre);
            return (
              <Pressable
                key={genre}
                onPress={() => toggleGenre(genre)}
                style={[
                  styles.chip,
                  selected && { backgroundColor: colors.gaming + '22', borderColor: colors.gaming },
                ]}
              >
                <Text style={[styles.chipText, selected && { color: colors.gaming }]}>{genre}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Recently played</Text>
          <TextInput
            value={recentlyPlayed}
            onChangeText={setRecentlyPlayed}
            placeholder="What have you been playing lately?"
            placeholderTextColor={colors.subdued}
            multiline
            style={[styles.textarea]}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Shame game</Text>
          <Text style={styles.helper}>The one you'd never admit to at a dinner party. We won't judge.</Text>
          <TextInput
            value={shameGame}
            onChangeText={setShameGame}
            placeholder="e.g. that one mobile gacha game"
            placeholderTextColor={colors.subdued}
            multiline
            style={[styles.textarea]}
          />
        </View>

        <PrimaryButton
          label="Find my gaming people"
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
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  progress: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  skip: { fontSize: 14, color: colors.gaming, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.gaming,
    backgroundColor: colors.gaming + '1a',
    borderRadius: radii.pill,
    marginTop: 12,
    marginBottom: 16,
  },
  categoryGlyph: { fontSize: 16, color: colors.gaming },
  categoryLabel: { fontSize: 13, fontWeight: '800', color: colors.gaming, letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: 28, lineHeight: 22 },
  sectionLabel: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 12 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  helper: { fontSize: 12, color: colors.subdued, marginBottom: 8 },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  textarea: {
    minHeight: 80,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  button: { marginTop: 8 },
});
