import { SignalCard, type SignalCardProps } from '../SignalCard';

type Props = Omit<SignalCardProps, 'variant'> & {
  onPress?: () => void;
};

export function LatestSignalCard(props: Props) {
  return <SignalCard {...props} variant="featured" />;
}
