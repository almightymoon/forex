import { Image, type ImageProps } from 'expo-image';

type Props = ImageProps;

/** Remote images with disk + memory caching via expo-image. */
export function CachedImage(props: Props) {
  return (
    <Image
      cachePolicy="memory-disk"
      transition={150}
      recyclingKey={typeof props.source === 'object' && props.source && 'uri' in props.source ? props.source.uri : undefined}
      {...props}
    />
  );
}
