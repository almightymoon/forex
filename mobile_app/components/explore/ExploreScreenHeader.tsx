import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ReactNode, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

type Props = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  trailing?: ReactNode;
  children?: ReactNode;
};

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    safe: {
      backgroundColor: colors.background,
    },
    hero: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 22,
      borderBottomLeftRadius: 24,
      borderBottomRightRadius: 24,
      overflow: 'hidden',
      ...(isDark
        ? {}
        : {
            backgroundColor: colors.surface,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }),
    },
    lightGlow: {
      position: 'absolute',
      top: -40,
      right: -20,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: 'rgba(167, 139, 250, 0.14)',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      ...(isDark
        ? {
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderColor: 'rgba(255,255,255,0.18)',
          }
        : {
            backgroundColor: colors.surfaceHover,
            borderColor: colors.border,
          }),
    },
    backPlaceholder: {
      width: 40,
      height: 40,
    },
    eyebrow: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      color: isDark ? 'rgba(255,255,255,0.55)' : colors.primary,
    },
    title: {
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.6,
      lineHeight: 32,
      color: isDark ? '#FFFFFF' : colors.text,
    },
    subtitle: {
      fontSize: 14,
      marginTop: 6,
      lineHeight: 20,
      fontWeight: '500',
      color: isDark ? 'rgba(255,255,255,0.65)' : colors.textMuted,
    },
    toolbar: {
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 4,
      gap: 12,
      backgroundColor: colors.background,
    },
  });
}

export function ExploreScreenHeader({
  eyebrow,
  title,
  subtitle,
  showBack,
  onBack,
  trailing,
  children,
}: Props) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const handleBack = onBack ?? (() => router.back());
  const iconColor = isDark ? '#FFFFFF' : colors.text;

  const heroContent = (
    <>
      {!isDark ? <View style={styles.lightGlow} pointerEvents="none" /> : null}
      <View style={styles.topRow}>
        {showBack ? (
          <Pressable style={styles.backBtn} onPress={handleBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={20} color={iconColor} />
          </Pressable>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        {trailing ?? <View style={styles.backPlaceholder} />}
      </View>

      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {isDark ? (
        <LinearGradient
          colors={colors.headerGradient as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {heroContent}
        </LinearGradient>
      ) : (
        <View style={styles.hero}>{heroContent}</View>
      )}

      {children ? <View style={styles.toolbar}>{children}</View> : null}
    </SafeAreaView>
  );
}
