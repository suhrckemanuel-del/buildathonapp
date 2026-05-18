import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from './theme';

type InterestTagProps = {
  label: string;
};

export function InterestTag({ label }: InterestTagProps) {
  return (
    <View style={styles.root}>
      <Text numberOfLines={1} style={styles.text}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    maxWidth: '100%',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: '#3730a3',
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    color: '#c7d2fe',
    fontSize: 12,
    fontWeight: '700',
  },
});
