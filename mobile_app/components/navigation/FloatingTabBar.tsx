import { useMemo } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon, type AppIconName } from '../AppIcon';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { recordQuickAccessRoute } from '../../utils/quickAccess';

const TAB_ORDER = ['home', 'courses', 'community', 'signals', 'more'] as const;
type TabRoute = (typeof TAB_ORDER)[number];

const TAB_META: Record<TabRoute, { icon: AppIconName; label: string }> = {
  home: { icon: 'home', label: 'Home' },
  courses: { icon: 'book-open', label: 'Courses' },
  community: { icon: 'community', label: 'Chat' },
  signals: { icon: 'candlestick', label: 'Signal' },
  more: { icon: 'more', label: 'Menu' },
};

const ICON_CIRCLE = 40;
export const FLOATING_TAB_BAR_HEIGHT = 64;
const BAR_RADIUS = 32;
const BAR_MARGIN_H = 18;
const BAR_FLOAT_GAP = 12;

export function getFloatingTabBarInset(bottomInset: number) {
  return (
    FLOATING_TAB_BAR_HEIGHT +
    Math.max(bottomInset, Platform.OS === 'android' ? 10 : 8) +
    BAR_FLOAT_GAP +
    10
  );
}

function isTabRoute(name: string): name is TabRoute {
  return (TAB_ORDER as readonly string[]).includes(name);
}

export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 8) + BAR_FLOAT_GAP;
  const visibleRoutes = state.routes.filter((route) => isTabRoute(route.name));

  return (
    <View style={[styles.outer, { bottom }]} pointerEvents="box-none">
      <View style={styles.barShadow}>
        <View style={styles.barShell}>
          <View style={styles.row}>
            {visibleRoutes.map((route) => {
              const routeIndex = state.routes.findIndex((r) => r.key === route.key);
              const isFocused = state.index === routeIndex;
              const meta = TAB_META[route.name as TabRoute];

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });

                if (route.name === 'community') {
                  void recordQuickAccessRoute('/(app)/community');
                }
                if (route.name === 'signals') {
                  void recordQuickAccessRoute('/(app)/signals');
                }

                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={styles.tab}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={meta.label}
                >
                  <View style={styles.iconWrap}>
                    {isFocused ? (
                      <View style={styles.activeCircle}>
                        <AppIcon name={meta.icon} size={20} color={colors.primaryForeground} strokeWidth={2.3} />
                      </View>
                    ) : (
                      <AppIcon
                        name={meta.icon}
                        size={21}
                        color={colors.textMuted}
                        strokeWidth={2}
                      />
                    )}
                  </View>
                  <Text
                    style={[styles.label, isFocused && styles.labelActive]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    allowFontScaling={false}
                  >
                    {meta.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
  outer: {
    position: 'absolute',
    left: BAR_MARGIN_H,
    right: BAR_MARGIN_H,
  },
  barShadow: {
    borderRadius: BAR_RADIUS,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.35 : 0.08,
    shadowRadius: isDark ? 20 : 16,
    elevation: 6,
  },
  barShell: {
    borderRadius: BAR_RADIUS,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: FLOATING_TAB_BAR_HEIGHT,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },
  tab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 1,
  },
  iconWrap: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCircle: {
    width: ICON_CIRCLE,
    height: ICON_CIRCLE,
    borderRadius: ICON_CIRCLE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 2,
  },
  labelActive: {
    color: colors.text,
    fontWeight: '700',
  },
});
}
