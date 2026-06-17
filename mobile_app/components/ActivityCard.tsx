import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';

type Props = {
  title: string;
  message: string;
  timestamp?: string;
  onPress?: () => void;
};

function formatDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export function ActivityCard({ title, message, timestamp, onPress }: Props) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.iconWrap}>
        <AppIcon name="activity" size={19} color="#3AADFF" strokeWidth={2.2} />
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
        {timestamp ? <Text style={styles.date}>{formatDate(timestamp)}</Text> : null}
      </View>
      <AppIcon name="chevron-right" size={18} color="rgba(255,255,255,0.25)" strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(8,20,48,0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.12)',
    padding: 14,
  },
  pressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,96,230,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.25)',
  },
  content: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  message: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 17,
  },
  date: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
});
