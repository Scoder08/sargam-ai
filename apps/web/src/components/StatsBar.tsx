import { useState } from 'react';
import { Link } from 'react-router-dom';

// Mock data - will connect to API later
const mockStats = {
  streak: 12,
  gems: 450,
  xp: 1250,
  level: 7,
  dailyGoal: 15,
  todayMinutes: 8,
};

export default function StatsBar() {
  const [showStreakTooltip, setShowStreakTooltip] = useState(false);

  const stats = mockStats;
  const goalProgress = Math.min((stats.todayMinutes / stats.dailyGoal) * 100, 100);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
      <div className="h-14 px-4 flex items-center justify-between max-w-4xl mx-auto">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🎹</span>
          <span className="font-semibold text-lg text-neutral-900 hidden sm:block">
            Sargam
          </span>
        </Link>

        {/* Stats */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Daily Goal Progress (Mobile: hidden, Desktop: shown) */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${goalProgress}%` }}
              />
            </div>
            <span className="text-xs text-neutral-600">
              {stats.todayMinutes}/{stats.dailyGoal}m
            </span>
          </div>

          {/* Streak */}
          <button
            className="relative flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-neutral-100 transition-colors"
            onMouseEnter={() => setShowStreakTooltip(true)}
            onMouseLeave={() => setShowStreakTooltip(false)}
          >
            <span className="text-lg">🔥</span>
            <span className="font-semibold text-neutral-900">{stats.streak}</span>

            {/* Tooltip */}
            {showStreakTooltip && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap animate-fade-in">
                {stats.streak} day streak!
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-neutral-900 rotate-45" />
              </div>
            )}
          </button>

          {/* Gems */}
          <Link
            to="/shop"
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <span className="text-lg">💎</span>
            <span className="font-semibold text-neutral-900">{stats.gems}</span>
          </Link>

          {/* XP & Level */}
          <div className="flex items-center gap-1.5 px-2 py-1">
            <span className="text-lg">⭐</span>
            <div className="flex flex-col items-end">
              <span className="font-semibold text-neutral-900 text-sm leading-none">
                {stats.xp.toLocaleString()}
              </span>
              <span className="text-[10px] text-neutral-500 leading-none">
                Lv. {stats.level}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
