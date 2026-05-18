import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { GroupCard } from '@/components/GroupCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors } from '@/components/theme';
import { getDemoGroups, isDemoSession } from '@/lib/demoAuth';
import { supabase } from '@/lib/supabase';

type GroupListItem = {
  id: string;
  name: string;
  summary: string;
  memberCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
};

type GroupMemberRow = {
  group_id: string;
  groups: {
    id: string;
    name: string;
    summary: string;
  } | null;
};

export default function GroupsScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      if (await isDemoSession()) {
        setUserId('demo');
        setGroups(await getDemoGroups());
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError && !isMissingSession(userError.message)) throw userError;

      if (!user) {
        setUserId(null);
        setGroups([]);
        return;
      }

      setUserId(user.id);

      const { data: memberships, error: memberError } = await supabase
        .from('group_members')
        .select('group_id, groups(id, name, summary)')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      const rows = (memberships ?? []) as unknown as GroupMemberRow[];
      const groupIds = rows.map((row) => row.group_id);

      if (groupIds.length === 0) {
        setGroups([]);
        return;
      }

      const [{ data: memberCounts, error: countError }, { data: messages, error: messageError }] =
        await Promise.all([
          supabase.from('group_members').select('group_id').in('group_id', groupIds),
          supabase
            .from('messages')
            .select('group_id, content, created_at')
            .in('group_id', groupIds)
            .order('created_at', { ascending: false }),
        ]);

      if (countError) throw countError;
      if (messageError) throw messageError;

      const counts = new Map<string, number>();
      for (const row of memberCounts ?? []) {
        counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
      }

      const latest = new Map<string, { content: string; created_at: string }>();
      for (const message of messages ?? []) {
        if (!latest.has(message.group_id)) {
          latest.set(message.group_id, message);
        }
      }

      setGroups(
        rows
          .filter((row) => row.groups)
          .map((row) => {
            const last = latest.get(row.group_id);
            return {
              id: row.group_id,
              name: row.groups?.name ?? 'Untitled group',
              summary: row.groups?.summary ?? 'A new film group is waiting for its first conversation.',
              memberCount: counts.get(row.group_id) ?? 1,
              lastMessage: last?.content ?? null,
              lastMessageAt: last?.created_at ?? null,
            };
          }),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load groups.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useFocusEffect(
    useCallback(() => {
      loadGroups(true);
    }, [loadGroups]),
  );

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`groups-home:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadGroups(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadGroups, userId]);

  return (
    <View style={styles.root}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadGroups(true)}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Play Store</Text>
          <Text style={styles.title}>Your groups</Text>
          <Text style={styles.subtitle}>Matches, open chats, and the next conversation starter.</Text>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.muted}>Loading groups...</Text>
          </View>
        ) : error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Could not load groups</Text>
            <Text style={styles.emptyText}>{error}</Text>
            <PrimaryButton label="Try again" onPress={() => loadGroups()} />
          </View>
        ) : !userId ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Set up your profile first</Text>
            <Text style={styles.emptyText}>
              Create a username and film profile so matching can connect you with the right people.
            </Text>
            <PrimaryButton label="Start onboarding" onPress={() => router.push('/onboarding/username')} />
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyText}>
              Search for a group vibe or let AI find a film circle for you.
            </Text>
            <PrimaryButton label="Discover groups" onPress={() => router.push('/discover')} />
          </View>
        ) : (
          <View style={styles.list}>
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                name={group.name}
                summary={group.summary}
                memberCount={group.memberCount}
                lastMessage={group.lastMessage}
                timestamp={formatTimestamp(group.lastMessageAt)}
                hasUnread={false}
                onPress={() => router.push(`/chat/${group.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {userId ? (
        <View style={styles.fabWrap} pointerEvents="box-none">
          <PrimaryButton
            label="Find a group"
            onPress={() => router.push('/discover')}
            style={styles.fab}
          />
        </View>
      ) : null}
    </View>
  );
}

function formatTimestamp(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function isMissingSession(message: string) {
  return message.toLowerCase().includes('session missing');
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 120,
    gap: 20,
  },
  header: {
    gap: 7,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  centered: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 48,
  },
  muted: {
    color: colors.muted,
  },
  empty: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 14,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  list: {
    gap: 12,
  },
  fabWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
  },
  fab: {
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
});
