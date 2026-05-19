import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { AppHeader } from '@/components/v2';
import { colors, radii } from '@/components/theme';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import {
  createDemoMatchedGroup,
  demoGamingGroupOptions,
  demoGroupOptions,
  isDemoSession,
  joinDemoGroup,
} from '@/lib/demoAuth';
import type { GroupOption, MatchRequest } from '../../../../shared/types';

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ visible, message }: { visible: boolean; message: string }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1800),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

// ── GroupCard ────────────────────────────────────────────────────────────────

function GroupCard({
  option,
  onJoin,
}: {
  option: GroupOption;
  onJoin: (option: GroupOption) => void;
}) {
  const { group, member_count, shared_interests, preview_members } = option;

  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{group.name}</Text>
      <Text style={styles.cardSummary}>{group.summary}</Text>

      {shared_interests.length > 0 && (
        <View style={styles.tagRow}>
          {shared_interests.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>
          {member_count} {member_count === 1 ? 'member' : 'members'}
        </Text>
        {preview_members.length > 0 && (
          <Text style={styles.metaText}>
            {preview_members.map((m) => m.username).join(', ')}
          </Text>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [styles.joinBtn, pressed && styles.joinBtnPressed]}
        onPress={() => onJoin(option)}
        accessibilityRole="button"
        accessibilityLabel={`Join ${group.name}`}
      >
        <Text style={styles.joinBtnText}>Join</Text>
      </Pressable>
    </View>
  );
}

// ── Pending match banner ──────────────────────────────────────────────────────

function PendingBanner({ match }: { match: MatchRequest }) {
  const expiry = new Date(match.expires_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  return (
    <View style={styles.pendingBanner}>
      <Text style={styles.pendingTitle}>We are still assembling your group</Text>
      <Text style={styles.pendingBody}>
        Status: <Text style={styles.pendingStatus}>{match.status}</Text>
        {'  -  '}expires {expiry}
      </Text>
      <Text style={styles.pendingHelp}>
        For the strongest judge demo, add both Film and Gaming tastes. More signals make it easier to form a real small group.
      </Text>
      {match.prompt_text ? (
        <Text style={styles.pendingPrompt}>"{match.prompt_text}"</Text>
      ) : null}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const [userId, setUserId] = useState<string | null>(null);

  // Search state
  const [prompt, setPrompt] = useState('');
  const [searchResults, setSearchResults] = useState<GroupOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // AI match state
  const [pendingMatch, setPendingMatch] = useState<MatchRequest | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchConfirmed, setMatchConfirmed] = useState(false);

  // Toast
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    isDemoSession().then((demo) => {
      if (demo) {
        setUserId('demo');
        return;
      }

      supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      fetchPendingMatch(user.id);
      });
    });
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  async function fetchPendingMatch(uid: string) {
    const { data } = await supabase
      .from('match_requests')
      .select('*')
      .eq('user_id', uid)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setPendingMatch(data as MatchRequest);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  function showToast(msg: string) {
    setToastMessage(msg);
    setToastVisible(false);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    // Trigger re-render so the Toast useEffect fires again on re-mount
    setTimeout(() => {
      setToastVisible(true);
      toastTimer.current = setTimeout(() => setToastVisible(false), 2400);
    }, 0);
  }

  async function handleSearch() {
    if (!userId || !prompt.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      if (await isDemoSession()) {
        setSearchResults([...demoGroupOptions, ...demoGamingGroupOptions]);
        return;
      }

      const res = await api.searchGroups({ user_id: userId, prompt_text: prompt.trim() });
      setSearchResults(res.options.slice(0, 3));
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleAIMatch() {
    if (!userId || pendingMatch) return;
    setMatchLoading(true);
    setMatchError(null);
    try {
      if (await isDemoSession()) {
        const { groupId, category } = await createDemoMatchedGroup();
        setMatchConfirmed(true);
        router.push(`/match/searching?groupId=${groupId}&category=${category}` as never);
        return;
      }

      const res = await api.matchUsers({ user_id: userId });
      if (res.group_id) {
        router.replace(`/match/${res.group_id}` as never);
        return;
      }
      setMatchConfirmed(true);
      await fetchPendingMatch(userId);
    } catch (e: unknown) {
      setMatchError(e instanceof Error ? e.message : 'Match request failed');
    } finally {
      setMatchLoading(false);
    }
  }

  async function handleJoin(option: GroupOption) {
    try {
      if (await isDemoSession()) {
        const groupId = await joinDemoGroup(option);
        router.replace(`/match/${groupId}` as never);
        return;
      }

      // Direct group creation from the client is intentionally removed
      // (would let any user force arbitrary user_ids into a group). Use the
      // "Find my group" flow instead; the server side handles grouping.
      showToast('Tap "Find my group" to get matched');
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Could not join group');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      >
        <AppHeader
          eyebrow="AI matching"
          title="Find your group"
          subtitle="Your interest profiles power the match. We assemble a small chat with an opener, not another endless feed."
        />

        {/* ── AI match section (primary) ── */}
        {pendingMatch ? (
          <PendingBanner match={pendingMatch} />
        ) : matchConfirmed ? (
          <View style={styles.confirmedBanner}>
            <Text style={styles.confirmedText}>
              We saved your request. Add more interest profiles if you want the highest chance of an instant group.
            </Text>
          </View>
        ) : (
          <>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                styles.aiBtn,
                pressed && styles.btnPressed,
                matchLoading && styles.btnDisabled,
              ]}
              onPress={handleAIMatch}
              disabled={matchLoading}
              accessibilityRole="button"
              accessibilityLabel="Find my group"
            >
              {matchLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Find my group</Text>
              )}
            </Pressable>
            {matchError ? <Text style={styles.error}>{matchError}</Text> : null}
          </>
        )}

        <View style={styles.matchExplainer}>
          <Text style={styles.matchExplainerTitle}>How your match is built</Text>
          <Text style={styles.matchExplainerBody}>
            We read your saved interest profiles — films, gaming, sports, music — find five people whose tastes overlap with yours, and write the first opener so the chat starts on something specific.
          </Text>
        </View>

        {/* ── Search section (secondary) ── */}
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>Explore by vibe</Text>
        <Text style={styles.helperCopy}>
          Optional. Search a vibe to browse seeded groups. Real users join through AI matching above.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Describe the vibe you're looking for..."
          placeholderTextColor="#6b7280"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          accessibilityLabel="Group search input"
        />

        <Pressable
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && styles.btnPressed,
            (searchLoading || !prompt.trim()) && styles.btnDisabled,
          ]}
          onPress={handleSearch}
          disabled={searchLoading || !prompt.trim()}
          accessibilityRole="button"
          accessibilityLabel="Search groups"
        >
          {searchLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.secondaryBtnText}>Search</Text>
          )}
        </Pressable>

        {searchError ? <Text style={styles.error}>{searchError}</Text> : null}

        {searchResults.length > 0 && (
          <View style={styles.results}>
            {searchResults.map((opt) => (
              <GroupCard key={opt.group.id || opt.group.name} option={opt} onJoin={handleJoin} />
            ))}
          </View>
        )}
      </ScrollView>

      <Toast visible={toastVisible} message={toastMessage} />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 140,
    gap: 12,
  },

  // Labels
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  // Search input
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },
  helperCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: -6,
  },

  // Buttons
  primaryBtn: {
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  aiBtn: {
    backgroundColor: colors.brand,
    height: 60,
    marginTop: 4,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Error
  error: {
    color: colors.danger,
    fontSize: 13,
    marginTop: 4,
  },

  // Results
  results: {
    gap: 12,
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  cardSummary: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: colors.violet,
    fontWeight: '500',
  },
  cardMeta: {
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: colors.subdued,
  },
  joinBtn: {
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  joinBtnPressed: {
    opacity: 0.85,
  },
  joinBtnText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },

  // AI section
  aiHint: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  matchExplainer: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.brand + '66',
    backgroundColor: colors.brand + '18',
    padding: 16,
    gap: 6,
  },
  matchExplainerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  matchExplainerBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },

  // Pending banner
  pendingBanner: {
    backgroundColor: '#1a1a2e',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#3730a3',
    padding: 16,
    gap: 6,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#c7d2fe',
  },
  pendingBody: {
    fontSize: 13,
    color: '#9ca3af',
  },
  pendingHelp: {
    fontSize: 13,
    color: '#c7d2fe',
    lineHeight: 19,
  },
  pendingStatus: {
    color: '#ffffff',
    fontWeight: '600',
  },
  pendingPrompt: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
  },

  // Confirmed banner
  confirmedBanner: {
    backgroundColor: '#052e16',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#166534',
    padding: 16,
    alignItems: 'center',
  },
  confirmedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#86efac',
    textAlign: 'center',
  },

  // Toast
  toast: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: '#27272a',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
