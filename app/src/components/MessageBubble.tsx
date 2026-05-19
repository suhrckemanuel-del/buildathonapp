import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from './theme';

type MessageBubbleProps = {
  content: string;
  isMine: boolean;
  senderName?: string | null;
  isAiOpener?: boolean;
  timestamp?: string | null;
};

export function MessageBubble({
  content,
  isMine,
  senderName,
  isAiOpener = false,
  timestamp,
}: MessageBubbleProps) {
  if (isAiOpener) {
    return (
      <View style={styles.aiRoot}>
        <Text style={styles.aiLabel}>Icebreaker</Text>
        <Text style={styles.aiText}>{content}</Text>
        {timestamp ? <Text style={styles.aiTime}>{timestamp}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.row, isMine ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isMine ? styles.mine : styles.other]}>
        {!isMine && senderName ? <Text style={styles.sender}>{senderName}</Text> : null}
        <Text style={styles.message}>{content}</Text>
        {timestamp ? <Text style={[styles.time, isMine ? styles.timeMine : styles.timeOther]}>{timestamp}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  aiRoot: {
    alignSelf: 'center',
    width: '94%',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#4f46e5',
    backgroundColor: '#18183a',
    padding: 14,
    marginVertical: 8,
    gap: 7,
  },
  aiLabel: {
    color: '#c7d2fe',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  aiText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  aiTime: {
    color: colors.subdued,
    fontSize: 11,
  },
  row: {
    flexDirection: 'row',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    minWidth: 54,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
    flexShrink: 1,
  },
  mine: {
    backgroundColor: colors.violet,
    borderBottomRightRadius: 6,
  },
  other: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
  },
  sender: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  message: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
    flexShrink: 1,
  },
  time: {
    alignSelf: 'flex-end',
    fontSize: 10,
    fontWeight: '600',
  },
  timeMine: {
    color: '#e0e7ff',
  },
  timeOther: {
    color: colors.subdued,
  },
});
