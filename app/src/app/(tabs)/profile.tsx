import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AvatarCircle } from '@/components/AvatarCircle';
import { InterestTag } from '@/components/InterestTag';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/components/theme';
import {
  clearDemoSession,
  getDemoFilmProfile,
  getDemoUsername,
  isDemoSession,
} from '@/lib/demoAuth';
import { supabase } from '@/lib/supabase';
import type { FilmProfile } from '../../../../shared/types';

type ProfileState = {
  username: string | null;
  filmProfile: FilmProfile | null;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<ProfileState>({ username: null, filmProfile: null });
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);

    if (await isDemoSession()) {
      setProfile({
        username: await getDemoUsername(),
        filmProfile: await getDemoFilmProfile(),
      });
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfile({ username: null, filmProfile: null });
      setLoading(false);
      return;
    }

    const [{ data: userRow }, { data: interestRow }] = await Promise.all([
      supabase.from('users').select('username').eq('id', user.id).maybeSingle(),
      supabase
        .from('interest_profiles')
        .select('data')
        .eq('user_id', user.id)
        .eq('category', 'films')
        .maybeSingle(),
    ]);

    setProfile({
      username: userRow?.username ?? user.email ?? 'Film fan',
      filmProfile: (interestRow?.data as FilmProfile | null) ?? null,
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

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

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
              <Text style={styles.body}>Film matching profile</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Film taste</Text>
            {profile.filmProfile ? (
              <>
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
              </>
            ) : (
              <>
                <Text style={styles.body}>Add your top films so AI matching has something to work with.</Text>
                <PrimaryButton label="Add film profile" onPress={() => router.push('/onboarding/film-profile')} />
              </>
            )}
          </View>

          <PrimaryButton label="Edit film profile" onPress={() => router.push('/onboarding/film-profile')} />
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
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 48,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  centered: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  muted: {
    color: colors.muted,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  username: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 14,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailGrid: {
    gap: 10,
  },
  line: {
    gap: 3,
  },
  lineLabel: {
    color: colors.subdued,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  lineValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#2a2a2a',
  },
});
