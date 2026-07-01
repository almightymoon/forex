import { useEffect, useRef, useState, useMemo } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

export type AuthTab = 'login' | 'signup';

type Props = {
  activeTab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
};

const TRACK_HEIGHT = 56;
const TRACK_PADDING = 4;
const TRACK_RADIUS = TRACK_HEIGHT / 2;
const PILL_HEIGHT = TRACK_HEIGHT - TRACK_PADDING * 2;
const PILL_RADIUS = PILL_HEIGHT / 2;

export function SegmentedAuthToggle({ activeTab, onTabChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const slide = useRef(new Animated.Value(activeTab === 'login' ? 0 : 1)).current;
  const [innerWidth, setInnerWidth] = useState(0);
  const pillWidth = innerWidth > 0 ? Math.floor(innerWidth / 2) : 0;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: activeTab === 'login' ? 0 : 1,
      tension: 120,
      friction: 14,
      useNativeDriver: true,
    }).start();
  }, [activeTab, slide]);

  const onLayout = (e: LayoutChangeEvent) => {
    const trackWidth = e.nativeEvent.layout.width;
    setInnerWidth(Math.max(0, trackWidth - TRACK_PADDING * 2));
  };

  const pillTranslateX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, pillWidth],
  });

  return (
    <View style={styles.container} onLayout={onLayout}>
      {pillWidth > 0 ? (
        <Animated.View
          style={[
            styles.pill,
            {
              width: pillWidth,
              transform: [{ translateX: pillTranslateX }],
            },
          ]}
        />
      ) : null}

      <Pressable
        style={styles.half}
        onPress={() => onTabChange('login')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'login' }}
      >
        <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>Login</Text>
      </Pressable>

      <Pressable
        style={styles.half}
        onPress={() => onTabChange('signup')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'signup' }}
      >
        <Text style={[styles.tabText, activeTab === 'signup' && styles.tabTextActive]}>Sign Up</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_RADIUS,
    backgroundColor: colors.surfaceInset,
    padding: TRACK_PADDING,
    marginBottom: 18,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pill: {
    position: 'absolute',
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    height: PILL_HEIGHT,
    borderRadius: PILL_RADIUS,
    backgroundColor: colors.primary,
  },
  half: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primaryForeground,
  },
});
}
