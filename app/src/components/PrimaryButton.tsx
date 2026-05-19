import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii } from './theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
  variant?: 'primary' | 'light' | 'subtle';
};

export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  style,
  accessibilityLabel,
  variant = 'primary',
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        variant === 'light' && styles.light,
        variant === 'subtle' && styles.subtle,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {variant === 'primary' ? <LinearGradient colors={[colors.primary, colors.violet]} style={StyleSheet.absoluteFill} /> : null}
      {loading ? <ActivityIndicator color={variant === 'light' ? colors.background : colors.text} /> : <Text style={[styles.text, variant === 'light' && styles.lightText]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.86,
  },
  light: {
    backgroundColor: colors.text,
  },
  subtle: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  lightText: {
    color: colors.background,
  },
});
