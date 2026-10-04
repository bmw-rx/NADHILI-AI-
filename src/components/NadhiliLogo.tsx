import React from 'react';

interface NadhiliLogoProps {
  size?: number | string;
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

export const NadhiliLogo: React.FC<NadhiliLogoProps> = ({
  size = 32,
  className = '',
  showText = false,
  textClassName = '',
}) => {
  const sizeStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : { width: size, height: size };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div
        style={sizeStyle}
        className="relative shrink-0 flex items-center justify-center rounded-2xl overflow-hidden shadow-[0_0_16px_rgba(218,119,86,0.35)] transition-transform duration-300 hover:scale-105"
      >
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="nl_bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#241b16" />
              <stop offset="50%" stopColor="#181716" />
              <stop offset="100%" stopColor="#0e0d0c" />
            </linearGradient>

            <linearGradient id="nl_primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff8566" />
              <stop offset="45%" stopColor="#da7756" />
              <stop offset="100%" stopColor="#f5a623" />
            </linearGradient>

            <linearGradient id="nl_ribbon" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f5a623" />
              <stop offset="50%" stopColor="#eb947a" />
              <stop offset="100%" stopColor="#cf4f2a" />
            </linearGradient>

            <linearGradient id="nl_border" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#da7756" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#f5a623" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#da7756" stopOpacity="0.7" />
            </linearGradient>

            <radialGradient id="nl_centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#da7756" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#da7756" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient Glow Behind Icon */}
          <circle cx="50" cy="50" r="42" fill="url(#nl_centerGlow)" />

          {/* Squircle Base Frame */}
          <rect
            x="5"
            y="5"
            width="90"
            height="90"
            rx="22"
            fill="url(#nl_bgGrad)"
            stroke="url(#nl_border)"
            strokeWidth="2.5"
          />

          {/* Inner Accent Ring */}
          <rect
            x="8"
            y="8"
            width="84"
            height="84"
            rx="19"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.05"
            strokeWidth="1"
          />

          {/* Left Pillar */}
          <path
            d="M26 71 V30 C26 27.2 28.2 25 31 25 C33.8 25 36 27.2 36 30 V71 C36 73.8 33.8 76 31 76 C28.2 76 26 73.8 26 71 Z"
            fill="url(#nl_primary)"
          />

          {/* Diagonal Neural Stream */}
          <path
            d="M32 27 L68 67 C70 69.2 70 72 67.5 73.5 C65 75 62 74 60 71.8 L24 31.8 C22 29.5 22.5 26.5 25 25 C27.5 23.5 30 24.8 32 27 Z"
            fill="url(#nl_ribbon)"
          />

          {/* Right Pillar */}
          <path
            d="M64 29 C64 26.2 66.2 24 69 24 C71.8 24 74 26.2 74 29 V70 C74 72.8 71.8 75 69 75 C66.2 75 64 72.8 64 70 V29 Z"
            fill="url(#nl_primary)"
          />

          {/* Glowing Central Intelligence Spark / Star */}
          <path
            d="M50 37 L54.5 46.5 L64 50 L54.5 53.5 L50 63 L45.5 53.5 L36 50 L45.5 46.5 Z"
            fill="#ffffff"
          />

          {/* Synaptic Spark Nodes */}
          <circle cx="31" cy="27" r="3.5" fill="#fcd34d" />
          <circle cx="69" cy="73" r="3.5" fill="#fcd34d" />
          <circle cx="50" cy="50" r="2" fill="#ffffff" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight text-white font-sans ${textClassName || 'text-sm'}`}>
            NADHILI <span className="text-[#da7756]">AI</span>
          </span>
          <span className="text-[9px] uppercase tracking-widest text-[#f5a623] font-mono -mt-0.5">
            Intelligence
          </span>
        </div>
      )}
    </div>
  );
};
export default NadhiliLogo;
