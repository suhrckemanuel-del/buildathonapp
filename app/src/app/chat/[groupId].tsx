import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { MessageBubble } from '@/components/MessageBubble';
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
import type { Message } from '../../../../shared/types';

type MessageWithSender = Message & { sender_username?: string | null };

export default function ChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!groupId) return;

    let subscribed = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

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
    }

    bootstrap();

    return () => {
      subscribed = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [groupId, enrichMessage]);

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

  return (
    <>
      <Stack.Screen options={{ title: groupName || 'Chat', headerBackTitle: 'Back' }} />
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
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
        )}

        <View style={styles.safetyRow}>
          <Pressable
            style={styles.safetyButton}
            onPress={() => router.push(`/match/${groupId}` as never)}
            accessibilityRole="button"
          >
            <Text style={styles.safetyText}>Why</Text>
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
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            placeholderTextColor="#6b7280"
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
              <Text style={styles.sendButtonText}>↑</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function labelForAction(action: 'report' | 'mute' | 'block') {
  if (action === 'report') return 'Report';
  if (action === 'mute') return 'Mute';
  return 'Block';
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f0f0f' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  safetyRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111111',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  safetyButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyText: {
    color: '#d1d5db',
    fontSize: 12,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    backgroundColor: '#141414',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: '#1f2937',
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#f9fafb',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#374151' },
  sendButtonPressed: { opacity: 0.8 },
  sendButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '700', lineHeight: 20 },
});
