import { useState, useEffect } from 'react';

interface RewardModalProps {
  score: number;
  xp: number;
  gems: number;
  combo: number;
  streakDay?: number;
  onClose: () => void;
}

export default function RewardModal({
  score,
  xp,
  gems,
  combo,
  streakDay,
  onClose,
}: RewardModalProps) {
  const [stage, setStage] = useState(0);
  const [displayedXp, setDisplayedXp] = useState(0);

  // Animate through stages
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 200),   // Grade
      setTimeout(() => setStage(2), 600),   // XP counter start
      setTimeout(() => setStage(3), 1500),  // Gems
      setTimeout(() => setStage(4), 2000),  // Streak
      setTimeout(() => setStage(5), 2500),  // Button
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  // Animate XP counter
  useEffect(() => {
    if (stage >= 2) {
      let current = 0;
      const increment = Math.ceil(xp / 30);
      const interval = setInterval(() => {
        current += increment;
        if (current >= xp) {
          setDisplayedXp(xp);
          clearInterval(interval);
        } else {
          setDisplayedXp(current);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [stage, xp]);

  const getGrade = () => {
    if (score >= 95) return { grade: 'S', color: 'text-yellow-400', glow: 'shadow-yellow-400/50', message: 'PERFECT!' };
    if (score >= 85) return { grade: 'A', color: 'text-emerald-400', glow: 'shadow-emerald-400/50', message: 'Excellent!' };
    if (score >= 70) return { grade: 'B', color: 'text-cyan-400', glow: 'shadow-cyan-400/50', message: 'Good job!' };
    if (score >= 50) return { grade: 'C', color: 'text-orange-400', glow: 'shadow-orange-400/50', message: 'Keep practicing!' };
    return { grade: 'D', color: 'text-red-400', glow: 'shadow-red-400/50', message: 'Try again!' };
  };

  const gradeInfo = getGrade();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 animate-fade-in">
      {/* Confetti */}
      {score >= 70 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full animate-confetti"
              style={{
                backgroundColor: ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#06b6d4'][i % 5],
                left: `${10 + Math.random() * 80}%`,
                top: '-10px',
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random()}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="relative max-w-sm w-full mx-4">
        {/* Grade Display */}
        <div className={`
          transition-all duration-500
          ${stage >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}
        `}>
          <div className="text-center mb-8">
            <div className={`
              inline-block text-9xl font-black ${gradeInfo.color}
              animate-bounce-in drop-shadow-lg
            `}>
              {gradeInfo.grade}
            </div>
            <p className="text-2xl font-bold text-white mt-2">{gradeInfo.message}</p>
            <p className="text-white/50">{score}% accuracy</p>
          </div>
        </div>

        {/* Rewards Container */}
        <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
          {/* XP */}
          <div className={`
            flex items-center justify-between py-4 border-b border-white/10
            transition-all duration-500
            ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}>
            <div className="flex items-center gap-3">
              <span className="text-3xl">⭐</span>
              <span className="text-white font-medium">XP Earned</span>
            </div>
            <span className="text-3xl font-black text-yellow-400">
              +{displayedXp}
            </span>
          </div>

          {/* Gems (only if earned) */}
          {gems > 0 && (
            <div className={`
              flex items-center justify-between py-4 border-b border-white/10
              transition-all duration-500
              ${stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">💎</span>
                <span className="text-white font-medium">Gems</span>
              </div>
              <span className="text-3xl font-black text-cyan-400">
                +{gems}
              </span>
            </div>
          )}

          {/* Combo */}
          {combo >= 3 && (
            <div className={`
              flex items-center justify-between py-4 border-b border-white/10
              transition-all duration-500
              ${stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🔥</span>
                <span className="text-white font-medium">Best Combo</span>
              </div>
              <span className="text-3xl font-black text-orange-400">
                {combo}x
              </span>
            </div>
          )}

          {/* Streak */}
          {streakDay && (
            <div className={`
              flex items-center justify-between py-4
              transition-all duration-500
              ${stage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">📅</span>
                <span className="text-white font-medium">Streak</span>
              </div>
              <span className="text-2xl font-bold text-orange-400">
                Day {streakDay} 🔥
              </span>
            </div>
          )}
        </div>

        {/* Continue Button */}
        <div className={`
          mt-6 transition-all duration-500
          ${stage >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}>
          <button
            onClick={onClose}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl text-white font-bold text-lg hover:opacity-90 transition-opacity active:scale-[0.98]"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
