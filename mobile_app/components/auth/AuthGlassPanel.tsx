import { BlurView } from 'expo-blur';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AuthGlassPanel({ children, style }: Props) {
  return (
    <View style={[styles.shadowWrapper, style]}>
      <View style={styles.panel}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 75 : 60}
          tint="dark"
          experimentalBlurMethod={
            Platform.OS === 'android' ? 'dimezisBlurView' : undefined
          }
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.borderOverlay} pointerEvents="none" />


        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const PANEL_RADIUS = 28;

const styles = StyleSheet.create({
  shadowWrapper: {
    borderRadius: PANEL_RADIUS,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 26,

    elevation: 14,
  },

  panel: {
    position: 'relative',
    borderRadius: PANEL_RADIUS,
    overflow: 'hidden',

    borderWidth: 1,
    // borderColor: 'rgba(255,255,255,0.28)',

    // Important: almost transparent, not colored
    backgroundColor:
      Platform.OS === 'android'
        ? 'rgba(255,255,255,0.03)'
        : 'rgba(255,255,255,0.02)',
  },

  borderOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PANEL_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',

  },

 

  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
});