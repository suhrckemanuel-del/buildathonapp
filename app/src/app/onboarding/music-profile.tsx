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
import { isDemoSession, proceedAfterProfileSave, saveDemoMusicProfile } from '@/lib/demoAuth';
import type { MusicProfile } from '../../../../shared/types';

export default function MusicProfileScreen() {
  const [artistsInput, setArtistsInput] = useState('');
  const [favouriteGenre, setFavouriteGenre] = useState('');
  const [lastConcert, setLastConcert] = useState('');
  const [comfortAlbum, setComfortAlbum] = useState('');
  const [saving, setSaving] = useState(false);

  const artists = artistsInput
    .split(',')
    .map((a) => a.trim())
    .filter((a) => a.length > 0);

  const allFilled =
    artists.length > 0 &&
    favouriteGenre.trim() &&
    lastConcert.trim() &&
    comfortAlbum.trim();

  const handleSubmit = async () => {
    if (!allFilled) {
      Alert.alert('All fields required', 'Please fill in every field before continuing.');
      return;
    }

    setSaving(true);
    try {
      const profile: MusicProfile = {
        top_artists: artists,
        favourite_genre: favouriteGenre.trim(),
        last_concert: lastConcert.trim(),
        comfort_album: comfortAlbum.trim(),
      };

      if (await isDemoSession()) {
        await saveDemoMusicProfile(profile);
        const nextRoute = await proceedAfterProfileSave('music');
        router.replace(nextRoute as never);
        return;
      }

      Alert.alert('Sign in required', 'Music profiles are saved through demo mode for now.');
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
        <Text style={styles.progress}>Music profile</Text>
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
          <Text style={styles.categoryGlyph}>{'♪'}</Text>
          <Text style={styles.categoryLabel}>Music</Text>
        </View>

        <Text style={styles.title}>Your music taste</Text>
        <Text style={styles.subtitle}>
          Artists in rotation, your genre, and that comfort album power the AI match for your small music group.
        </Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Artists in rotation</Text>
          <Text style={styles.helper}>Comma-separated. The three or four you've actually been listening to.</Text>
          <TextInput
            value={artistsInput}
            onChangeText={setArtistsInput}
            placeholder="e.g. Charli xcx, Frank Ocean, Mk.gee"
            placeholderTextColor={colors.subdued}
            multiline
            style={styles.textarea}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Favourite genre</Text>
          <FormTextInput
            value={favouriteGenre}
            onChangeText={setFavouriteGenre}
            placeholder="e.g. Hyperpop, indie folk, neo-soul"
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last concert you went to</Text>
          <FormTextInput
            value={lastConcert}
            onChangeText={setLastConcert}
            placeholder="e.g. Phoebe Bridgers, 2024"
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Comfort album</Text>
          <Text style={styles.helper}>The one you put on when nothing else hits.</Text>
          <TextInput
            value={comfortAlbum}
            onChangeText={setComfortAlbum}
            placeholder="e.g. Channel Orange"
            placeholderTextColor={colors.subdued}
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
  skip: { fontSize: 14, color: colors.music, fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  categoryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.music,
    backgroundColor: colors.music + '1a',
    borderRadius: radii.pill,
    marginTop: 12,
    marginBottom: 16,
  },
  categoryGlyph: { fontSize: 18, color: colors.music },
  categoryLabel: { fontSize: 13, fontWeight: '800', color: colors.music, letterSpacing: 0.5 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: 28, lineHeight: 22 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  helper: { fontSize: 12, color: colors.subdued, marginBottom: 8 },
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
