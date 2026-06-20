import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { colors } from '../../constants/theme';
import { GlassCard } from './GlassCard';

const THUMB_SIZE = 62;
const THUMB_RADIUS = 20;

type Props = {
  title: string;
  level?: string;
  thumbnail?: string;
  lessonCount?: number;
  onPress?: () => void;
};

export function HomeCourseCard({
  title,
  level = 'Beginners',
  thumbnail,
  lessonCount,
  onPress,
}: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.outer, pressed && styles.pressed]}
      onPress={onPress}
    >
      <GlassCard contentStyle={styles.cardInner} radius={26}>
        <View style={styles.thumb}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.thumbImage} resizeMode="cover" />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <AppIcon name="book-open" size={30} color={colors.primary} strokeWidth={1.8} />
            </View>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
            <Pressable style={styles.menuBtn} hitSlop={8}>
              <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.55)" />
            </Pressable>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.level}>{level}</Text>
            {lessonCount != null ? (
              <Text style={styles.lessons}>{lessonCount} Lessons</Text>
            ) : null}
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
    marginBottom: 12,
  },
  pressed: {
    opacity: 0.94,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 14,
    gap: 14,
    minHeight: THUMB_SIZE + 28,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_RADIUS,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexShrink: 0,
  },
  thumbImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  thumbPlaceholder: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(3,111,252,0.12)',
  },
  body: {
    flex: 1,
    minWidth: 0,
    minHeight: THUMB_SIZE,
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  menuBtn: {
    paddingTop: 2,
    flexShrink: 0,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  level: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.78)',
  },
  lessons: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.78)',
  },
});
