import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { FormTextInput } from '@/components/FormTextInput';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radii } from '@/components/theme';
import {
  addDemoEvent,
  getDemoGroups,
  isDemoSession,
} from '@/lib/demoAuth';
import { supabase } from '@/lib/supabase';

type GroupChoice = { id: string; name: string };

export default function CreateEventScreen() {
  const { groupId: prefilledGroupId } = useLocalSearchParams<{ groupId?: string }>();
  const [groups, setGroups] = useState<GroupChoice[]>([]);
  const [groupId, setGroupId] = useState<string | null>(prefilledGroupId ?? null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [whenText, setWhenText] = useState(defaultWhen());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (await isDemoSession()) {
        const dg = await getDemoGroups();
        setGroups(dg.map((g) => ({ id: g.id, name: g.name })));
        if (dg.length) setGroupId((curr) => curr ?? dg[0].id);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('group_members')
        .select('group_id, groups!inner(id, name)')
        .eq('user_id', user.id);
      const rows: GroupChoice[] = (data ?? []).map((r: any) => ({
        id: r.groups.id,
        name: r.groups.name,
      }));
      setGroups(rows);
      if (rows[0]) setGroupId((curr) => curr ?? rows[0].id);
    })();
  }, []);

  const handleSubmit = async () => {
    if (!groupId) {
      Alert.alert('Pick a group', 'You need a group to plan an event with.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Add a title', 'Give your event a name.');
      return;
    }
    const eventAt = new Date(whenText);
    if (Number.isNaN(eventAt.getTime())) {
      Alert.alert('Invalid date', 'Use a format like 2026-05-25 20:00.');
      return;
    }

    setSaving(true);
    try {
      if (await isDemoSession()) {
        await addDemoEvent({
          group_id: groupId,
          title: title.trim(),
          description: description.trim() || null,
          event_at: eventAt.toISOString(),
        });
        if (prefilledGroupId) {
          router.replace(`/chat/${prefilledGroupId}` as never);
        } else {
          router.replace('/(tabs)/events' as never);
        }
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const { error } = await supabase.from('events').insert({
        group_id: groupId,
        created_by: user.id,
        title: title.trim(),
        description: description.trim() || null,
        event_at: eventAt.toISOString(),
      });
      if (error) throw error;
      if (prefilledGroupId) {
        router.replace(`/chat/${prefilledGroupId}` as never);
      } else {
        router.replace('/(tabs)/events' as never);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      Alert.alert('Could not create event', message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>New event</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Group</Text>
        <View style={styles.groupChips}>
          {groups.length === 0 ? (
            <Text style={styles.helper}>You're not in any groups yet.</Text>
          ) : (
            groups.map((g) => {
              const active = g.id === groupId;
              return (
                <Pressable
                  key={g.id}
                  onPress={() => setGroupId(g.id)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.name}</Text>
                </Pressable>
              );
            })
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title</Text>
          <FormTextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Chinatown rewatch"
            returnKeyType="next"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (optional)</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Any details?"
            placeholderTextColor={colors.subdued}
            multiline
            style={styles.textarea}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>When</Text>
          <FormTextInput
            value={whenText}
            onChangeText={setWhenText}
            placeholder="2026-05-25 20:00"
            returnKeyType="done"
          />
          <Text style={styles.helper}>Format: YYYY-MM-DD HH:mm (local time).</Text>
        </View>

        <PrimaryButton
          label="Create event"
          onPress={handleSubmit}
          disabled={saving}
          loading={saving}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function defaultWhen() {
  const d = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 20:00`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { color: colors.primary, fontWeight: '800', fontSize: 15, width: 50 },
  headerTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 6, marginTop: 16 },
  helper: { fontSize: 12, color: colors.subdued, marginTop: 6 },
  inputGroup: { marginBottom: 4 },
  groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  chipText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: colors.text },
  textarea: {
    minHeight: 80,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
});
