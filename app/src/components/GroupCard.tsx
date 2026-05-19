import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AvatarCircle } from './AvatarCircle';
import { AvatarStack } from './v2';
import { colors, gradientFor, radii } from './theme';

type GroupCategory = 'films' | 'games' | 'sports' | 'music' | 'mixed';

type GroupCardProps = {
  name: string;
  summary: string;
  memberCount: number;
  lastMessage?: string | null;
  timestamp?: string | null;
  hasUnread?: boolean;
  category?: GroupCategory;
  onPress?: () => void;
};

function resolveGradient(category: GroupCategory | undefined, name: string): [string, string] {
  if (category === 'films') return gradientFor('films');
  if (category === 'games') return gradientFor('gaming');
  if (category === 'sports') return gradientFor('sports');
  if (category === 'music') return gradientFor('music');
  if (category === 'mixed') return [colors.violet, colors.primary];
  const lower = name.toLowerCase();
  if (lower.includes('game') || lower.includes('fps')) return gradientFor('gaming');
  return gradientFor('films');
}

function badgeFor(category: GroupCategory | undefined) {
  if (category === 'films') return { label: 'Films', color: colors.films };
  if (category === 'games') return { label: 'Games', color: colors.gaming };
  if (category === 'sports') return { label: 'Sports', color: colors.sports };
  if (category === 'music') return { label: 'Music', color: colors.music };
  if (category === 'mixed') return { label: 'Mixed', color: colors.violet };
  return null;
}

export function GroupCard({
  name,
  summary,
  memberCount,
  lastMessage,
  timestamp,
  hasUnread = false,
  category,
  onPress,
}: GroupCardProps) {
  const badge = badgeFor(category);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}`}
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && styles.pressed]}
    >
      <LinearGradient colors={resolveGradient(category, name)} style={styles.accentBar} />
      <AvatarCircle username={name} size={52} />
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {badge ? (
            <View style={[styles.badge, { borderColor: badge.color }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          ) : null}
          {timestamp ? <Text style={styles.time}>{timestamp}</Text> : null}
        </View>
        <Text numberOfLines={2} style={styles.summary}>
          {summary}
        </Text>
        <View style={styles.metaRow}>
          <AvatarStack names={[name, 'Mira', 'Kai']} size={22} max={3} />
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
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    overflow: 'hidden',
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
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
    fontWeight: '700',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  badge: {
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
