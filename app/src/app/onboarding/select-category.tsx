import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, radii } from '@/components/theme';

type Category = {
  key: 'films' | 'games';
  title: string;
  tagline: string;
  accent: string;
  glyph: string;
  href: string;
};

const CATEGORIES: Category[] = [
  {
    key: 'films',
    title: 'Films',
    tagline: 'Match around directors, genres, and the films you can\'t stop rewatching.',
    accent: colors.films,
    glyph: '\u{1F3AC}',
    href: '/onboarding/film-profile',
  },
  {
    key: 'games',
    title: 'Gaming',
    tagline: 'Find people who play the way you play — genres, vibes, shame games and all.',
    accent: colors.gaming,
    glyph: '\u{1F3AE}',
    href: '/onboarding/gaming-profile',
  },
];

export default function SelectCategoryScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.progress}>Step 2 of 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Pick your first interest</Text>
        <Text style={styles.subtitle}>
          We use this to find your first group. You can add more later.
        </Text>

        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            onPress={() => router.push(cat.href as never)}
            style={({ pressed }) => [
              styles.card,
              { borderColor: cat.accent + '66' },
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={[styles.badge, { borderColor: cat.accent, backgroundColor: cat.accent + '1a' }]}>
              <Text style={[styles.glyph, { color: cat.accent }]}>{cat.glyph}</Text>
            </View>
            <Text style={styles.cardTitle}>{cat.title}</Text>
            <Text style={styles.cardTagline}>{cat.tagline}</Text>
            <Text style={[styles.cardCta, { color: cat.accent }]}>Choose {cat.title} →</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8 },
  progress: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 12, marginBottom: 6 },
  subtitle: { fontSize: 15, color: colors.muted, marginBottom: 28, lineHeight: 22 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: 24,
    marginBottom: 16,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  glyph: { fontSize: 28 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6 },
  cardTagline: { fontSize: 14, color: colors.muted, lineHeight: 20, marginBottom: 16 },
  cardCta: { fontSize: 14, fontWeight: '800' },
});
