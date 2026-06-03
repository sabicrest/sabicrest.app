/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';

interface VerifiedBadgeProps {
  className?: string;
}

export default function VerifiedBadge({ className = '' }: VerifiedBadgeProps) {
  const [showLabel, setShowLabel] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showLabel) {
      timer = setTimeout(() => {
        setShowLabel(false);
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [showLabel]);

  return (
    <span className={`relative inline-flex items-center select-none shrink-0 ${className}`} style={{ verticalAlign: 'middle' }}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowLabel(prev => !prev);
        }}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-yellow hover:bg-amber-400 active:scale-95 transition-all text-brand-black cursor-pointer shadow-3xs"
        title="Verified Sabicrest Trainer"
      >
        <span className="text-[10px] font-black leading-none text-brand-black">✓</span>
      </button>

      {showLabel && (
        <span className="absolute left-1/2 -translate-x-1/2 top-6 bg-brand-black text-white text-[9px] font-semibold py-1 px-2 rounded-md shadow-lg whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150">
          Verified Mentor
        </span>
      )}
    </span>
  );
}
