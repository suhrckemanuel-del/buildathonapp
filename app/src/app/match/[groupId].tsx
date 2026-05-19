import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { AvatarCircle } from '@/components/AvatarCircle';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AppHeader, AvatarStack } from '@/components/v2';
import { colors, radii } from '@/components/theme';
import { getDemoMatchExplanation, isDemoSession } from '@/lib/demoAuth';
import type { MatchExplanation, MatchSignal } from '../../../../shared/types';

export default function MatchExplanationScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const pulse = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;
  const [explanation, setExplanation] = useState<MatchExplanation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!groupId) return;

      if (await isDemoSession()) {
        const demoExplanation = await getDemoMatchExplanation(groupId);
        if (mounted) {
          setExplanation(demoExplanation);
          setLoading(false);
        }
        return;
      }

      if (mounted) setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [groupId]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(scan, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse, scan]);

  const centerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const centerOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const scanTranslate = scan.interpolate({ inputRange: [0, 1], outputRange: [-80, 280] });
  const members = useMemo(() => explanation?.matched_members.slice(0, 6) ?? [], [explanation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!explanation || !groupId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.title}>Match explanation unavailable</Text>
        <Text style={styles.body}>
          This route is ready for backend match traces. Demo mode already provides local examples.
        </Text>
        <PrimaryButton label="Back to Match" onPress={() => router.replace('/(tabs)/discover' as never)} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Why this match', headerBackTitle: 'Back' }} />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <AppHeader
          eyebrow="Group assembled"
          title="Match found"
          subtitle={explanation.summary}
        />

        <View style={styles.heroCluster}>
          <AvatarStack names={members.map((member) => member.username)} size={66} max={5} />
          <Text style={styles.heroTitle}>{explanation.group_name}</Text>
          <Text style={styles.body}>Your chat is ready. Start with the generated opener, then turn it into a plan.</Text>
        </View>

        <View style={styles.motionPanel}>
          <Animated.View style={[styles.scanLine, { transform: [{ translateX: scanTranslate }] }]} />
          <View style={styles.memberRail}>
            {members.map((member, index) => (
              <Animated.View
                key={member.id}
                style={[
                  styles.memberNode,
                  {
                    opacity: centerOpacity,
                    transform: [{ scale: index === 0 ? centerScale : 1 }],
                  },
                ]}
              >
                <AvatarCircle username={member.username} size={44} />
                <Text numberOfLines={1} style={styles.memberName}>
                  {member.username}
                </Text>
              </Animated.View>
            ))}
          </View>
          <View style={styles.signalRail}>
            {explanation.signals.map((signal, index) => (
              <SignalPill key={`${signal.label}-${index}`} signal={signal} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How the AI matched this group</Text>
          <Text style={styles.body}>{explanation.ai_reasoning}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signals used</Text>
          {explanation.signals.map((signal, index) => (
            <View key={`${signal.label}-detail-${index}`} style={styles.signalRow}>
              <View style={[styles.strengthDot, strengthStyle(signal.strength)]} />
              <View style={styles.signalCopy}>
                <Text style={styles.signalLabel}>{signal.label}</Text>
                <Text style={styles.signalDetail}>{signal.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.openerBox}>
          <Text style={styles.sectionTitle}>Generated opener</Text>
          <Text style={styles.openerText}>{explanation.opener_message}</Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Continue to chat" onPress={() => router.replace(`/chat/${groupId}`)} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace('/(tabs)/discover' as never)}
            style={styles.secondaryAction}
          >
            <Text style={styles.secondaryText}>Back to Match</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

function SignalPill({ signal }: { signal: MatchSignal }) {
  return (
    <View style={styles.signalPill}>
      <View style={[styles.strengthDot, strengthStyle(signal.strength)]} />
      <Text numberOfLines={1} style={styles.signalPillText}>
        {signal.label}
      </Text>
    </View>
  );
}

function strengthStyle(strength: MatchSignal['strength']) {
  if (strength === 'high') return styles.strengthHigh;
  if (strength === 'medium') return styles.strengthMedium;
  return styles.strengthLow;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 48,
    gap: 18,
  },
  header: {
    gap: 8,
  },
  heroCluster: {
    alignItems: 'center',
    gap: 12,
    borderRadius: radii.xl,
    backgroundColor: '#0f1d3d',
    borderWidth: 1,
    borderColor: colors.gaming + '77',
    padding: 22,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
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
    fontWeight: '900',
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  motionPanel: {
    overflow: 'hidden',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#3730a3',
    backgroundColor: colors.surface,
    padding: 16,
    gap: 18,
  },
  scanLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 54,
    backgroundColor: '#818cf8',
    opacity: 0.16,
  },
  memberRail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  memberNode: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  memberName: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 72,
  },
  signalRail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  signalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radii.pill,
    backgroundColor: '#23234a',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  signalPillText: {
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  signalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  strengthDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  strengthHigh: {
    backgroundColor: colors.success,
  },
  strengthMedium: {
    backgroundColor: '#f59e0b',
  },
  strengthLow: {
    backgroundColor: colors.subdued,
  },
  signalCopy: {
    flex: 1,
    gap: 3,
  },
  signalLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  signalDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  openerBox: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#4f46e5',
    backgroundColor: '#18183a',
    padding: 16,
    gap: 10,
  },
  openerText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    gap: 10,
  },
  secondaryAction: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '800',
  },
});
