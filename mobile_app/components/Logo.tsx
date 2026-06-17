import { Image, StyleSheet, View } from 'react-native';

type Props = {
  size?: 'mark' | 'header' | 'sm' | 'md' | 'lg';
};

const SIZES = {
  lg: { wrapper: { width: 240, height: 240 }, image: { width: 300, height: 300 } },
  md: { wrapper: { width: 126, height: 126 }, image: { width: 260, height: 260 } },
  sm: { wrapper: { width: 100, height: 100 }, image: { width: 130, height: 130 } },
  header: { wrapper: { width: 190, height: 44 }, image: { width: 190, height: 44 } },
  mark: { wrapper: { width: 48, height: 48 }, image: { width: 48, height: 48 } },
} as const;

export function Logo({ size = 'lg' }: Props) {
  const dims = SIZES[size];

  return (
    <View style={[styles.base, dims.wrapper]}>
      <Image
        source={require('../assets/images/logo.png')}
        style={dims.image}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
