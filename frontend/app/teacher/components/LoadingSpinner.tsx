import React from 'react';
import CoolLoader from '../../../components/CoolLoader';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "Loading teacher dashboard..." }: LoadingSpinnerProps) {
  return (
    <CoolLoader 
      message={message}
      size="md"
      variant="teacher"
    />
  );
}
