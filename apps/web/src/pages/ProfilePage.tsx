import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, useGamificationStats, useAchievements, useLogoutMutation } from '@sargam/api';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stats' | 'achievements' | 'settings'>('stats');

  const { data: user, isLoading: userLoading } = useUser();
  const { data: stats, isLoading: statsLoading } = useGamificationStats();
  const { data: achievements } = useAchievements();
  const logoutMutation = useLogoutMutation();

  const isLoading = userLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading profile...</p>
        </div>
      </div>
    );
  }

  const userName = user?.name || 'Student';
  const userPhone = user?.phone || '';
  const level = stats?.level || 1;
  const totalXp = stats?.totalXp || 0;
  const xpForNextLevel = stats?.xpForNextLevel || 100;
  const currentStreak = stats?.currentStreak || 0;
  const longestStreak = stats?.longestStreak || 0;
  const gems = stats?.gems || 0;
  const totalPracticeMinutes = user?.totalPracticeMinutes || 0;
  const lessonsCompleted = stats?.totalLessonsCompleted || user?.lessonsCompleted || 0;
  const songsLearned = stats?.totalSongsLearned || user?.songsLearned || 0;
  const isPremium = user?.isPremium || false;

  // Calculate level progress
  const xpInCurrentLevel = totalXp % 100;
  const levelProgress = (xpInCurrentLevel / 100) * 100;

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-6 text-white mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">{userName}</h1>
              <p className="text-white/70 text-sm">{userPhone}</p>
            </div>
          </div>

          {/* Level Progress */}
          <div className="bg-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Level {level}</span>
              <span className="text-sm text-white/70">{totalXp} XP</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all" style={{ width: `${levelProgress}%` }} />
            </div>
            <p className="text-xs text-white/70 mt-1">
              {xpForNextLevel - xpInCurrentLevel} XP to level {level + 1}
            </p>
          </div>

          {/* Premium Badge */}
          {!isPremium && (
            <button className="mt-4 w-full bg-yellow-400 text-yellow-900 rounded-xl p-3 text-center font-semibold hover:bg-yellow-300 transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Upgrade to Premium
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['stats', 'achievements', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-orange-500 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'stats' && (
          <StatsTab
            totalPracticeMinutes={totalPracticeMinutes}
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            lessonsCompleted={lessonsCompleted}
            songsLearned={songsLearned}
            gems={gems}
          />
        )}
        {activeTab === 'achievements' && <AchievementsTab achievements={achievements || []} />}
        {activeTab === 'settings' && <SettingsTab onLogout={handleLogout} />}
      </div>
    </div>
  );
}

interface StatsTabProps {
  totalPracticeMinutes: number;
  currentStreak: number;
  longestStreak: number;
  lessonsCompleted: number;
  songsLearned: number;
  gems: number;
}

function StatsTab({ totalPracticeMinutes, currentStreak, longestStreak, lessonsCompleted, songsLearned, gems }: StatsTabProps) {
  const hours = Math.floor(totalPracticeMinutes / 60);
  const minutes = totalPracticeMinutes % 60;

  const stats = [
    {
      label: 'Total Practice',
      value: `${hours}h ${minutes}m`,
      icon: (
        <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      label: 'Current Streak',
      value: `${currentStreak} days`,
      icon: <span className="text-2xl">🔥</span>
    },
    {
      label: 'Longest Streak',
      value: `${longestStreak} days`,
      icon: (
        <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      label: 'Lessons Completed',
      value: lessonsCompleted.toString(),
      icon: (
        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      label: 'Songs Learned',
      value: songsLearned.toString(),
      icon: (
        <svg className="w-6 h-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      )
    },
    {
      label: 'Gems Earned',
      value: gems.toString(),
      icon: (
        <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd" />
        </svg>
      )
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="mb-2">{stat.icon}</div>
          <p className="text-2xl font-bold text-white">{stat.value}</p>
          <p className="text-sm text-white/50">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

interface Achievement {
  id: string;
  title: string;
  icon: string;
  unlocked: boolean;
}

function AchievementsTab({ achievements }: { achievements: Achievement[] }) {
  const unlocked = achievements.filter((a) => a.unlocked);
  const locked = achievements.filter((a) => !a.unlocked);

  return (
    <div>
      <p className="text-sm text-white/50 mb-4">
        {unlocked.length} of {achievements.length} achievements unlocked
      </p>

      {unlocked.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {unlocked.map((ach) => (
            <div
              key={ach.id}
              className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-3 text-center"
            >
              <span className="text-2xl block mb-1">{ach.icon}</span>
              <p className="text-xs font-medium text-white truncate">{ach.title}</p>
            </div>
          ))}
        </div>
      )}

      {locked.length > 0 && (
        <>
          <h3 className="font-semibold text-white mb-3">Locked</h3>
          <div className="grid grid-cols-4 gap-3">
            {locked.map((ach) => (
              <div
                key={ach.id}
                className="bg-white/5 border border-white/10 rounded-xl p-3 text-center opacity-50"
              >
                <span className="text-2xl block mb-1">🔒</span>
                <p className="text-xs font-medium text-white/50 truncate">{ach.title}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {achievements.length === 0 && (
        <div className="text-center py-8">
          <span className="text-4xl block mb-4">🏆</span>
          <p className="text-white/50">Complete lessons and songs to earn achievements!</p>
        </div>
      )}
    </div>
  );
}

function SettingsTab({ onLogout }: { onLogout: () => void }) {
  const [dailyGoal, setDailyGoal] = useState(15);
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  return (
    <div className="space-y-4">
      {/* Daily Goal */}
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-white">Daily Goal</span>
          <span className="text-orange-400 font-semibold">{dailyGoal} min</span>
        </div>
        <input
          type="range"
          min="5"
          max="60"
          step="5"
          value={dailyGoal}
          onChange={(e) => setDailyGoal(Number(e.target.value))}
          className="w-full accent-orange-500"
        />
        <div className="flex justify-between text-xs text-white/40 mt-1">
          <span>5 min</span>
          <span>60 min</span>
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-white/5 rounded-xl border border-white/10 divide-y divide-white/10">
        <ToggleSetting
          label="Push Notifications"
          description="Daily reminders to practice"
          enabled={notifications}
          onToggle={() => setNotifications(!notifications)}
        />
        <ToggleSetting
          label="Sound Effects"
          description="Play sounds during practice"
          enabled={soundEffects}
          onToggle={() => setSoundEffects(!soundEffects)}
        />
      </div>

      {/* Account Actions */}
      <div className="bg-white/5 rounded-xl border border-white/10 divide-y divide-white/10">
        <button className="w-full p-4 text-left hover:bg-white/5 transition-colors">
          <p className="font-medium text-white">Change Password</p>
        </button>
        <button
          onClick={onLogout}
          className="w-full p-4 text-left hover:bg-white/5 transition-colors"
        >
          <p className="font-medium text-red-400">Log Out</p>
        </button>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  enabled,
  onToggle,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full p-4 flex items-center justify-between text-left"
    >
      <div>
        <p className="font-medium text-white">{label}</p>
        <p className="text-sm text-white/50">{description}</p>
      </div>
      <div
        className={`w-12 h-7 rounded-full p-1 transition-colors ${
          enabled ? 'bg-orange-500' : 'bg-white/20'
        }`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  );
}
