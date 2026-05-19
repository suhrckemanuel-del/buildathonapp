import { Text, View, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { colors } from './theme';

type Variant = 'wordmark' | 'compact';

type Props = {
  size?: number;
  variant?: Variant;
  source?: ImageSourcePropType;
  align?: 'left' | 'center';
};

export function MigosLogo({ size = 56, variant = 'wordmark', source, align = 'center' }: Props) {
  if (source) {
    const height = variant === 'compact' ? size : size * 0.85;
    return (
      <View style={[styles.imageWrap, align === 'left' && styles.imageWrapLeft]}>
        <Image
          source={source}
          resizeMode="contain"
          style={{ width: variant === 'compact' ? size : size * 2.6, height }}
        />
      </View>
    );
  }

  const fontSize = size;
  return (
    <View style={[styles.wordmarkWrap, align === 'left' && styles.wordmarkWrapLeft]}>
      <Text
        accessibilityRole="text"
        style={[
          styles.wordmark,
          {
            fontSize,
            lineHeight: fontSize * 1.05,
            letterSpacing: -fontSize * 0.04,
          },
        ]}
      >
        migos
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wordmarkWrap: { alignItems: 'center' },
  wordmarkWrapLeft: { alignItems: 'flex-start' },
  wordmark: {
    color: colors.brand,
    fontWeight: '900',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    includeFontPadding: false,
  },
  imageWrap: { alignItems: 'center' },
  imageWrapLeft: { alignItems: 'flex-start' },
});
