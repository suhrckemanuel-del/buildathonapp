import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { MessageBubble } from '@/components/MessageBubble';
import { AvatarStack } from '@/components/v2';
import { colors, radii } from '@/components/theme';
import {
  DEMO_USER_ID,
  appendDemoMessage,
  getDemoGroups,
  getDemoMessages,
  isDemoSession,
  leaveDemoGroup,
  recordDemoSafetyAction,
} from '@/lib/demoAuth';
import { supabase } from '@/lib/supabase';
import type { Message, RSVPStatus } from '../../../../shared/types';

type MessageWithSender = Message & { sender_username?: string | null };

type ChatEvent = {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  event_at: string;
  created_by: string;
  rsvps: { going: number; maybe: number; not_going: number; mine: RSVPStatus | null };
};

export default function ChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<ChatEvent[]>([]);

  const flatListRef = useRef<FlatList<MessageWithSender>>(null);

  const fetchUsername = useCallback(async (userId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    return data?.username ?? null;
  }, []);

  const enrichMessage = useCallback(
    async (msg: Message): Promise<MessageWithSender> => {
      if (!msg.sender_id || msg.is_ai_opener) return msg;
      const username = await fetchUsername(msg.sender_id);
      return { ...msg, sender_username: username };
    },
    [fetchUsername],
  );

  const fetchEvents = useCallback(
    async (userId: string): Promise<ChatEvent[]> => {
      if (!groupId) return [];
      const { data, error } = await supabase
        .from('events')
        .select('id, group_id, title, description, event_at, created_by, event_rsvps(user_id, status)')
        .eq('group_id', groupId)
        .order('event_at', { ascending: true });
      if (error || !data) return [];
      return (data as any[]).map((e) => {
        const rsvps = e.event_rsvps ?? [];
        const counts = { going: 0, maybe: 0, not_going: 0 };
        let mine: RSVPStatus | null = null;
        for (const r of rsvps) {
          counts[r.status as RSVPStatus] = (counts[r.status as RSVPStatus] ?? 0) + 1;
          if (r.user_id === userId) mine = r.status as RSVPStatus;
        }
        return {
          id: e.id,
          group_id: e.group_id,
          title: e.title,
          description: e.description,
          event_at: e.event_at,
          created_by: e.created_by,
          rsvps: { ...counts, mine },
        };
      });
    },
    [groupId],
  );

  useEffect(() => {
    if (!groupId) return;

    let subscribed = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let eventsChannel: ReturnType<typeof supabase.channel> | null = null;

    async function bootstrap() {
      if (await isDemoSession()) {
        if (!subscribed) return;
        const groups = await getDemoGroups();
        setCurrentUserId(DEMO_USER_ID);
        setGroupName(groups.find((group) => group.id === groupId)?.name ?? 'Demo chat');
        setMessages(getDemoMessages(groupId));
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (subscribed) setCurrentUserId(user?.id ?? null);

      const { data: group } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .maybeSingle();
      if (subscribed && group) setGroupName(group.name);

      const { data: rows } = await supabase
        .from('messages')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (!subscribed || !rows) return;

      const enriched = await Promise.all(rows.map(enrichMessage));
      if (subscribed) {
        setMessages(enriched);
        setLoading(false);
      }

      channel = supabase
        .channel(`chat:${groupId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `group_id=eq.${groupId}`,
          },
          async (payload) => {
            if (!subscribed) return;
            const newMsg = payload.new as Message;
            const next = await enrichMessage(newMsg);
            if (subscribed) setMessages((prev) => [...prev, next]);
          },
        )
        .subscribe();

      const userId = user?.id ?? null;
      if (userId) {
        const initialEvents = await fetchEvents(userId);
        if (subscribed) setEvents(initialEvents);

        const refetch = async () => {
          if (!subscribed) return;
          const fresh = await fetchEvents(userId);
          if (subscribed) setEvents(fresh);
        };

        eventsChannel = supabase
          .channel(`chat-events:${groupId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'events', filter: `group_id=eq.${groupId}` },
            refetch,
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'event_rsvps' },
            refetch,
          )
          .subscribe();
      }
    }

    bootstrap();

    return () => {
      subscribed = false;
      if (channel) supabase.removeChannel(channel);
      if (eventsChannel) supabase.removeChannel(eventsChannel);
    };
  }, [groupId, enrichMessage, fetchEvents]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length]);

  async function sendMessage() {
    const content = inputText.trim();
    if (!content || !groupId || !currentUserId || sending) return;

    setSending(true);
    setInputText('');

    if (await isDemoSession()) {
      const message = await appendDemoMessage(groupId, content);
      setMessages((prev) => [...prev, { ...message, sender_username: 'demo_films' }]);
      setSending(false);
      return;
    }

    const { error } = await supabase.from('messages').insert({
      group_id: groupId,
      sender_id: currentUserId,
      content,
    });

    if (error) setInputText(content);
    setSending(false);
  }

  async function handleRSVP(eventId: string, status: RSVPStatus) {
    if (!currentUserId) return;
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        const counts = { ...e.rsvps };
        if (e.rsvps.mine) counts[e.rsvps.mine] = Math.max(0, counts[e.rsvps.mine] - 1);
        counts[status] = (counts[status] ?? 0) + 1;
        return { ...e, rsvps: { ...counts, mine: status } };
      }),
    );
    const { error } = await supabase
      .from('event_rsvps')
      .upsert(
        { event_id: eventId, user_id: currentUserId, status },
        { onConflict: 'event_id,user_id' },
      );
    if (error) Alert.alert('Could not RSVP', error.message);
  }

  async function handleLeaveGroup() {
    if (!groupId || !currentUserId) return;

    if (await isDemoSession()) {
      await leaveDemoGroup(groupId);
      router.replace('/(tabs)' as never);
      return;
    }

    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', currentUserId);

    if (error) {
      Alert.alert('Could not leave group', error.message);
      return;
    }

    router.replace('/(tabs)' as never);
  }

  async function handleSafetyAction(action: 'report' | 'mute' | 'block') {
    if (!groupId || !currentUserId) return;

    if (await isDemoSession()) {
      await recordDemoSafetyAction(groupId, action, 'Demo safety action');
      Alert.alert('Saved for demo', `${labelForAction(action)} is recorded as a placeholder.`);
      return;
    }

    const { error } = await supabase.from('safety_events').insert({
      actor_user_id: currentUserId,
      group_id: groupId,
      action,
      note: action === 'report' ? 'User submitted an in-app report.' : 'Placeholder safety preference.',
    });

    if (error) {
      Alert.alert('Could not save action', error.message);
      return;
    }

    Alert.alert('Saved', `${labelForAction(action)} has been recorded.`);
  }

  function renderItem({ item }: { item: MessageWithSender }) {
    return (
      <MessageBubble
        content={item.content}
        isMine={item.sender_id === currentUserId}
        senderName={item.sender_username}
        isAiOpener={item.is_ai_opener}
        timestamp={formatTime(item.created_at)}
      />
    );
  }

  const memberNames = [groupName || 'Matched group', 'Alex', 'Mira'];

  const opener = messages.find((m) => m.is_ai_opener);

  const listHeader = (
    <View style={styles.listHeader}>
      {opener ? (
        <View style={styles.icebreakerCard}>
          <View style={styles.icebreakerHead}>
            <View style={styles.botMark}>
              <Text style={styles.botMarkText}>AI</Text>
            </View>
            <View style={styles.icebreakerMeta}>
              <Text style={styles.icebreakerLabel}>AI ICEBREAKER</Text>
              <Text style={styles.icebreakerTitle}>First question for the group</Text>
            </View>
          </View>
          <Text style={styles.icebreakerText}>{opener.content}</Text>
        </View>
      ) : null}
      <View style={styles.eventsStrip}>
        <View style={styles.eventsHeader}>
          <View style={styles.eventsTitleBlock}>
            <Text style={styles.eventsTitle}>Plans</Text>
            <Text numberOfLines={1} style={styles.eventsSubtitle}>
              Turn the chat into a thing you actually do.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push(`/events/create?groupId=${groupId}` as never)}
            hitSlop={8}
            style={({ pressed }) => [styles.eventsAddButton, pressed && styles.pressed]}
          >
            <Text style={styles.eventsAdd}>+ Plan event</Text>
          </Pressable>
        </View>
        {events.length === 0 ? (
          <View style={styles.eventsEmptyBox}>
            <Text style={styles.eventsEmptyTitle}>No plans yet</Text>
            <Text style={styles.eventsEmpty}>
              Start with a movie night, park walk, Discord session, or playlist swap.
            </Text>
          </View>
        ) : (
          events.slice(0, 2).map((ev) => (
            <View key={ev.id} style={styles.eventCard}>
              <View style={styles.eventCardHeader}>
                <View style={styles.eventCardCopy}>
                  <Text style={styles.eventCardTitle} numberOfLines={1}>
                    {ev.title}
                  </Text>
                  <Text style={styles.eventCardDate}>{formatEventDate(ev.event_at)}</Text>
                </View>
                <AvatarStack names={memberNames} size={22} />
              </View>
              <View style={styles.rsvpRow}>
                {(['going', 'maybe', 'not_going'] as RSVPStatus[]).map((s) => {
                  const active = ev.rsvps.mine === s;
                  const count = ev.rsvps[s] ?? 0;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => handleRSVP(ev.id, s)}
                      style={[styles.rsvpPill, active && styles.rsvpPillActive]}
                    >
                      <Text style={[styles.rsvpPillText, active && styles.rsvpPillTextActive]}>
                        {rsvpLabel(s)} - {count}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: groupName || 'Chat',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitle: () => (
            <View style={styles.headerTitleWrap}>
              <Text numberOfLines={1} style={styles.headerTitleText}>
                {groupName || 'Chat'}
              </Text>
              <View style={styles.headerMetaRow}>
                <AvatarStack names={memberNames} size={18} max={3} />
                <Text numberOfLines={1} style={styles.headerMetaText}>
                  AI matched
                </Text>
              </View>
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color="#a78bfa" size="large" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages.filter((m) => !m.is_ai_opener)}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={listHeader}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={styles.bottomDock}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.safetyRow}
        >
          <Pressable
            style={styles.safetyButton}
            onPress={() => router.push(`/match/${groupId}` as never)}
            accessibilityRole="button"
          >
            <Text style={styles.safetyText}>Why this group</Text>
          </Pressable>
          <Pressable style={styles.safetyButton} onPress={handleLeaveGroup} accessibilityRole="button">
            <Text style={styles.safetyText}>Leave</Text>
          </Pressable>
          <Pressable
            style={styles.safetyButton}
            onPress={() => handleSafetyAction('report')}
            accessibilityRole="button"
          >
            <Text style={styles.safetyText}>Report</Text>
          </Pressable>
          <Pressable
            style={styles.safetyButton}
            onPress={() => handleSafetyAction('mute')}
            accessibilityRole="button"
          >
            <Text style={styles.safetyText}>Mute</Text>
          </Pressable>
          <Pressable
            style={styles.safetyButton}
            onPress={() => handleSafetyAction('block')}
            accessibilityRole="button"
          >
            <Text style={styles.safetyText}>Block</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message the group..."
            placeholderTextColor={colors.subdued}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={sendMessage}
          />
          <Pressable
            onPress={sendMessage}
            disabled={!inputText.trim() || sending}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
            accessibilityLabel="Send message"
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </Pressable>
        </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatEventDate(value: string) {
  const d = new Date(value);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${date} - ${time}`;
}

function rsvpLabel(s: RSVPStatus) {
  if (s === 'going') return 'Going';
  if (s === 'maybe') return 'Maybe';
  return 'Pass';
}

function labelForAction(action: 'report' | 'mute' | 'block') {
  if (action === 'report') return 'Report';
  if (action === 'mute') return 'Mute';
  return 'Block';
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: {
    maxWidth: 220,
    alignItems: 'center',
    gap: 2,
  },
  headerTitleText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  headerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    maxWidth: 180,
  },
  headerMetaText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 8 },
  listHeader: { gap: 10, paddingBottom: 12, marginHorizontal: -16 },
  bottomDock: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  safetyRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: 'center',
  },
  safetyButton: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    backgroundColor: colors.surface,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'center',
  },
  sendButton: {
    minWidth: 58,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  sendButtonDisabled: { backgroundColor: colors.border },
  sendButtonPressed: { opacity: 0.8 },
  sendButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '900', lineHeight: 18 },
  icebreakerCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    backgroundColor: '#1a0f05',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.brand,
    gap: 10,
  },
  icebreakerHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  botMark: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botMarkText: { color: '#0a0a0a', fontSize: 12, fontWeight: '900' },
  icebreakerMeta: { flex: 1, minWidth: 0 },
  icebreakerLabel: {
    color: colors.brandSoft,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  icebreakerTitle: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 2 },
  icebreakerText: { color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '500' },
  eventsStrip: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  eventsTitleBlock: { flex: 1, minWidth: 0, gap: 2 },
  eventsTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  eventsSubtitle: {
    color: colors.subdued,
    fontSize: 11,
    fontWeight: '700',
  },
  eventsAddButton: {
    flexShrink: 0,
    minHeight: 32,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.violet + '24',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsAdd: {
    color: colors.violet,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: { opacity: 0.82 },
  eventsEmptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  eventsEmptyTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  eventsEmpty: {
    color: colors.subdued,
    fontSize: 12,
    lineHeight: 17,
  },
  eventCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  eventCardCopy: { flex: 1, minWidth: 0, gap: 3 },
  eventCardTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  eventCardDate: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  rsvpRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  rsvpPill: {
    flex: 1,
    minWidth: 74,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  rsvpPillActive: {
    borderColor: colors.violet,
    backgroundColor: colors.violet + '24',
  },
  rsvpPillText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  rsvpPillTextActive: {
    color: colors.text,
  },
});
