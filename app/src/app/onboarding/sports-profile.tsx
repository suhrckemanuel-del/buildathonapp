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
import { isDemoSession, proceedAfterProfileSave, saveDemoSportsProfile } from '@/lib/demoAuth';
import type { SportsProfile } from '../../../../shared/types';

type PlayOrWatch = 'play' | 'watch' | 'both';

const PLAY_OR_WATCH_OPTIONS: { value: PlayOrWatch; label: string }[] = [
  { value: 'play', label: 'I play' },
  { value: 'watch', label: 'I watch' },
  { value: 'both', label: 'Both' },
];

export default function SportsProfileScreen() {
  const [favouriteSport, setFavouriteSport] = useState('');
  const [favouriteTeam, setFavouriteTeam] = useState('');
  const [playOrWatch, setPlayOrWatch] = useState<PlayOrWatch | null>(null);
  const [athletesInput, setAthletesInput] = useState('');
  const [saving, setSaving] = useState(false);

  const athletes = athletesInput
    .split(',')
    .map((a) => a.trim())
    .filter((a) => a.length > 0);

  const allFilled =
    favouriteSport.trim() &&
    favouriteTeam.trim() &&
    !!playOrWatch &&
    athletes.length > 0;

  const handleSubmit = async () => {
    if (!allFilled || !playOrWatch) {
      Alert.alert('All fields required', 'Please fill in every field before continuing.');
      return;
    }

    setSaving(true);
    try {
      const profile: SportsProfile = {
        favourite_sport: favouriteSport.trim(),
        favourite_team: favouriteTeam.trim(),
        play_or_watch: playOrWatch,
        top_athletes: athletes,
      };

      if (await isDemoSession()) {
        await saveDemoSportsProfile(profile);
        const nextRoute = await proceedAfterProfileSave('sports');
        router.replace(nextRoute as never);
        return;
      }

      Alert.alert('Sign in required', 'Sports profiles are saved through demo mode for now.');
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
        <Text style={styles.progress}>Sports profile</Text>
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
          <Text style={styles.categoryGlyph}>{'⚽'}</Text>
          <Text style={styles.categoryLabel}>Sports</Text>
        </View>

        <Text style={styles.title}>Your sports taste</Text>
        <Text style={styles.subtitle}>
          Sport, team, and the athletes you actually follow power the AI match for your small sports group.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Favourite sport</Text>
          <FormTextInput
            value={favouriteSport}
            onChangeText={setFavouriteSport}
            placeholder="e.g. Football, basketball, F1"
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Team you ride for</Text>
          <FormTextInput
            value={favouriteTeam}
            onChangeText={setFavouriteTeam}
            placeholder="e.g. Liverpool FC, Lakers, Ferrari"
            returnKeyType="next"
          />
        </View>

        <Text style={styles.sectionLabel}>Do you play or watch?</Text>
        <View style={styles.chipsRow}>
          {PLAY_OR_WATCH_OPTIONS.map(({ value, label }) => {
            const selected = playOrWatch === value;
            return (
              <Pressable
                key={value}
                onPress={() => setPlayOrWatch(value)}
                style={[
                  styles.chip,
                  selected && { backgroundColor: colors.sports + '22', borderColor: colors.sports },
                ]}
              >
                <Text style={[styles.chipText, selected && { color: colors.sports }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Top athletes you follow</Text>
          <Text style={styles.helper}>Comma-separated. We use these to find people who track the same names.</Text>
          <TextInput
            value={athletesInput}
            onChangeText={setAthletesInput}
            placeholder="e.g. Mbappe, Lebron, Verstappen"
            placeholderTextColor={colors.subdued}
            multiline
            style={styles.textarea}
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
  skip: { fontSize: 14, color: colors.sports, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.sports,
    backgroundColor: colors.sports + '1a',
    borderRadius: radii.pill,
    marginTop: 12,
    marginBottom: 16,
  },
  categoryGlyph: { fontSize: 16, color: colors.sports },
  categoryLabel: { fontSize: 13, fontWeight: '800', color: colors.sports, letterSpacing: 0.5 },
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
