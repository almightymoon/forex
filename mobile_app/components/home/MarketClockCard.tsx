import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getMarketClockSnapshot,
  TIMELINE_LABELS,
  type ForexMarketStatus,
  type VolumeLevel,
} from '../../utils/forexSessions';
import { GlassCard } from './GlassCard';

const SESSION_ACCENTS: Record<
  ForexMarketStatus['id'],
  { open: readonly [string, string]; closed: string; glow: string }
> = {
  sydney: { open: ['#38BDF8', '#2563EB'], closed: 'rgba(56, 189, 248, 0.14)', glow: '#38BDF8' },
  tokyo: { open: ['#C084FC', '#9333EA'], closed: 'rgba(192, 132, 252, 0.12)', glow: '#C084FC' },
  london: { open: ['#3AADFF', '#2563EB'], closed: 'rgba(58, 173, 255, 0.12)', glow: '#3AADFF' },
  newYork: { open: ['#8B5CF6', '#6D28D9'], closed: 'rgba(139, 92, 246, 0.12)', glow: '#8B5CF6' },
};

function volumeLabel(level: VolumeLevel) {
  switch (level) {
    case 'high':
      return 'HIGH';
    case 'medium':
      return 'MEDIUM';
    case 'low':
      return 'LOW';
    default:
      return 'CLOSED';
  }
}

function volumeColor(level: VolumeLevel, colors: AppColors) {
  switch (level) {
    case 'high':
      return colors.success;
    case 'medium':
      return colors.brandBlue;
    case 'low':
      return colors.textMuted;
    default:
      return colors.textDim;
  }
}

function badgeLeftPercent(segments: ForexMarketStatus['segments']) {
  const seg = segments[0];
  if (!seg) return '8%' as const;
  return `${Math.min(Math.max(seg.left + seg.width * 0.12, 0.04), 0.68) * 100}%` as const;
}

function SessionRow({ session, utcFraction }: { session: ForexMarketStatus; utcFraction: number }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const accent = SESSION_ACCENTS[session.id];
  const labelLeft = badgeLeftPercent(session.segments);

  return (
    <View style={styles.sessionRow}>
      <View style={styles.sessionMeta}>
        <View style={styles.sessionTitleRow}>
          <Text style={styles.flag}>{session.flag}</Text>
          {session.isOpen ? <View style={[styles.liveDot, { backgroundColor: accent.glow }]} /> : null}
          <Text style={styles.sessionName} numberOfLines={1}>
            {session.label}
          </Text>
        </View>
        <Text style={styles.sessionLocalTime}>{session.localTime}</Text>
      </View>

      <View style={styles.chartCol}>
        <View style={styles.track}>
          {session.segments.map((seg, index) =>
            session.isOpen ? (
              <LinearGradient
                key={`${session.id}-${index}`}
                colors={accent.open}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[
                  styles.segment,
                  {
                    left: `${seg.left * 100}%`,
                    width: `${seg.width * 100}%`,
                  },
                ]}
              />
            ) : (
              <View
                key={`${session.id}-${index}`}
                style={[
                  styles.segment,
                  {
                    left: `${seg.left * 100}%`,
                    width: `${seg.width * 100}%`,
                    backgroundColor: accent.closed,
                  },
                ]}
              />
            ),
          )}

          {session.isOpen ? (
            <View style={[styles.openBadge, { left: labelLeft }]}>
              <Text style={styles.openBadgeText}>OPEN</Text>
            </View>
          ) : (
            <View style={[styles.closedBadge, { left: labelLeft }]}>
              <Text style={styles.closedBadgeText}>CLOSED</Text>
            </View>
          )}

          <View style={[styles.rowNeedle, { left: `${utcFraction * 100}%` }]}>
            <View style={styles.needleLine} />
          </View>
        </View>
      </View>
    </View>
  );
}

export function MarketClockCard() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const [snapshot, setSnapshot] = useState(() => getMarketClockSnapshot());

  useEffect(() => {
    const tick = () => setSnapshot(getMarketClockSnapshot());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const volColor = volumeColor(snapshot.volume, colors);

  return (
    <GlassCard style={styles.card} contentStyle={styles.inner} radius={24} prominent>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="time-outline" size={14} color={colors.brandPurple} />
            <Text style={styles.eyebrow}>Trading sessions</Text>
          </View>
          <Text style={styles.title}>Market clock</Text>
        </View>

        <View style={styles.clockBlock}>
          <View style={styles.tzRow}>
            <Ionicons name="globe-outline" size={12} color={colors.textMuted} />
            <Text style={styles.tzText} numberOfLines={1}>
              {snapshot.deviceTimeZone.replace(/_/g, ' ')}
            </Text>
          </View>
          <Text style={styles.clock}>{snapshot.clock}</Text>
        </View>
      </View>

      <View style={styles.chartBlock}>
        <View style={styles.axisRow}>
          <View style={styles.axisSpacer} />
          <View style={styles.axisLabels}>
            {TIMELINE_LABELS.map((label) => (
              <Text key={label} style={styles.axisLabel}>
                {label}
              </Text>
            ))}
          </View>
        </View>

        <View style={styles.sessionsWrap}>
          {snapshot.sessions.map((session) => (
            <SessionRow key={session.id} session={session} utcFraction={snapshot.utcFraction} />
          ))}
        </View>

        <View style={styles.needleLegend}>
          <View style={styles.needleCap} />
          <Text style={styles.needleLegendText}>Current UTC time</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.volumeRow}>
          <Text style={styles.volumeLabel}>Typical volume</Text>
          <View style={[styles.volumePill, { backgroundColor: `${volColor}18` }]}>
            <Text style={[styles.volumeValue, { color: volColor }]}>{volumeLabel(snapshot.volume)}</Text>
          </View>
        </View>
        <Text style={styles.volumeNote}>
          {snapshot.marketsClosed
            ? snapshot.volumeNote
            : `${snapshot.volumeNote}${snapshot.openLabels.length ? ' open' : ''}`}
        </Text>
      </View>
    </GlassCard>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const trackBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

  return StyleSheet.create({
    card: {
      marginBottom: 24,
    },
    inner: {
      padding: 16,
      gap: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      letterSpacing: 0.2,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.4,
    },
    clockBlock: {
      alignItems: 'flex-end',
      gap: 2,
      maxWidth: '46%',
    },
    tzRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tzText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
    },
    clock: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      fontVariant: ['tabular-nums'],
      letterSpacing: -0.5,
    },
    chartBlock: {
      gap: 8,
    },
    axisRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    axisSpacer: {
      width: 88,
      flexShrink: 0,
    },
    axisLabels: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    axisLabel: {
      fontSize: 9,
      fontWeight: '600',
      color: colors.textDim,
      fontVariant: ['tabular-nums'],
    },
    sessionsWrap: {
      gap: 10,
    },
    sessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    sessionMeta: {
      width: 88,
      flexShrink: 0,
      gap: 1,
    },
    sessionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    flag: {
      fontSize: 14,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    sessionName: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    sessionLocalTime: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    chartCol: {
      flex: 1,
      minWidth: 0,
      height: 34,
      justifyContent: 'center',
    },
    track: {
      height: 28,
      borderRadius: 10,
      backgroundColor: trackBg,
      overflow: 'hidden',
      position: 'relative',
    },
    segment: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      borderRadius: 10,
    },
    openBadge: {
      position: 'absolute',
      top: 5,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    openBadgeText: {
      fontSize: 8,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.6,
    },
    closedBadge: {
      position: 'absolute',
      top: 6,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    closedBadgeText: {
      fontSize: 7,
      fontWeight: '700',
      color: colors.textDim,
      letterSpacing: 0.5,
    },
    rowNeedle: {
      position: 'absolute',
      top: -3,
      bottom: -3,
      width: 2,
      marginLeft: -1,
      zIndex: 3,
    },
    needleLine: {
      flex: 1,
      width: 2,
      borderRadius: 1,
      backgroundColor: colors.brandPurple,
    },
    needleLegend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingLeft: 88,
    },
    needleCap: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.brandPurple,
    },
    needleLegendText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.textDim,
    },
    footer: {
      gap: 4,
      paddingTop: 2,
    },
    volumeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    volumeLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    volumePill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    volumeValue: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    volumeNote: {
      fontSize: 11,
      fontWeight: '500',
      color: colors.textMuted,
      lineHeight: 15,
    },
  });
}
