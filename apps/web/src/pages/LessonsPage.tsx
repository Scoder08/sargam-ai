import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLessonModules } from '@sargam/api';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';

export default function LessonsPage() {
  const { data: modules, isLoading, error } = useLessonModules();
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MenuBookRoundedIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.5)' }} />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Failed to load lessons</h1>
          <p className="text-white/50">Please try again later</p>
        </div>
      </div>
    );
  }

  const totalLessons = modules?.reduce((acc, m) => acc + (m.lessonsCount || 0), 0) || 0;
  const completedLessons = 2; // Simulated progress

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a] border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <h1 className="text-xl font-bold text-white">Learn</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Progress Overview */}
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-5 mb-6 border border-purple-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <MenuBookRoundedIcon sx={{ fontSize: 24, color: 'white' }} />
            </div>
            <div className="flex-1">
              <span className="font-semibold text-white">Your Progress</span>
              <p className="text-sm text-white/60">{completedLessons}/{totalLessons} lessons</p>
            </div>
            <span className="text-2xl font-bold text-purple-400">
              {totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0}%
            </span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
              style={{ width: `${totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Modules */}
        <div className="space-y-3">
          {modules?.map((module, index) => (
            <ModuleCard
              key={module.id}
              module={module}
              isExpanded={expandedModule === module.id}
              onToggle={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
              moduleIndex={index}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

interface ModuleType {
  id: number;
  title: string;
  titleHindi?: string;
  description?: string;
  lessonsCount: number;
  lessons?: Array<{
    id: number;
    title: string;
    durationMinutes?: number;
  }>;
}

const MODULE_COLORS = [
  { bg: 'from-orange-500 to-pink-500', shadow: 'shadow-orange-500/20' },
  { bg: 'from-purple-500 to-indigo-500', shadow: 'shadow-purple-500/20' },
  { bg: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/20' },
  { bg: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20' },
  { bg: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
  { bg: 'from-rose-500 to-pink-500', shadow: 'shadow-rose-500/20' },
];

function ModuleCard({
  module,
  isExpanded,
  onToggle,
  moduleIndex,
}: {
  module: ModuleType;
  isExpanded: boolean;
  onToggle: () => void;
  moduleIndex: number;
}) {
  const completedCount = moduleIndex === 0 ? 2 : 0; // Simulated progress
  const progress = module.lessonsCount > 0
    ? Math.round((completedCount / module.lessonsCount) * 100)
    : 0;
  const colorStyle = MODULE_COLORS[moduleIndex % MODULE_COLORS.length];

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all ${
      progress === 100
        ? 'bg-emerald-500/10 border-emerald-500/20'
        : 'bg-white/5 border-white/10'
    }`}>
      {/* Module Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${
          progress === 100
            ? 'from-emerald-500 to-emerald-600'
            : progress > 0
              ? colorStyle.bg
              : 'from-white/10 to-white/5'
        } ${progress > 0 ? `shadow-lg ${colorStyle.shadow}` : ''}`}>
          {progress === 100 ? (
            <CheckRoundedIcon sx={{ fontSize: 28, color: 'white' }} />
          ) : (
            <MenuBookRoundedIcon sx={{ fontSize: 24, color: progress > 0 ? 'white' : 'rgba(255,255,255,0.5)' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white">{module.title}</p>
          <p className="text-sm text-white/40">{module.lessonsCount} lessons</p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress === 100 ? 'bg-emerald-500' : `bg-gradient-to-r ${colorStyle.bg}`
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-white/40 w-10 text-right">
              {completedCount}/{module.lessonsCount}
            </span>
          </div>
        </div>
        <ExpandMoreRoundedIcon
          sx={{
            fontSize: 24,
            color: 'rgba(255,255,255,0.4)',
            transition: 'transform 0.2s',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
        />
      </button>

      {/* Lessons List */}
      {isExpanded && module.lessons && module.lessons.length > 0 && (
        <div className="border-t border-white/5 bg-black/20">
          {module.lessons.map((lesson, index) => {
            const isCompleted = moduleIndex === 0 && index < 2; // Simulated
            const isLocked = moduleIndex > 0 || index > 2;

            return (
              <Link
                key={lesson.id}
                to={isLocked ? '#' : `/lessons/${lesson.id}`}
                onClick={(e) => isLocked && e.preventDefault()}
                className={`flex items-center gap-4 px-4 py-3 transition-colors ${
                  index < module.lessons!.length - 1 ? 'border-b border-white/5' : ''
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isLocked
                      ? 'bg-white/5 text-white/30'
                      : 'bg-white/10 text-white/60'
                }`}>
                  {isCompleted ? (
                    <CheckRoundedIcon sx={{ fontSize: 16 }} />
                  ) : isLocked ? (
                    <LockRoundedIcon sx={{ fontSize: 14 }} />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${
                    isCompleted ? 'text-white/50' : isLocked ? 'text-white/30' : 'text-white'
                  }`}>
                    {lesson.title}
                  </p>
                  {lesson.durationMinutes && (
                    <p className="text-xs text-white/30 flex items-center gap-1">
                      <AccessTimeRoundedIcon sx={{ fontSize: 12 }} />
                      {lesson.durationMinutes} min
                    </p>
                  )}
                </div>
                {!isCompleted && !isLocked && (
                  <PlayArrowRoundedIcon sx={{ fontSize: 18, color: '#f97316' }} />
                )}
                {isCompleted && (
                  <span className="text-emerald-400 text-xs font-medium">+50 XP</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
