import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { PrimaryButton } from '@/components/PrimaryButton';
import { categoryThemes, colors, gradientFor, radii } from '@/components/theme';
import {
  DemoCategory,
  getCategoryRoute,
  saveSelectedDemoCategories,
} from '@/lib/demoAuth';

type Card = {
  key: DemoCategory;
  gradientKey: 'films' | 'gaming' | 'sports' | 'music';
  title: string;
  tagline: string;
  glyph: string;
};

const CARDS: Card[] = [
  {
    key: 'films',
    gradientKey: 'films',
    title: 'Films',
    tagline: 'Directors, genres, and the films you keep rewatching.',
    glyph: '\u{1F3AC}',
  },
  {
    key: 'games',
    gradientKey: 'gaming',
    title: 'Gaming',
    tagline: 'Playstyles, top games, and the genres you actually click with.',
    glyph: '\u{1F3AE}',
  },
  {
    key: 'sports',
    gradientKey: 'sports',
    title: 'Sports',
    tagline: 'The sport, the team, and the athletes you actually follow.',
    glyph: '⚽',
  },
  {
    key: 'music',
    gradientKey: 'music',
    title: 'Music',
    tagline: 'Artists in rotation, your genre, and the comfort album.',
    glyph: '♪',
  },
];

export default function SelectCategoryScreen() {
  const [selected, setSelected] = useState<Set<DemoCategory>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (key: DemoCategory) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleContinue = async () => {
    if (selected.size === 0 || saving) return;
    setSaving(true);
    try {
      const ordered: DemoCategory[] = CARDS
        .map((c) => c.key)
        .filter((k) => selected.has(k));
      await saveSelectedDemoCategories(ordered);
      const firstRoute = getCategoryRoute(ordered[0]);
      router.push(firstRoute as never);
    } finally {
      setSaving(false);
    }
  };

  const count = selected.size;
  const ctaLabel =
    count === 0
      ? 'Pick at least one'
      : count === 1
        ? 'Continue with 1 interest'
        : `Continue with ${count} interests`;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.progress}>Pick your interests</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>What should we match you on?</Text>
        <Text style={styles.subtitle}>
          Pick one or more. We ask you a few quick things for each so the AI can drop you into a small group that actually fits.
        </Text>

        <View style={styles.grid}>
          {CARDS.map((card) => {
            const isOn = selected.has(card.key);
            const gradient = gradientFor(card.gradientKey);
            const accent = categoryThemes[card.gradientKey].color;
            return (
              <Pressable
                key={card.key}
                onPress={() => toggle(card.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isOn }}
                style={({ pressed }) => [
                  styles.cardOuter,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <LinearGradient
                  colors={gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.cardInner,
                    isOn && { borderColor: '#ffffff' },
                  ]}
                >
                  <View style={styles.orb} />
                  <View style={styles.cardTop}>
                    <Text style={styles.glyph}>{card.glyph}</Text>
                    <View
                      style={[
                        styles.checkbox,
                        isOn && styles.checkboxOn,
                      ]}
                    >
                      {isOn ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardTagline} numberOfLines={3}>
                      {card.tagline}
                    </Text>
                  </View>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={ctaLabel}
          onPress={handleContinue}
          disabled={count === 0 || saving}
          loading={saving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  progress: { fontSize: 13, color: colors.brand, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  scroll: { paddingHorizontal: 20, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 12, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: 20, lineHeight: 22 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardOuter: {
    width: '48%',
    minWidth: 150,
    flexGrow: 1,
  },
  cardInner: {
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 16,
    minHeight: 168,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    right: -36,
    top: -34,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  glyph: { fontSize: 30, color: '#ffffff' },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(0,0,0,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: '#ffffff',
    borderColor: '#ffffff',
  },
  checkmark: { color: '#0a0a0a', fontSize: 15, fontWeight: '900' },
  cardBottom: {
    gap: 4,
    marginTop: 14,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
  },
  cardTagline: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.82)',
    lineHeight: 17,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
