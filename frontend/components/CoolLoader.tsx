'use client';

import { CandleStreamFrame, useCandlePipeline } from './CandleStreamLoader';

interface CoolLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'admin' | 'teacher' | 'student';
}

/** Full-screen FX candle stream — fixed positions, draw-in only. */
export default function CoolLoader({ message = 'Loading...' }: CoolLoaderProps) {
  const candles = useCandlePipeline({ loop: false });

  return (
    <div className="fx-candle-loader" aria-label={message} role="status">
      <span className="fx-candle-loader__sr">{message}</span>
      <CandleStreamFrame candles={candles} />
    </div>
  );
}
