import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';
import { GlassCard } from './GlassCard';

type Props = {
  title: string;
  scheduleLabel: string;
  onPress?: () => void;
  onReserve?: () => void;
};

export function LiveSessionHomeCard({ title, scheduleLabel, onPress, onReserve }: Props) {
  return (
    <View style={styles.flex}>
      <GlassCard style={styles.card} contentStyle={styles.inner} radius={20}>
        <Pressable style={styles.tapArea} onPress={onPress}>
          <Text style={styles.eyebrow}>Live Sessions</Text>
          <Text style={styles.title} numberOfLines={3}>
            {title}
          </Text>
          <Text style={styles.time}>{scheduleLabel}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={onReserve}
        >
          <Text style={styles.btnText}>Reserve Now</Text>
        </Pressable>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  card: { flex: 1, minWidth: 0 },
  inner: {
    padding: 14,
    minHeight: 208,
    justifyContent: 'space-between',
  },
  tapArea: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 21,
  },
  time: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.78)',
    marginTop: 10,
  },
  btn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 12,
  },
  btnPressed: { opacity: 0.88 },
  btnText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
});
