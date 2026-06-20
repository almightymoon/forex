import { StyleSheet, Text, View } from 'react-native';
import { Logo } from '../Logo';
import { AuthWordmark } from './AuthWordmark';

type Props = {
  title: string;
  tagline: string;
  subtitle: string;
};

export function AuthHeader({ title, tagline, subtitle }: Props) {
  return (
    <View style={styles.wrap}>
      {/* Zero-height anchor — logo floats top-right without affecting layout */}
      <View style={styles.logoAnchor}>
        <View style={styles.logoFloat} pointerEvents="none">
          <Logo size="authCorner" />
        </View>
      </View>

      <AuthWordmark compact />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.tagline}>{tagline}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    marginBottom: 18,
    overflow: 'visible',
  },
  logoAnchor: {
    height: 0,
    overflow: 'visible',
    zIndex: 2,
  },
  logoFloat: {
    position: 'absolute',
    top: -40,
    right: -50,
    width: 225,
    height: 225,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    marginTop: 8,
    marginBottom: 8,
    paddingRight: 112,
  },
  tagline: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 10,
    paddingRight: 112,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 22,
    maxWidth: 340,
    paddingRight: 8,
  },
});
