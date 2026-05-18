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
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';
import type { GroupOption, MatchRequest } from '../../../shared/types';

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
  onJoin: () => void;
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
        onPress={onJoin}
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
      <Text style={styles.pendingTitle}>Match in progress</Text>
      <Text style={styles.pendingBody}>
        Status: <Text style={styles.pendingStatus}>{match.status}</Text>
        {'  ·  '}expires {expiry}
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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      fetchPendingMatch(user.id);
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
      await api.matchUsers({ user_id: userId });
      setMatchConfirmed(true);
      await fetchPendingMatch(userId);
    } catch (e: unknown) {
      setMatchError(e instanceof Error ? e.message : 'Match request failed');
    } finally {
      setMatchLoading(false);
    }
  }

  function handleJoin() {
    showToast('Coming soon');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Search section ── */}
        <Text style={styles.sectionLabel}>Find a group</Text>

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
            styles.primaryBtn,
            pressed && styles.btnPressed,
            (searchLoading || !prompt.trim()) && styles.btnDisabled,
          ]}
          onPress={handleSearch}
          disabled={searchLoading || !prompt.trim()}
          accessibilityRole="button"
          accessibilityLabel="Search groups"
        >
          {searchLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Search</Text>
          )}
        </Pressable>

        {searchError ? <Text style={styles.error}>{searchError}</Text> : null}

        {searchResults.length > 0 && (
          <View style={styles.results}>
            {searchResults.map((opt) => (
              <GroupCard key={opt.group.id} option={opt} onJoin={handleJoin} />
            ))}
          </View>
        )}

        {/* ── AI match section ── */}
        <View style={styles.divider} />
        <Text style={styles.sectionLabel}>AI matching</Text>

        {pendingMatch ? (
          <PendingBanner match={pendingMatch} />
        ) : matchConfirmed ? (
          <View style={styles.confirmedBanner}>
            <Text style={styles.confirmedText}>
              We'll find your group within 3 days
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.aiHint}>
              Let our AI analyse your taste profile and match you with the best group.
            </Text>
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
              accessibilityLabel="Let AI find my group"
            >
              {matchLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Let AI find my group</Text>
              )}
            </Pressable>
            {matchError ? <Text style={styles.error}>{matchError}</Text> : null}
          </>
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
    backgroundColor: '#0f0f0f',
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 12,
  },

  // Labels
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  // Search input
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#ffffff',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
  },

  // Buttons
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBtn: {
    backgroundColor: '#7c3aed',
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
    color: '#f87171',
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
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    padding: 16,
    gap: 10,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardSummary: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#27272a',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '500',
  },
  cardMeta: {
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  joinBtn: {
    height: 40,
    borderRadius: 10,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  joinBtnPressed: {
    opacity: 0.85,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#1f1f1f',
    marginVertical: 8,
  },

  // AI section
  aiHint: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },

  // Pending banner
  pendingBanner: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#3730a3',
    padding: 16,
    gap: 6,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#a5b4fc',
  },
  pendingBody: {
    fontSize: 13,
    color: '#9ca3af',
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
