import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

function seeded(seed: number) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type Star = {
  left: number;
  top: number;
  size: number;
  opacity: number;
};

/** Small static stars across the auth sky (above the bottom earth arc) */
export function AuthStarfield() {
  const { width, height } = useWindowDimensions();

  const stars = useMemo(() => {
    const count = Math.round(Math.min(220, Math.max(140, (width * height) / 4200)));
    const list: Star[] = [];
    for (let i = 0; i < count; i += 1) {
      const r1 = seeded(i * 3 + 1);
      const r2 = seeded(i * 3 + 2);
      const r3 = seeded(i * 3 + 3);
      list.push({
        left: r1 * width,
        top: r2 * height,
        size: r3 > 0.92 ? 2 : r3 > 0.55 ? 1.5 : 1,
        opacity: 0.18 + seeded(i * 11) * 0.62,
      });
    }
    return list;
  }, [width, height]);

  return (
    <View style={styles.root} pointerEvents="none">
      {stars.map((star, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              left: star.left,
              top: star.top,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0A0C',
  },
  star: {
    position: 'absolute',
    backgroundColor: '#d8e8f8',
  },
});
