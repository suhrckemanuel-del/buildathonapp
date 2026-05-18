import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
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

  // Fetch sender username for a single message
  const fetchUsername = useCallback(async (userId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('users')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    return data?.username ?? null;
  }, []);

  // Enrich a raw message row with sender username
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

    async function bootstrap() {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (subscribed) setCurrentUserId(user?.id ?? null);

      // Fetch group name
      const { data: group } = await supabase
        .from('groups')
        .select('name')
        .eq('id', groupId)
        .maybeSingle();
      if (subscribed && group) setGroupName(group.name);

      // Load last 50 messages
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
    }

    bootstrap();

    // Realtime subscription for new messages
    const channel = supabase
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
          const enriched = await enrichMessage(newMsg);
          if (subscribed) {
            setMessages((prev) => [...prev, enriched]);
          }
        },
      )
      .subscribe();

    return () => {
      subscribed = false;
      supabase.removeChannel(channel);
    };
  }, [groupId, enrichMessage]);

  // Auto-scroll on new message
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

    const { error } = await supabase.from('messages').insert({
      group_id: groupId,
      sender_id: currentUserId,
      content,
    });

    if (error) {
      // Restore input on failure
      setInputText(content);
    }
    setSending(false);
  }

  function renderItem({ item }: { item: MessageWithSender }) {
    const isOwn = item.sender_id === currentUserId;
    const isAI = item.is_ai_opener;

    if (isAI) {
      return (
        <View style={styles.aiContainer}>
          <Text style={styles.aiLabel}>✦ Icebreaker</Text>
          <Text style={styles.aiText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.row, isOwn ? styles.rowRight : styles.rowLeft]}>
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          {!isOwn && item.sender_username ? (
            <Text style={styles.senderName}>{item.sender_username}</Text>
          ) : null}
          <Text style={[styles.messageText, isOwn ? styles.messageTextOwn : styles.messageTextOther]}>
            {item.content}
          </Text>
        </View>
      </View>
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

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message…"
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0f0f0f' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },

  // AI opener
  aiContainer: {
    alignSelf: 'center',
    maxWidth: '88%',
    backgroundColor: '#1e1440',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#7c3aed',
    padding: 14,
    marginVertical: 8,
    gap: 6,
  },
  aiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a78bfa',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  aiText: { fontSize: 15, color: '#e5e7eb', lineHeight: 22 },

  // Message rows
  row: { flexDirection: 'row' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },

  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 3 },
  bubbleOwn: { backgroundColor: '#7c3aed', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#1f2937', borderBottomLeftRadius: 4 },

  senderName: { fontSize: 12, fontWeight: '600', color: '#9ca3af', marginBottom: 2 },
  messageText: { fontSize: 15, lineHeight: 21 },
  messageTextOwn: { color: '#ffffff' },
  messageTextOther: { color: '#e5e7eb' },

  // Input bar
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
