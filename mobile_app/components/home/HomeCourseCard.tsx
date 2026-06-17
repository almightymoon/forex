import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { colors } from '../../constants/theme';
import { formatInstructor } from '../../utils/formatInstructor';

const THUMB_W = 96;
const CARD_H = 100;

type Props = {
  title: string;
  instructor?: Parameters<typeof formatInstructor>[0];
  progress?: number;
  thumbnail?: string;
  lessonCount?: number;
  category?: string;
  onPress?: () => void;
};

export function HomeCourseCard({
  title,
  instructor,
  progress = 0,
  thumbnail,
  lessonCount,
  category = 'Forex',
  onPress,
}: Props) {
  const instructorName = formatInstructor(instructor);
  const pct = Math.min(Math.round(progress), 100);

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.thumb}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbImage} resizeMode="cover" />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <AppIcon name="book-open" size={28} color={colors.blue} strokeWidth={1.8} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.category}>{category}</Text>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {instructorName ? <Text style={styles.instructor} numberOfLines={1}>{instructorName}</Text> : null}
        <View style={styles.progressRow}>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${pct}%` }]} />
          </View>
          {lessonCount ? <Text style={styles.lessons}>{lessonCount} lessons</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    height: CARD_H,
    backgroundColor: '#0c1428',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 10,
  },
  pressed: { opacity: 0.92 },
  thumb: {
    width: THUMB_W,
    height: CARD_H,
  },
  thumbImage: {
    width: THUMB_W,
    height: CARD_H,
  },
  thumbPlaceholder: {
    width: THUMB_W,
    height: CARD_H,
    backgroundColor: 'rgba(0,102,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    height: CARD_H,
    paddingVertical: 10,
    paddingRight: 12,
    paddingLeft: 10,
    justifyContent: 'center',
    gap: 1,
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.cyan,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 17,
  },
  instructor: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.blue,
    borderRadius: 2,
  },
  lessons: {
    fontSize: 10,
    color: colors.textDim,
    flexShrink: 0,
  },
});
