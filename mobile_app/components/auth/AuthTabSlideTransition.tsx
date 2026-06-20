import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { AuthTab } from './SegmentedAuthToggle';

const SLIDE_OFFSET = 44;

type Props = {
  activeTab: AuthTab;
  login: React.ReactNode;
  signup: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/**
 * Slide-in on tab change. Content tracks activeTab directly — no fade-to-zero,
 * so opacity can never get stuck invisible.
 */
export function AuthTabSlideTransition({ activeTab, login, signup, style }: Props) {
  const translateX = useRef(new Animated.Value(0)).current;
  const prevTab = useRef<AuthTab>(activeTab);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevTab.current = activeTab;
      return;
    }

    if (activeTab === prevTab.current) return;

    const enterFrom = activeTab === 'signup' ? SLIDE_OFFSET : -SLIDE_OFFSET;
    prevTab.current = activeTab;

    translateX.stopAnimation();
    translateX.setValue(enterFrom);

    Animated.spring(translateX, {
      toValue: 0,
      tension: 92,
      friction: 13,
      useNativeDriver: true,
    }).start();
  }, [activeTab, translateX]);

  return (
    <View style={[styles.clip, style]}>
      <Animated.View style={{ transform: [{ translateX }] }}>
        {activeTab === 'login' ? login : signup}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});
