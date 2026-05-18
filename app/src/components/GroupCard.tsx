import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AvatarCircle } from './AvatarCircle';
import { colors, radii } from './theme';

type GroupCardProps = {
  name: string;
  summary: string;
  memberCount: number;
  lastMessage?: string | null;
  timestamp?: string | null;
  hasUnread?: boolean;
  onPress?: () => void;
};

export function GroupCard({
  name,
  summary,
  memberCount,
  lastMessage,
  timestamp,
  hasUnread = false,
  onPress,
}: GroupCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <AvatarCircle username={name} size={48} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {timestamp ? <Text style={styles.time}>{timestamp}</Text> : null}
        </View>
        <Text numberOfLines={2} style={styles.summary}>
          {summary}
        </Text>
        <View style={styles.metaRow}>
          <Text numberOfLines={1} style={styles.preview}>
            {lastMessage || `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
          </Text>
          {hasUnread ? <View accessibilityLabel="Unread messages" style={styles.unreadDot} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  time: {
    color: colors.subdued,
    fontSize: 12,
    fontWeight: '600',
  },
  summary: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    flex: 1,
    color: colors.subdued,
    fontSize: 12,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
