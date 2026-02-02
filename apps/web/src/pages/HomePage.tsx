import { Link, useNavigate } from 'react-router-dom';
import { useUser, useGamificationStats, useDailyGoal, useSongs, getAuthToken } from '@sargam/api';
import { useEffect, useState } from 'react';
import LocalFireDepartmentRoundedIcon from '@mui/icons-material/LocalFireDepartmentRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PianoRoundedIcon from '@mui/icons-material/PianoRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import Mascot from '../components/Mascot';

export default function HomePage() {
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useUser();
  const { data: stats, isLoading: statsLoading } = useGamificationStats();
  const { data: dailyGoal, isLoading: goalLoading } = useDailyGoal();
  const { data: songs } = useSongs();
  const [showStreakCelebration, setShowStreakCelebration] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/login');
    }
  }, [navigate]);

  // Show streak celebration on load if streak > 0
  useEffect(() => {
    if (stats?.currentStreak && stats.currentStreak > 0) {
      setShowStreakCelebration(true);
      const timer = setTimeout(() => setShowStreakCelebration(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [stats?.currentStreak]);

  const isLoading = userLoading || statsLoading || goalLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userName = user?.name?.split(' ')[0] || 'there';
  const streak = stats?.currentStreak || 0;
  const gems = stats?.gems || 0;
  const level = stats?.level || 1;
  const totalXp = stats?.totalXp || 0;
  const todayMinutes = dailyGoal?.todayMinutes || 0;
  const goalMinutes = dailyGoal?.goalMinutes || 15;
  const goalComplete = dailyGoal?.goalReached || false;
  const goalProgress = Math.min((todayMinutes / goalMinutes) * 100, 100);

  // Get songs with tutorials
  const songsWithTutorials = songs?.filter(s => s.hasTutorial) || [];
  const continueSong = songsWithTutorials[0];

  // Learning path
  const learningPath = [
    { id: '1', type: 'lesson', title: 'Your First Notes', completed: true, xp: 50 },
    { id: '2', type: 'lesson', title: 'C Major Scale', completed: true, xp: 50 },
    ...songsWithTutorials.slice(0, 3).map((song, i) => ({
      id: `song-${song.id}`,
      type: 'song',
      title: song.title,
      completed: false,
      current: i === 0,
      locked: i > 0,
      xp: 100,
      songId: song.id,
    })),
    { id: '3', type: 'lesson', title: 'Reading Sheet Music', completed: false, locked: true, xp: 75 },
  ];

  // Determine mascot mood based on state
  const getMascotMood = () => {
    if (goalComplete) return 'excited';
    if (streak >= 7) return 'encouraging';
    if (todayMinutes === 0) return 'thinking';
    return 'happy';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Streak Celebration Overlay */}
      {showStreakCelebration && streak > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 animate-fade-in">
          <div className="text-center animate-bounce-in">
            <Mascot mood="excited" size="xl" />
            <p className="text-5xl font-black text-orange-500 mt-4">{streak}</p>
            <p className="text-xl text-white/80">Day Streak!</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a] border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center">
              <MusicNoteRoundedIcon sx={{ fontSize: 18, color: 'white' }} />
            </div>
            <span className="font-bold text-white text-lg">Sargam</span>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-2">
            {/* Streak */}
            <button
              onClick={() => setShowStreakCelebration(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <LocalFireDepartmentRoundedIcon sx={{ fontSize: 20, color: '#f97316' }} />
              <span className="font-bold text-white text-sm">{streak}</span>
            </button>

            {/* Gems */}
            <Link
              to="/shop"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <DiamondRoundedIcon sx={{ fontSize: 18, color: '#22d3ee' }} />
              <span className="font-bold text-white text-sm">{gems}</span>
            </Link>

            {/* Level */}
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
              <span className="text-xs font-bold text-purple-400">Lv</span>
              <span className="font-bold text-white text-sm">{level}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6">
        {/* Greeting with Mascot */}
        <div className="flex items-center gap-4 mb-6">
          <Mascot mood={getMascotMood()} size="md" />
          <div>
            <h1 className="text-2xl font-bold text-white">
              Hey {userName}!
            </h1>
            <p className="text-white/60 text-sm">
              {goalComplete ? 'Amazing work today!' :
               todayMinutes > 0 ? 'Keep it up!' :
               "Let's make some music!"}
            </p>
          </div>
        </div>

        {/* Daily Goal Card */}
        <div className={`rounded-2xl p-4 mb-6 ${
          goalComplete
            ? 'bg-emerald-500/10 border border-emerald-500/30'
            : 'bg-white/5 border border-white/10'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                goalComplete ? 'bg-emerald-500' : 'bg-orange-500/20'
              }`}>
                {goalComplete ? (
                  <CheckRoundedIcon sx={{ fontSize: 18, color: 'white' }} />
                ) : (
                  <EmojiEventsRoundedIcon sx={{ fontSize: 18, color: '#f97316' }} />
                )}
              </div>
              <span className="font-medium text-white">Daily Goal</span>
            </div>
            <span className={`font-bold ${goalComplete ? 'text-emerald-400' : 'text-white'}`}>
              {todayMinutes}/{goalMinutes} min
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                goalComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-orange-500 to-pink-500'
              }`}
              style={{ width: `${goalProgress}%` }}
            />
          </div>
          {goalComplete && (
            <p className="text-sm text-emerald-400 mt-2 font-medium">
              +20 XP bonus earned!
            </p>
          )}
        </div>

        {/* Primary CTA */}
        {continueSong && (
          <Link to={`/practice/${continueSong.id}`} className="block mb-6">
            <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-5 shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 transition-all active:scale-[0.98]">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
              <div className="absolute -right-4 -bottom-12 w-24 h-24 bg-white/10 rounded-full" />

              <div className="relative">
                <p className="text-white/80 text-sm mb-1">Continue</p>
                <p className="text-white font-bold text-lg mb-1">{continueSong.title}</p>
                <p className="text-white/70 text-sm mb-4">{continueSong.artist}</p>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                    <PlayArrowRoundedIcon sx={{ fontSize: 24, color: '#f97316' }} />
                  </div>
                  <span className="text-white font-semibold">Start Practice</span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Streak Card */}
        <div className="bg-gradient-to-br from-orange-500/10 via-transparent to-amber-500/10 rounded-2xl p-4 mb-6 border border-orange-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center">
                <LocalFireDepartmentRoundedIcon sx={{ fontSize: 28, color: 'white' }} />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{streak}</p>
                <p className="text-white/60 text-sm">day streak</p>
              </div>
            </div>

            {/* Weekly dots */}
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <div
                  key={day}
                  className={`w-2.5 h-2.5 rounded-full ${
                    day < (streak % 7) || (streak >= 7 && day === 6)
                      ? 'bg-orange-500'
                      : 'bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>
          {streak > 0 && (
            <p className="text-orange-400/80 text-sm mt-3">
              {7 - (streak % 7)} days to weekly chest!
            </p>
          )}
        </div>

        {/* XP Progress */}
        <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/60 text-sm">Level {level} Progress</span>
            <span className="text-purple-400 font-medium text-sm">{totalXp} XP</span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              style={{ width: `${(totalXp % 100)}%` }}
            />
          </div>
          <p className="text-white/40 text-xs mt-2">
            {100 - (totalXp % 100)} XP to Level {level + 1}
          </p>
        </div>

        {/* Learning Path */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Your Path</h2>
          <div className="space-y-3">
            {learningPath.map((item, index) => (
              <PathNode key={item.id} item={item} index={index} />
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/play"
            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <PianoRoundedIcon sx={{ fontSize: 22, color: '#f97316' }} />
            </div>
            <p className="text-white font-medium">Free Play</p>
            <p className="text-white/40 text-xs">Just jam</p>
          </Link>
          <Link
            to="/songs"
            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-colors group"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <LibraryMusicRoundedIcon sx={{ fontSize: 22, color: '#22d3ee' }} />
            </div>
            <p className="text-white font-medium">All Songs</p>
            <p className="text-white/40 text-xs">Browse library</p>
          </Link>
        </div>
      </main>

      {/* Animation styles */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

interface PathNodeItem {
  id: string;
  type: string;
  title: string;
  completed?: boolean;
  current?: boolean;
  locked?: boolean;
  xp: number;
  songId?: number;
}

function PathNode({ item }: { item: PathNodeItem; index: number }) {
  const isComplete = item.completed;
  const isCurrent = item.current;
  const isLocked = item.locked;

  const linkTo = isLocked
    ? '#'
    : item.type === 'song' && item.songId
      ? `/practice/${item.songId}`
      : `/lessons/${item.id}`;

  return (
    <Link
      to={linkTo}
      className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
        isLocked
          ? 'bg-white/5 opacity-40 cursor-not-allowed'
          : isCurrent
            ? 'bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-2 border-orange-500/50 shadow-lg shadow-orange-500/10'
            : isComplete
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
      }`}
      onClick={(e) => isLocked && e.preventDefault()}
    >
      {/* Node Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isComplete
          ? 'bg-emerald-500'
          : isCurrent
            ? 'bg-gradient-to-br from-orange-500 to-pink-500'
            : 'bg-white/10'
      }`}>
        {isComplete && <CheckRoundedIcon sx={{ fontSize: 20, color: 'white' }} />}
        {isCurrent && <PlayArrowRoundedIcon sx={{ fontSize: 20, color: 'white' }} />}
        {isLocked && <LockRoundedIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.5)' }} />}
        {!isComplete && !isCurrent && !isLocked && (
          item.type === 'song'
            ? <MusicNoteRoundedIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
            : <MenuBookRoundedIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${
          isLocked ? 'text-white/40' : 'text-white'
        }`}>
          {item.title}
        </p>
        <p className="text-white/40 text-sm">
          {item.type === 'song' ? 'Song' : 'Lesson'} · +{item.xp} XP
        </p>
      </div>

      {/* Arrow */}
      {!isLocked && (
        <ArrowForwardRoundedIcon sx={{ fontSize: 18, color: 'rgba(255,255,255,0.3)' }} />
      )}
    </Link>
  );
}
