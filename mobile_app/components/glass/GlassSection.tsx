import { useMemo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { AppColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.wrap, style]}>
      {title ? <Text style={glassSectionLabel(colors)}>{title}</Text> : null}
      <GlassCard contentStyle={[styles.content, contentStyle]} radius={radius}>
        {children}
      </GlassCard>
    </View>
  );
}

export function GlassDivider({ inset = 14 }: { inset?: number }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return <View style={[styles.divider, { marginLeft: inset }]} />;
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  wrap: {
    gap: 8,
  },
  content: {
    padding: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
});
}
