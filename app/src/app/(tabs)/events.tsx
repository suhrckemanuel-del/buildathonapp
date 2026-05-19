import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { colors, radii } from '@/components/theme';
import {
  getDemoEventsWithMeta,
  isDemoSession,
  setDemoRSVP,
  type DemoEventWithMeta,
} from '@/lib/demoAuth';
import { supabase } from '@/lib/supabase';
import type { RSVPStatus } from '../../../../shared/types';

type EventRow = DemoEventWithMeta;

export default function EventsTab() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (await isDemoSession()) {
      setEvents(await getDemoEventsWithMeta());
      setLoading(false);
      return;
    }

    // Real Supabase path
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('events')
      .select(
        `id, group_id, created_by, title, description, event_at, created_at,
         groups!inner(name),
         event_rsvps(user_id, status)`,
      )
      .order('event_at', { ascending: true });

    if (error) {
      setEvents([]);
      setLoading(false);
      return;
    }

    const rows: EventRow[] = (data ?? []).map((e: any) => {
      const rsvps = e.event_rsvps ?? [];
      const counts = { going: 0, maybe: 0, not_going: 0 };
      let mine: RSVPStatus | null = null;
      for (const r of rsvps) {
        counts[r.status as RSVPStatus] = (counts[r.status as RSVPStatus] ?? 0) + 1;
        if (r.user_id === user.id) mine = r.status as RSVPStatus;
      }
      return {
        id: e.id,
        group_id: e.group_id,
        group_name: e.groups?.name ?? 'Group',
        title: e.title,
        description: e.description,
        event_at: e.event_at,
        created_by: e.created_by,
        rsvps: { ...counts, mine },
      };
    });

    setEvents(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const setRsvp = async (eventId: string, status: RSVPStatus) => {
    if (await isDemoSession()) {
      await setDemoRSVP(eventId, status);
      setEvents(await getDemoEventsWithMeta());
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('event_rsvps')
      .upsert({ event_id: eventId, user_id: user.id, status }, { onConflict: 'event_id,user_id' });
    load();
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Events</Text>
        <Text style={styles.subtitle}>Plans your groups have made.</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {events.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No events yet</Text>
              <Text style={styles.emptyBody}>Plan a movie night or ranked session — tap +.</Text>
            </View>
          ) : (
            events.map((e) => <EventCard key={e.id} event={e} onRSVP={setRsvp} />)
          )}
        </ScrollView>
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/events/create' as never)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

function EventCard({
  event,
  onRSVP,
}: {
  event: EventRow;
  onRSVP: (id: string, status: RSVPStatus) => void;
}) {
  const date = new Date(event.event_at);
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.eventGroup}>{event.group_name}</Text>
        <Text style={styles.eventDate}>
          {dateLabel} · {timeLabel}
        </Text>
      </View>
      <Text style={styles.eventTitle}>{event.title}</Text>
      {event.description ? <Text style={styles.eventDescription}>{event.description}</Text> : null}

      <View style={styles.rsvpRow}>
        {(['going', 'maybe', 'not_going'] as RSVPStatus[]).map((status) => {
          const active = event.rsvps.mine === status;
          const count = event.rsvps[status] ?? 0;
          return (
            <Pressable
              key={status}
              onPress={() => onRSVP(event.id, status)}
              style={[styles.rsvpButton, active && styles.rsvpButtonActive]}
            >
              <Text style={[styles.rsvpLabel, active && styles.rsvpLabelActive]}>
                {labelFor(status)} · {count}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function labelFor(s: RSVPStatus) {
  if (s === 'going') return 'Going';
  if (s === 'maybe') return 'Maybe';
  return 'Pass';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 120 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { marginTop: 80, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  emptyBody: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: 20,
    marginBottom: 14,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  eventGroup: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 0.5 },
  eventDate: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  eventTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  eventDescription: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 14 },
  rsvpRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  rsvpButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  rsvpButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  rsvpLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  rsvpLabelActive: { color: colors.text },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 88,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: colors.text, fontSize: 28, fontWeight: '800', lineHeight: 30 },
});
