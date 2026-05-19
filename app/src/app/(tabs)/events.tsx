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
import {
  AppHeader,
  ChallengeCard,
  EventCard as V2EventCard,
  FilterChip,
  HorizontalChips,
  V2Screen,
} from '@/components/v2';
import { CategoryKey, colors, radii } from '@/components/theme';
import {
  getDemoEventsWithMeta,
  isDemoSession,
  setDemoRSVP,
  type DemoEventWithMeta,
} from '@/lib/demoAuth';
import { supabase } from '@/lib/supabase';
import type { RSVPStatus } from '../../../../shared/types';

type EventRow = DemoEventWithMeta;
type Filter = 'all' | 'meetups' | 'challenges';

export default function EventsTab() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    if (await isDemoSession()) {
      setEvents(await getDemoEventsWithMeta());
      setLoading(false);
      return;
    }

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

  const showMeetups = filter === 'all' || filter === 'meetups';
  const showChallenges = filter === 'all' || filter === 'challenges';

  return (
    <V2Screen>
      <AppHeader
        eyebrow="Launchpad"
        title="Events"
        subtitle="Pick one tiny real-world plan and make the group chat useful."
      />
      <HorizontalChips>
        <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label="Meetups" active={filter === 'meetups'} onPress={() => setFilter('meetups')} />
        <FilterChip label="Challenges" active={filter === 'challenges'} onPress={() => setFilter('challenges')} />
      </HorizontalChips>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {showChallenges ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Challenges</Text>
                <Text style={styles.sectionSubtitle}>Pick one and bring the group along.</Text>
              </View>
              <ChallengeCard
                category="films"
                prompt="Watch a film in a language nobody in your group speaks"
                reward="$150 group reward"
                countdown="3 days left"
                socialProof="12 groups already tried it"
                cta="Join Challenge"
                onPress={() => router.push('/discover' as never)}
              />
              <View style={styles.challengeGrid}>
                <View style={styles.challengeCell}>
                  <ChallengeCard
                    category="gaming"
                    prompt="Beat something new together"
                    reward="$200"
                    countdown="5d"
                    cta="Join"
                    compact
                    onPress={() => router.push('/discover' as never)}
                  />
                </View>
                <View style={styles.challengeCell}>
                  <ChallengeCard
                    category="global"
                    prompt="Cook from a country none of you visited"
                    reward="$100"
                    countdown="7d"
                    cta="Join"
                    compact
                    onPress={() => router.push('/discover' as never)}
                  />
                </View>
              </View>
            </View>
          ) : null}

          <Pressable style={styles.partnerBanner} onPress={() => setFilter('meetups')}>
            <View style={styles.partnerMark}>
              <Text style={styles.partnerLogo}>Rotterdam</Text>
            </View>
            <View style={styles.partnerCopy}>
              <Text style={styles.partnerEyebrow}>Official city partner</Text>
              <Text style={styles.partnerTitle}>Featured parks, cinemas, and low-pressure city plans this week</Text>
            </View>
            <Text style={styles.partnerArrow}>→</Text>
          </Pressable>

          {showMeetups ? (
            <View style={[styles.section, styles.meetupsSection]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>All meetups</Text>
                <Text style={styles.sectionSubtitle}>Tiny plans your group is actually showing up to.</Text>
              </View>
              {events.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No events yet</Text>
                  <Text style={styles.emptyBody}>
                    Plan a movie night, Discord session, park walk, or playlist swap. Tap +.
                  </Text>
                </View>
              ) : (
                <View style={styles.meetupGrid}>
                  {events.map((event, index) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onRSVP={setRsvp}
                      full={index % 3 === 2}
                    />
                  ))}
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>
      )}

    </V2Screen>
  );
}

function EventCard({
  event,
  onRSVP,
  full,
}: {
  event: EventRow;
  onRSVP: (id: string, status: RSVPStatus) => void;
  full?: boolean;
}) {
  const date = new Date(event.event_at);
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const category = categoryForEvent(event);
  const active = event.rsvps.mine === 'going';

  return (
    <View style={[styles.meetupCell, full && styles.meetupCellFull]}>
      <V2EventCard
        category={category}
        title={event.title}
        detail={`${dateLabel} · ${timeLabel}`}
        place={`${event.group_name} · ${serviceHint(event)}`}
        going={event.rsvps.going ?? 0}
        active={active}
        full={full}
        onPress={() => onRSVP(event.id, active ? 'maybe' : 'going')}
      />
      <View style={styles.rsvpRow}>
        {(['going', 'maybe', 'not_going'] as RSVPStatus[]).map((status) => {
          const selected = event.rsvps.mine === status;
          const count = event.rsvps[status] ?? 0;
          return (
            <Pressable
              key={status}
              onPress={() => onRSVP(event.id, status)}
              style={[styles.rsvpButton, selected && styles.rsvpButtonActive]}
            >
              <Text style={[styles.rsvpLabel, selected && styles.rsvpLabelActive]}>
                {labelFor(status)} · {count}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function categoryForEvent(event: EventRow): CategoryKey {
  const haystack = `${event.title} ${event.description ?? ''} ${event.group_name}`.toLowerCase();
  if (/(ranked|fps|game|gaming|discord|valorant|rpg)/.test(haystack)) return 'gaming';
  if (/(playlist|music|spotify|concert)/.test(haystack)) return 'music';
  if (/(sport|park|pickup|run|football|soccer)/.test(haystack)) return 'sports';
  if (/(cook|country|language|global|travel)/.test(haystack)) return 'global';
  return 'films';
}

function serviceHint(event: EventRow) {
  const haystack = `${event.title} ${event.description ?? ''} ${event.group_name}`.toLowerCase();
  if (/ranked|fps|gaming|discord|valorant/.test(haystack)) return 'Discord';
  if (/playlist|music/.test(haystack)) return 'Spotify';
  if (/park|sport|pickup/.test(haystack)) return 'City park';
  if (/film|movie|watch|kubrick|chinatown/.test(haystack)) return 'Watch2Gether';
  return 'Group plan';
}

function labelFor(s: RSVPStatus) {
  if (s === 'going') return 'Going';
  if (s === 'maybe') return 'Maybe';
  return 'Pass';
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingBottom: 120, gap: 22 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { marginTop: 12, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  section: { gap: 16 },
  meetupsSection: { marginTop: 8 },
  sectionHeader: { gap: 6, paddingBottom: 4 },
  sectionLabel: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  challengeGrid: { flexDirection: 'row', gap: 14 },
  challengeCell: { flex: 1, minWidth: 0 },
  partnerBanner: {
    minHeight: 108,
    borderRadius: 22,
    backgroundColor: colors.rotterdam,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
  },
  partnerMark: { backgroundColor: colors.text, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  partnerLogo: { color: colors.rotterdam, fontSize: 13, fontWeight: '900' },
  partnerCopy: { flex: 1, gap: 4 },
  partnerEyebrow: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  partnerTitle: { color: colors.text, fontSize: 14, fontWeight: '800', lineHeight: 19 },
  partnerArrow: { color: colors.text, fontSize: 24, fontWeight: '900' },
  meetupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, rowGap: 18 },
  meetupCell: { width: '48%', gap: 12 },
  meetupCellFull: { width: '100%' },
  rsvpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rsvpButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpButtonActive: {
    borderColor: colors.violet,
    backgroundColor: colors.violet + '24',
  },
  rsvpLabel: { fontSize: 11, fontWeight: '800', color: colors.muted },
  rsvpLabelActive: { color: colors.text },
});
