import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassCard, glassSectionLabel } from '../GlassCard';

type Props = {
  title?: string;
  children: React.ReactNode;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Grouped menu / settings rows inside one glass card */
export function GlassSection({ title, children, radius = 18, style, contentStyle }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {title ? <Text style={glassSectionLabel}>{title}</Text> : null}
      <GlassCard contentStyle={[styles.content, contentStyle]} radius={radius}>
        {children}
      </GlassCard>
    </View>
  );
}

export function GlassDivider({ inset = 14 }: { inset?: number }) {
  return <View style={[styles.divider, { marginLeft: inset }]} />;
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  content: {
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});
