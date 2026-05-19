import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AvatarCircle } from '@/components/AvatarCircle';
import { InterestTag } from '@/components/InterestTag';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AppHeader } from '@/components/v2';
import { colors, radii } from '@/components/theme';
import {
  clearDemoSession,
  getDemoFilmProfile,
  getDemoGamingProfile,
  getDemoUsername,
  isDemoSession,
} from '@/lib/demoAuth';
import { supabase } from '@/lib/supabase';
import type { FilmProfile, GamingProfile } from '../../../../shared/types';

type ProfileState = {
  username: string | null;
  filmProfile: FilmProfile | null;
  gamingProfile: GamingProfile | null;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileState>({
    username: null,
    filmProfile: null,
    gamingProfile: null,
  });
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);

    if (await isDemoSession()) {
      const [username, filmProfile, gamingProfile] = await Promise.all([
        getDemoUsername(),
        getDemoFilmProfile(),
        getDemoGamingProfile(),
      ]);
      setProfile({ username, filmProfile, gamingProfile });
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile({ username: null, filmProfile: null, gamingProfile: null });
      setLoading(false);
      return;
    }

    const [{ data: userRow }, { data: filmRow }, { data: gamingRow }] = await Promise.all([
      supabase.from('users').select('username').eq('id', user.id).maybeSingle(),
      supabase
        .from('interest_profiles')
        .select('data')
        .eq('user_id', user.id)
        .eq('category', 'films')
        .maybeSingle(),
      supabase
        .from('interest_profiles')
        .select('data')
        .eq('user_id', user.id)
        .eq('category', 'games')
        .maybeSingle(),
    ]);

    setProfile({
      username: userRow?.username ?? user.email ?? 'You',
      filmProfile: (filmRow?.data as FilmProfile | null) ?? null,
      gamingProfile: (gamingRow?.data as GamingProfile | null) ?? null,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  async function handleSignOut() {
    setSigningOut(true);
    await clearDemoSession();
    await supabase.auth.signOut();
    setSigningOut(false);
    router.replace('/');
  }

  const hasAny = !!(profile.filmProfile || profile.gamingProfile);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <AppHeader
        eyebrow="Taste profile"
        title="Profile"
        subtitle="The signals that help groups form around something you can actually do together."
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>Loading profile...</Text>
        </View>
      ) : !profile.username ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No signed-in profile</Text>
          <Text style={styles.body}>
            Sign in or use demo mode to create a profile and test the matching flow.
          </Text>
          <PrimaryButton label="Start onboarding" onPress={() => router.push('/onboarding/username')} />
        </View>
      ) : (
        <>
          <View style={styles.profileCard}>
            <AvatarCircle username={profile.username} size={64} />
            <View style={styles.profileCopy}>
              <Text style={styles.username}>{profile.username}</Text>
              <Text style={styles.body}>
                {hasAny
                  ? [profile.filmProfile && 'Films', profile.gamingProfile && 'Gaming']
                      .filter(Boolean)
                      .join(' · ')
                  : 'No interest profile yet'}
              </Text>
            </View>
          </View>

          {profile.filmProfile ? (
            <View style={[styles.card, styles.filmCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Film taste</Text>
                <View style={[styles.pill, { borderColor: colors.films, backgroundColor: colors.films + '1a' }]}>
                  <Text style={[styles.pillText, { color: colors.films }]}>Films</Text>
                </View>
              </View>
              <View style={styles.tagRow}>
                {profile.filmProfile.top_films.map((film) => (
                  <InterestTag key={film} label={film} />
                ))}
              </View>
              <View style={styles.detailGrid}>
                <ProfileLine label="Actor" value={profile.filmProfile.favourite_actor} />
                <ProfileLine label="Director" value={profile.filmProfile.favourite_director} />
                <ProfileLine label="Not your thing" value={profile.filmProfile.disliked_film} />
              </View>
            </View>
          ) : null}

          {profile.gamingProfile ? (
            <View style={[styles.card, styles.gamingCard]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Gaming taste</Text>
                <View style={[styles.pill, { borderColor: colors.gaming, backgroundColor: colors.gaming + '1a' }]}>
                  <Text style={[styles.pillText, { color: colors.gaming }]}>Gaming</Text>
                </View>
              </View>
              <View style={styles.tagRow}>
                {profile.gamingProfile.top_games.map((game) => (
                  <InterestTag key={game} label={game} />
                ))}
              </View>
              <View style={styles.tagRow}>
                {(profile.gamingProfile.genres ?? []).map((g) => (
                  <InterestTag key={g} label={g} />
                ))}
              </View>
              <View style={styles.detailGrid}>
                <ProfileLine label="Recently played" value={profile.gamingProfile.recently_played} />
                <ProfileLine label="Shame game" value={profile.gamingProfile.shame_game} />
              </View>
            </View>
          ) : null}

          {!hasAny ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>No interest profile yet</Text>
              <Text style={styles.body}>
                Pick a category and tell us your taste so we can match you.
              </Text>
              <PrimaryButton
                label="Add an interest profile"
                onPress={() => router.push('/onboarding/select-category')}
              />
            </View>
          ) : null}

          <PrimaryButton
            label="Add another category"
            onPress={() => router.push('/onboarding/select-category')}
          />
          <PrimaryButton
            label="Start over"
            onPress={async () => {
              await clearDemoSession();
              router.replace('/');
            }}
            variant="subtle"
          />
          <PrimaryButton
            label="Sign out"
            onPress={handleSignOut}
            loading={signingOut}
            style={styles.secondaryButton}
          />
        </>
      )}
    </ScrollView>
  );
}

function ProfileLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 48, gap: 16 },
  centered: { alignItems: 'center', gap: 12, paddingVertical: 48 },
  muted: { color: colors.muted },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  profileCopy: { flex: 1, minWidth: 0 },
  username: { color: colors.text, fontSize: 20, fontWeight: '800' },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  filmCard: { borderColor: colors.films + '77', backgroundColor: '#241115' },
  gamingCard: { borderColor: colors.gaming + '77', backgroundColor: '#0f1d3d' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  body: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailGrid: { gap: 10 },
  line: { gap: 3 },
  lineLabel: {
    color: colors.subdued,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  lineValue: { color: colors.text, fontSize: 15, fontWeight: '600' },
  secondaryButton: { backgroundColor: colors.surfaceRaised },
});
