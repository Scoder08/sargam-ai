interface MascotProps {
  mood?: 'happy' | 'excited' | 'encouraging' | 'sleeping' | 'thinking';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
}

// Melody - A cute musical note mascot for Sargam
export default function Mascot({
  mood = 'happy',
  size = 'md',
  className = '',
  animate = true
}: MascotProps) {
  const sizeMap = {
    sm: 40,
    md: 64,
    lg: 96,
    xl: 128
  };

  const s = sizeMap[size];

  // Eye expressions based on mood
  const getEyes = () => {
    switch (mood) {
      case 'excited':
        return (
          <>
            <ellipse cx="35" cy="52" rx="6" ry="8" fill="#1a1a1a" />
            <ellipse cx="55" cy="52" rx="6" ry="8" fill="#1a1a1a" />
            <circle cx="37" cy="50" r="2" fill="white" />
            <circle cx="57" cy="50" r="2" fill="white" />
          </>
        );
      case 'encouraging':
        return (
          <>
            <ellipse cx="35" cy="52" rx="5" ry="6" fill="#1a1a1a" />
            <ellipse cx="55" cy="52" rx="5" ry="6" fill="#1a1a1a" />
            <circle cx="36" cy="51" r="1.5" fill="white" />
            <circle cx="56" cy="51" r="1.5" fill="white" />
            {/* Wink */}
            <path d="M52 54 Q55 56 58 54" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        );
      case 'sleeping':
        return (
          <>
            <path d="M30 52 Q35 50 40 52" stroke="#1a1a1a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M50 52 Q55 50 60 52" stroke="#1a1a1a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
      case 'thinking':
        return (
          <>
            <circle cx="35" cy="52" r="5" fill="#1a1a1a" />
            <circle cx="55" cy="52" r="5" fill="#1a1a1a" />
            <circle cx="36" cy="51" r="1.5" fill="white" />
            <circle cx="56" cy="51" r="1.5" fill="white" />
            {/* Looking up */}
            <circle cx="37" cy="49" r="1" fill="white" opacity="0.5" />
            <circle cx="57" cy="49" r="1" fill="white" opacity="0.5" />
          </>
        );
      default: // happy
        return (
          <>
            <circle cx="35" cy="52" r="5" fill="#1a1a1a" />
            <circle cx="55" cy="52" r="5" fill="#1a1a1a" />
            <circle cx="36" cy="51" r="1.5" fill="white" />
            <circle cx="56" cy="51" r="1.5" fill="white" />
          </>
        );
    }
  };

  // Mouth based on mood
  const getMouth = () => {
    switch (mood) {
      case 'excited':
        return <ellipse cx="45" cy="64" rx="8" ry="5" fill="#1a1a1a" />;
      case 'encouraging':
        return <path d="M38 62 Q45 70 52 62" stroke="#1a1a1a" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
      case 'sleeping':
        return <ellipse cx="45" cy="64" rx="3" ry="2" fill="#1a1a1a" />;
      case 'thinking':
        return <circle cx="50" cy="64" r="3" fill="#1a1a1a" />;
      default:
        return <path d="M38 62 Q45 68 52 62" stroke="#1a1a1a" strokeWidth="2.5" fill="none" strokeLinecap="round" />;
    }
  };

  // Cheeks (blush)
  const getCheeks = () => {
    if (mood === 'sleeping') return null;
    return (
      <>
        <ellipse cx="26" cy="58" rx="5" ry="3" fill="#ff9e9e" opacity="0.6" />
        <ellipse cx="64" cy="58" rx="5" ry="3" fill="#ff9e9e" opacity="0.6" />
      </>
    );
  };

  return (
    <div
      className={`inline-block ${animate ? 'animate-bounce-gentle' : ''} ${className}`}
      style={{ width: s, height: s * 1.2 }}
    >
      <svg
        viewBox="0 0 90 110"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Note stem */}
        <rect
          x="68"
          y="8"
          width="6"
          height="55"
          rx="3"
          fill="url(#stemGradient)"
        />

        {/* Flag */}
        <path
          d="M74 8 Q90 20 74 35 Q85 28 74 20 Q82 15 74 8"
          fill="url(#flagGradient)"
        />

        {/* Note head (face) */}
        <ellipse
          cx="45"
          cy="55"
          rx="35"
          ry="28"
          fill="url(#headGradient)"
          className={animate && mood === 'excited' ? 'animate-wiggle' : ''}
        />

        {/* Highlight */}
        <ellipse
          cx="32"
          cy="42"
          rx="12"
          ry="8"
          fill="white"
          opacity="0.15"
          transform="rotate(-20 32 42)"
        />

        {/* Eyes */}
        {getEyes()}

        {/* Eyebrows for excited/encouraging */}
        {(mood === 'excited' || mood === 'encouraging') && (
          <>
            <path d="M28 44 Q35 40 42 44" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M48 44 Q55 40 62 44" stroke="#1a1a1a" strokeWidth="2" fill="none" strokeLinecap="round" />
          </>
        )}

        {/* Cheeks */}
        {getCheeks()}

        {/* Mouth */}
        {getMouth()}

        {/* Z's for sleeping */}
        {mood === 'sleeping' && (
          <g className="animate-float">
            <text x="70" y="35" fill="#f97316" fontSize="12" fontWeight="bold">z</text>
            <text x="78" y="25" fill="#f97316" fontSize="10" fontWeight="bold">z</text>
            <text x="84" y="18" fill="#f97316" fontSize="8" fontWeight="bold">z</text>
          </g>
        )}

        {/* Thought bubble for thinking */}
        {mood === 'thinking' && (
          <g>
            <circle cx="80" cy="25" r="3" fill="#fff" opacity="0.6" />
            <circle cx="85" cy="18" r="2" fill="#fff" opacity="0.5" />
            <circle cx="88" cy="12" r="1.5" fill="#fff" opacity="0.4" />
          </g>
        )}

        {/* Gradients */}
        <defs>
          <linearGradient id="headGradient" x1="10" y1="30" x2="80" y2="80">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="stemGradient" x1="68" y1="8" x2="74" y2="63">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#db2777" />
          </linearGradient>
          <linearGradient id="flagGradient" x1="74" y1="8" x2="90" y2="35">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
        </defs>
      </svg>

      <style>{`
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        @keyframes float {
          0%, 100% { opacity: 0.4; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
        .animate-bounce-gentle {
          animation: bounce-gentle 2s ease-in-out infinite;
        }
        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out infinite;
        }
        .animate-float {
          animation: float 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
