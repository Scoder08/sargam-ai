import { useState, useEffect } from 'react';

interface RewardPopupProps {
  xp: number;
  gems: number;
  accuracy: number;
  streak?: number;
  levelUp?: boolean;
  newLevel?: number;
  achievement?: { title: string; icon: string } | null;
  onClose: () => void;
}

export default function RewardPopup({
  xp,
  gems,
  accuracy,
  streak,
  levelUp = false,
  newLevel,
  achievement,
  onClose,
}: RewardPopupProps) {
  const [stage, setStage] = useState(0);

  // Animate through stages
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 300),
      setTimeout(() => setStage(2), 800),
      setTimeout(() => setStage(3), 1300),
      setTimeout(() => setStage(4), 1800),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  const getGrade = () => {
    if (accuracy >= 95) return { grade: 'S', color: 'text-yellow-400', message: 'PERFECT!' };
    if (accuracy >= 85) return { grade: 'A', color: 'text-green-400', message: 'Excellent!' };
    if (accuracy >= 70) return { grade: 'B', color: 'text-blue-400', message: 'Good job!' };
    if (accuracy >= 50) return { grade: 'C', color: 'text-orange-400', message: 'Keep practicing!' };
    return { grade: 'D', color: 'text-red-400', message: 'Try again!' };
  };

  const gradeInfo = getGrade();

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-neutral-900 rounded-3xl p-8 max-w-sm w-full mx-4 text-center relative overflow-hidden">
        {/* Confetti effect (CSS animation) */}
        <div className="absolute inset-0 pointer-events-none">
          {accuracy >= 70 && (
            <>
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-confetti"
                  style={{
                    backgroundColor: ['#f59e0b', '#10b981', '#6366f1', '#ec4899'][i % 4],
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${1 + Math.random()}s`,
                  }}
                />
              ))}
            </>
          )}
        </div>

        {/* Stage 1: Grade */}
        <div className={`transition-all duration-500 ${stage >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
          <div className={`text-8xl font-black ${gradeInfo.color} mb-2 animate-bounce-in`}>
            {gradeInfo.grade}
          </div>
          <p className="text-xl text-white font-semibold mb-1">{gradeInfo.message}</p>
          <p className="text-neutral-400">{accuracy}% accuracy</p>
        </div>

        {/* Stage 2: Rewards */}
        <div className={`mt-6 transition-all duration-500 ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <div className="text-3xl mb-1 animate-bounce">⭐</div>
              <div className="text-2xl font-bold text-white">+{xp}</div>
              <div className="text-xs text-neutral-400">XP</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-1 animate-bounce" style={{ animationDelay: '0.1s' }}>💎</div>
              <div className="text-2xl font-bold text-white">+{gems}</div>
              <div className="text-xs text-neutral-400">Gems</div>
            </div>
          </div>
        </div>

        {/* Stage 3: Streak/Level */}
        {stage >= 3 && (streak || levelUp) && (
          <div className="mt-6 animate-slide-up">
            {streak && (
              <div className="bg-orange-500/20 rounded-xl px-4 py-3 mb-3">
                <span className="text-2xl">🔥</span>
                <span className="text-white font-semibold ml-2">{streak} day streak!</span>
              </div>
            )}
            {levelUp && (
              <div className="bg-primary-500/20 rounded-xl px-4 py-3">
                <span className="text-2xl">🎉</span>
                <span className="text-white font-semibold ml-2">Level up! Now level {newLevel}</span>
              </div>
            )}
          </div>
        )}

        {/* Stage 4: Achievement */}
        {stage >= 4 && achievement && (
          <div className="mt-6 animate-slide-up">
            <div className="bg-yellow-500/20 rounded-xl px-4 py-3">
              <span className="text-2xl">{achievement.icon}</span>
              <span className="text-white font-semibold ml-2">{achievement.title}</span>
              <p className="text-xs text-yellow-400 mt-1">Achievement unlocked!</p>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={onClose}
          className={`
            mt-8 w-full py-4 bg-primary-500 hover:bg-primary-600 
            rounded-xl font-semibold text-lg text-white
            transition-all duration-500
            ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
