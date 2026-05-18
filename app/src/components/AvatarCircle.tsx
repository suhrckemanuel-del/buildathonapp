import { StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

type AvatarCircleProps = {
  username?: string | null;
  size?: number;
};

export function AvatarCircle({ username, size = 44 }: AvatarCircleProps) {
  const initials = getInitials(username);

  return (
    <View style={[styles.root, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.text, { fontSize: Math.max(13, size * 0.34) }]}>{initials}</Text>
    </View>
  );
}

function getInitials(username?: string | null) {
  if (!username) return 'G';
  const parts = username.trim().split(/[\s_-]+/).filter(Boolean);
  if (parts.length === 0) return 'G';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: '#818cf8',
  },
  text: {
    color: colors.text,
    fontWeight: '800',
  },
});
