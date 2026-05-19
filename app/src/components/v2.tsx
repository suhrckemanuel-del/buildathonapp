import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import {
  GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { AvatarCircle } from './AvatarCircle';
import { CategoryKey, categoryThemes, colors, gradientFor, radii } from './theme';

type HeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

export function AppHeader({ eyebrow, title, subtitle, right }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export function V2Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function GradientCard({
  category = 'global',
  children,
  style,
  onPress,
}: {
  category?: CategoryKey | 'games';
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: (event: GestureResponderEvent) => void;
}) {
  const content = (
    <LinearGradient colors={gradientFor(category)} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradient, style]}>
      <View style={styles.orb} />
      {children}
    </LinearGradient>
  );

  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

export function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.filterChip, active && styles.filterChipActive, pressed && styles.pressed]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function AvatarStack({
  names,
  size = 28,
  max = 4,
}: {
  names: Array<string | null | undefined>;
  size?: number;
  max?: number;
}) {
  const visible = names.slice(0, max);
  return (
    <View style={styles.avatarStack}>
      {visible.map((name, index) => (
        <View
          key={`${name ?? 'avatar'}-${index}`}
          style={[
            styles.avatarStackItem,
            { marginLeft: index === 0 ? 0 : -Math.round(size * 0.32), borderRadius: size / 2 },
          ]}
        >
          <AvatarCircle username={name} size={size} />
        </View>
      ))}
    </View>
  );
}

export function ChallengeCard({
  category,
  prompt,
  reward,
  countdown,
  socialProof,
  cta,
  onPress,
  compact = false,
}: {
  category: CategoryKey;
  prompt: string;
  reward: string;
  countdown: string;
  socialProof?: string;
  cta: string;
  onPress?: () => void;
  compact?: boolean;
}) {
  const theme = categoryThemes[category];
  return (
    <GradientCard category={category} style={[styles.challenge, compact && styles.challengeCompact]}>
      <View style={styles.cardTopRow}>
        <Text style={styles.categoryPill}>{theme.icon} {theme.label}</Text>
        <Text style={styles.countdown}>{countdown}</Text>
      </View>
      <View style={styles.cardBottom}>
        <Text style={[styles.challengePrompt, compact && styles.challengePromptCompact]}>{prompt}</Text>
        <View style={styles.actionRow}>
          <View>
            <Text style={styles.reward}>{reward}</Text>
            {socialProof ? <Text style={styles.socialProof}>{socialProof}</Text> : null}
          </View>
          <Pressable onPress={onPress} style={styles.glassButton}>
            <Text style={styles.glassButtonText}>{cta}</Text>
          </Pressable>
        </View>
      </View>
    </GradientCard>
  );
}

export function EventCard({
  category,
  title,
  detail,
  place,
  going,
  active,
  onPress,
  full = false,
}: {
  category: CategoryKey;
  title: string;
  detail: string;
  place?: string;
  going: number;
  active?: boolean;
  onPress?: () => void;
  full?: boolean;
}) {
  const theme = categoryThemes[category];
  return (
    <GradientCard category={category} style={[styles.eventCard, full && styles.eventCardFull]}>
      <View style={styles.cardTopRow}>
        <Text style={styles.eventIcon}>{theme.icon}</Text>
        <Text style={styles.countdown}>{going} going</Text>
      </View>
      <View style={styles.cardBottom}>
        <Text numberOfLines={2} style={styles.eventTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.eventDetail}>{detail}</Text>
        {place ? <Text numberOfLines={1} style={styles.eventDetail}>{place}</Text> : null}
        <View style={styles.actionRow}>
          <AvatarStack names={['Alex', 'Mira', 'Sam']} size={20} />
          <Pressable onPress={onPress} style={[styles.glassButton, active && styles.goingButton]}>
            <Text style={[styles.glassButtonText, active && styles.goingButtonText]}>{active ? 'Going' : 'RSVP'}</Text>
          </Pressable>
        </View>
      </View>
    </GradientCard>
  );
}

export function HorizontalChips({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      style={styles.chipScrollOuter}
      contentContainerStyle={styles.chipScroll}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  headerCopy: { flex: 1, gap: 6 },
  eyebrow: { color: colors.brand, fontSize: 11, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  headerTitle: { color: colors.text, fontSize: 30, fontWeight: '900', lineHeight: 34 },
  headerSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  headerRight: { paddingTop: 2 },
  gradient: {
    borderRadius: radii.xl,
    padding: 18,
    overflow: 'hidden',
    minHeight: 150,
  },
  orb: {
    position: 'absolute',
    right: -46,
    top: -44,
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  pressed: { opacity: 0.88 },
  filterChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.violet, borderColor: colors.violet },
  filterChipText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  filterChipTextActive: { color: colors.text },
  chipScrollOuter: { flexGrow: 0, flexShrink: 0 },
  chipScroll: { gap: 8, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16, alignItems: 'center' },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  avatarStackItem: { borderWidth: 2, borderColor: 'rgba(10,10,15,0.64)' },
  challenge: { minHeight: 220, justifyContent: 'space-between' },
  challengeCompact: { minHeight: 178 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  categoryPill: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    backgroundColor: colors.surfaceGlass,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  countdown: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '800' },
  cardBottom: { gap: 12 },
  challengePrompt: { color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '900' },
  challengePromptCompact: { fontSize: 17, lineHeight: 22 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reward: { color: colors.text, fontSize: 15, fontWeight: '900' },
  socialProof: { color: 'rgba(255,255,255,0.74)', fontSize: 12, fontWeight: '700', marginTop: 2 },
  glassButton: {
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceGlass,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 78,
    alignItems: 'center',
  },
  glassButtonText: { color: colors.text, fontSize: 12, fontWeight: '900' },
  goingButton: { backgroundColor: 'rgba(255,255,255,0.90)' },
  goingButtonText: { color: colors.background },
  eventCard: { minHeight: 174, justifyContent: 'space-between', flex: 1 },
  eventCardFull: { minHeight: 142 },
  eventIcon: { color: colors.text, fontSize: 25, fontWeight: '900' },
  eventTitle: { color: colors.text, fontSize: 18, lineHeight: 22, fontWeight: '900' },
  eventDetail: { color: 'rgba(255,255,255,0.76)', fontSize: 12, fontWeight: '700' },
});
