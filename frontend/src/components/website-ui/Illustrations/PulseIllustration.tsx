import React from 'react';
import { IllustrationProps } from '../../../types';

const PulseIllustration: React.FC<IllustrationProps> = ({ className = "" }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    // specific production-ready accessibility tags
    aria-hidden="true" 
  >
    <path 
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" 
      fill="currentColor" // Optimization for flexible styling
    />
  </svg>
);

export default PulseIllustration;