'use client';

import { useRef, type ReactNode } from 'react';

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  depth?: number;
};

export default function TiltCard({ children, className = '', depth = 10 }: TiltCardProps) {
  const innerRef = useRef<HTMLDivElement>(null);

  const handleMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const el = innerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;

    el.style.transform = `rotateX(${(-y * depth).toFixed(2)}deg) rotateY(${(x * depth).toFixed(2)}deg) translateZ(8px)`;
  };

  const handleLeave = () => {
    const el = innerRef.current;
    if (!el) return;
    el.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0)';
  };

  return (
    <div className={`mkt-tilt ${className}`.trim()} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <div ref={innerRef} className="mkt-tilt__inner">
        {children}
      </div>
    </div>
  );
}
