import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, radii } from '@/components/theme';

type Category = 'films' | 'games' | 'mixed';

const RING_COUNT = 4;
const RING_DURATION = 2800;
const RING_DELAY_STEP = 700;
const AVATAR_DELAYS = [1800, 2300, 2800];
const CTA_DELAY = 3300;
const AUTO_ROUTE_AT = 3500;

const RING_SIZES = [80, 140, 190, 230];

function categoryMeta(category: Category) {
  if (category === 'games') {
    return { icon: '🎮', accent: colors.gaming, label: 'gamers' };
  }
  if (category === 'mixed') {
    return { icon: '✨', accent: colors.violet, label: 'people' };
  }
  return { icon: '🎬', accent: colors.films, label: 'films fans' };
}

export default function MatchSearchingScreen() {
  const params = useLocalSearchParams<{ groupId: string; category?: string }>();
  const groupId = params.groupId;
  const category: Category = useMemo(() => {
    const c = params.category;
    if (c === 'games' || c === 'mixed' || c === 'films') return c;
    return 'films';
  }, [params.category]);

  const meta = categoryMeta(category);
  const [stepThreeDone, setStepThreeDone] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const routed = useRef(false);

  const ringValues = useRef(
    Array.from({ length: RING_COUNT }, () => new Animated.Value(0)),
  ).current;
  const dotPulse = useRef(new Animated.Value(0)).current;
  const avatarValues = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(0)),
  ).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const ctaValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const ringAnims = ringValues.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * RING_DELAY_STEP),
          Animated.timing(value, {
            toValue: 1,
            duration: RING_DURATION,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    const dotAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(dotPulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const spinAnim = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    ringAnims.forEach((a) => a.start());
    dotAnim.start();
    spinAnim.start();

    const avatarTimers = AVATAR_DELAYS.map((delay, i) =>
      setTimeout(() => {
        Animated.spring(avatarValues[i], {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }).start();
      }, delay),
    );

    const stepTimer = setTimeout(() => setStepThreeDone(true), CTA_DELAY - 200);
    const ctaTimer = setTimeout(() => {
      setCtaVisible(true);
      Animated.timing(ctaValue, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
    }, CTA_DELAY);

    const routeTimer = setTimeout(() => {
      goToMatch();
    }, AUTO_ROUTE_AT);

    return () => {
      ringAnims.forEach((a) => a.stop());
      dotAnim.stop();
      spinAnim.stop();
      avatarTimers.forEach(clearTimeout);
      clearTimeout(stepTimer);
      clearTimeout(ctaTimer);
      clearTimeout(routeTimer);
    };
  }, []);

  function goToMatch() {
    if (routed.current || !groupId) return;
    routed.current = true;
    router.replace(`/match/${groupId}` as never);
  }

  const dotScale = dotPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const dotGlow = dotPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });
  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ctaTranslate = ctaValue.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={[styles.catBadge, { borderColor: meta.accent + '88', backgroundColor: meta.accent + '1a' }]}>
          <Text style={[styles.catBadgeIcon, { color: meta.accent }]}>{meta.icon}</Text>
          <Text style={[styles.catBadgeLabel, { color: meta.accent }]}>
            {category === 'games' ? 'Gaming' : category === 'mixed' ? 'Mixed' : 'Films'}
          </Text>
        </View>
        <Text style={styles.title}>Finding your group</Text>
        <Text style={styles.subtitle}>Reading taste signals across the room. This takes a moment.</Text>
      </View>

      <View style={styles.radarCard}>
        <View style={styles.radarScene}>
          {ringValues.map((value, index) => {
            const size = RING_SIZES[index];
            const scale = value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.3] });
            const opacity = value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });
            return (
              <Animated.View
                key={index}
                style={[
                  styles.ring,
                  {
                    width: size,
                    height: size,
                    marginLeft: -size / 2,
                    marginTop: -size / 2,
                    transform: [{ scale }],
                    opacity,
                  },
                ]}
              />
            );
          })}

          <Animated.View
            style={[
              styles.centerHalo,
              { backgroundColor: meta.accent, opacity: dotGlow, transform: [{ scale: dotScale }] },
            ]}
          />
          <Animated.View
            style={[
              styles.centerDot,
              {
                backgroundColor: meta.accent,
                transform: [{ scale: dotScale }],
                shadowColor: meta.accent,
              },
            ]}
          >
            <Text style={styles.centerIcon}>{meta.icon}</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.avatar,
              styles.avatarTop,
              {
                backgroundColor: '#7b2730',
                opacity: avatarValues[0],
                transform: [{ scale: avatarValues[0] }],
              },
            ]}
          >
            <Text style={styles.avatarLetter}>J</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.avatar,
              styles.avatarRight,
              {
                backgroundColor: '#7a4a18',
                opacity: avatarValues[1],
                transform: [{ scale: avatarValues[1] }],
              },
            ]}
          >
            <Text style={styles.avatarLetter}>S</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.avatar,
              styles.avatarBottomLeft,
              {
                backgroundColor: '#1f5d3c',
                opacity: avatarValues[2],
                transform: [{ scale: avatarValues[2] }],
              },
            ]}
          >
            <Text style={styles.avatarLetter}>K</Text>
          </Animated.View>
        </View>
      </View>

      <View style={styles.stepsCard}>
        <Step label="Bio submitted" state="done" accent={meta.accent} />
        <Step label="Analysing your taste" state="done" accent={meta.accent} />
        <Step
          label="Matching you with a group"
          state={stepThreeDone ? 'done' : 'active'}
          accent={meta.accent}
          spin={spin}
        />
      </View>

      {ctaVisible ? (
        <Animated.View
          style={[
            styles.ctaCard,
            { opacity: ctaValue, transform: [{ translateY: ctaTranslate }] },
          ]}
        >
          <Text style={styles.ctaHeadline}>
            <Text style={styles.ctaStrong}>3 {meta.label}</Text> matched with your vibe
          </Text>
          <Pressable
            onPress={goToMatch}
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
            accessibilityRole="button"
            accessibilityLabel="See your match"
          >
            <Text style={styles.ctaButtonText}>See your match</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Step({
  label,
  state,
  accent,
  spin,
}: {
  label: string;
  state: 'done' | 'active';
  accent: string;
  spin?: Animated.AnimatedInterpolation<string>;
}) {
  return (
    <View style={styles.step}>
      <View
        style={[
          styles.stepIcon,
          state === 'done'
            ? { backgroundColor: accent }
            : { borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        {state === 'done' ? (
          <Text style={styles.stepCheck}>✓</Text>
        ) : spin ? (
          <Animated.View style={[styles.spinner, { transform: [{ rotate: spin }] }]} />
        ) : null}
      </View>
      <Text style={[styles.stepLabel, state !== 'done' && styles.stepLabelPending]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 32,
    gap: 22,
  },
  header: {
    gap: 8,
  },
  catBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 4,
  },
  catBadgeIcon: { fontSize: 14 },
  catBadgeLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  radarCard: {
    width: '100%',
    height: 300,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  radarScene: {
    width: 230,
    height: 230,
  },
  ring: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.brand + '66',
  },
  centerHalo: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 999,
    top: '50%',
    left: '50%',
    marginLeft: -48,
    marginTop: -48,
    opacity: 0.4,
  },
  centerDot: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 999,
    top: '50%',
    left: '50%',
    marginLeft: -32,
    marginTop: -32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  centerIcon: {
    fontSize: 26,
  },
  avatar: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTop: {
    top: -14,
    left: '50%',
    marginLeft: -23,
  },
  avatarRight: {
    top: '50%',
    right: -14,
    marginTop: -23,
  },
  avatarBottomLeft: {
    bottom: -14,
    left: 20,
  },
  avatarLetter: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  stepsCard: {
    width: '100%',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 18,
    gap: 14,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheck: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  spinner: {
    width: 16,
    height: 16,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(240,240,255,0.18)',
    borderTopColor: colors.text,
  },
  stepLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  stepLabelPending: {
    color: colors.muted,
  },
  ctaCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: colors.brand,
    padding: 20,
    gap: 14,
  },
  ctaHeadline: {
    color: '#1a1300',
    fontSize: 15,
    fontWeight: '600',
  },
  ctaStrong: {
    color: '#1a1300',
    fontWeight: '900',
  },
  ctaButton: {
    height: 50,
    borderRadius: 999,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
});
