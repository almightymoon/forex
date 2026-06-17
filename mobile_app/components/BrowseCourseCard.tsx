import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatInstructor } from '../utils/formatInstructor';

type Props = {
  title: string;
  instructor?: Parameters<typeof formatInstructor>[0];
  instructorImage?: string;
  thumbnail?: string;
  level?: string;
  rating?: number;
  ctaLabel?: string;
  onCtaPress?: () => void;
  onPress?: () => void;
};

export function BrowseCourseCard({ title, instructor, instructorImage, thumbnail, level, rating, ctaLabel, onCtaPress, onPress }: Props) {
  const instructorName = formatInstructor(instructor);
  const levelLabel = level ? level.charAt(0).toUpperCase() + level.slice(1) : undefined;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.thumbWrap}>
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.thumbImage} />
        ) : (
          <View style={styles.thumbPlaceholder}>
            <Ionicons name="book-outline" size={28} color="rgba(58,173,255,0.5)" />
          </View>
        )}
        <View style={styles.playOverlay}>
          <View style={styles.playBtn}>
            <Ionicons name="play" size={16} color="#fff" style={{ marginLeft: 2 }} />
          </View>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>

        {instructorName ? (
          <View style={styles.instructorRow}>
            {instructorImage ? (
              <Image source={{ uri: instructorImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={12} color="rgba(255,255,255,0.6)" />
              </View>
            )}
            <Text style={styles.instructor}>{instructorName}</Text>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          {levelLabel ? (
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{levelLabel}</Text>
            </View>
          ) : null}
          {typeof rating === 'number' && rating > 0 ? (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#FFC107" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          ) : null}
          {ctaLabel && onCtaPress ? (
            <Pressable style={styles.cta} onPress={onCtaPress} hitSlop={8}>
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(8,20,48,0.9)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.12)',
    overflow: 'hidden',
    gap: 14,
    padding: 12,
  },
  thumbWrap: {
    width: 96,
    height: 96,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,96,230,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,96,230,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 21,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  instructor: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  levelBadge: {
    backgroundColor: 'rgba(0,96,230,0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.35)',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3AADFF',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFC107',
  },
  cta: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0,96,230,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(58,173,255,0.35)',
  },
  ctaText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#3AADFF',
  },
});
