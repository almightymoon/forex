import { GlassCard } from '../GlassCard';
import type { StyleProp, ViewStyle } from 'react-native';

type Props = {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  radius?: number;
  prominent?: boolean;
};

/** Screen-level glass panel — drop-in for opaque card containers */
export function GlassSurface({ children, style, contentStyle, radius = 18, prominent }: Props) {
  return (
    <GlassCard style={style} contentStyle={contentStyle} radius={radius} prominent={prominent}>
      {children}
    </GlassCard>
  );
}
