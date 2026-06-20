import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatInstructor } from '../utils/formatInstructor';
import { GlassCard } from './GlassCard';

type Props = {
  title: string;
  instructor?: Parameters<typeof formatInstructor>[0];
  progress?: number; // 0-100
  thumbnail?: string;
  lessonCount?: number;
  onPress?: () => void;
};

export function CourseCard({ title, instructor, progress = 0, thumbnail, lessonCount, onPress }: Props) {
  const instructorName = formatInstructor(instructor);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <GlassCard contentStyle={styles.cardInner} radius={16}>
        <View style={styles.thumb}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbImage} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="play-circle-outline" size={30} color="rgba(58,173,255,0.6)" />
          </View>
        )}
        {progress > 0 && (
          <View style={styles.progressBadge}>
            <Text style={styles.progressBadgeText}>{Math.round(progress)}%</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        {instructorName ? <Text style={styles.instructor}>{instructorName}</Text> : null}

        {/* Progress bar */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
          {lessonCount ? (
            <Text style={styles.lessonCount}>{lessonCount} lessons</Text>
          ) : null}
        </View>
      </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.92 },
  cardInner: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  thumb: {
    width: 90,
    minHeight: 96,
    position: 'relative',
  },
  thumbImage: {
    width: 90,
    height: 96,
  },
  thumbPlaceholder: {
    width: 90,
    height: 96,
    backgroundColor: 'rgba(0,96,230,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  progressBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3AADFF',
  },
  info: {
    flex: 1,
    padding: 12,
    gap: 4,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 20,
  },
  instructor: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3AADFF',
    borderRadius: 2,
  },
  lessonCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    flexShrink: 0,
  },
});
