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
        className="inline-flex items-center justify-center w-4 h-4 active:scale-95 transition-transform cursor-pointer"
        title="Verified Sabicrest Trainer"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 text-brand-yellow fill-current hover:text-amber-400 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.15)] transition-colors"
        >
          {/* 16-pointed star rosette/badge */}
          <path d="M12 2l1.9 2.5 3.1-.6.6 3.1 2.5 1.9-1.3 2.9 1.3 2.9-2.5 1.9-.6 3.1-3.1-.6L12 22l-1.9-2.5-3.1.6-.6-3.1-2.5-1.9 1.3-2.9-1.3-2.9 2.5-1.9.6-3.1 3.1.6z" />
          {/* Vector checkmark tick */}
          <path
            d="M8.5 12.5l2.2 2.2 4.8-4.8"
            fill="none"
            stroke="#0a0a0a"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {showLabel && (
        <span className="absolute left-1/2 -translate-x-1/2 top-6 bg-brand-black text-white text-[9px] font-semibold py-1 px-2 rounded-md shadow-lg whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150">
          Verified Mentor
        </span>
      )}
    </span>
  );
}
