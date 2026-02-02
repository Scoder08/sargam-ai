import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSongs, useGamificationStats, useMyCreations, useUnlockedSongs, useUnlockSongMutation } from '@sargam/api';
import type { Song } from '@sargam/types';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LockOpenRoundedIcon from '@mui/icons-material/LockOpenRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';

const difficulties = ['All', 'beginner', 'intermediate', 'advanced'];

// Cost per difficulty level
const SONG_COSTS: Record<string, number> = {
  beginner: 100,
  intermediate: 200,
  advanced: 300,
};

// Difficulty colors
const DIFFICULTY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  beginner: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  intermediate: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  advanced: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

export default function SongsPage() {
  const [filter, setFilter] = useState('All');
  const [showUnlock, setShowUnlock] = useState<Song | null>(null);

  const { data: songsData, isLoading, error } = useSongs();
  const { data: gamification, refetch: refetchGamification } = useGamificationStats();
  const { data: myCreations } = useMyCreations();
  const { data: unlockedData, refetch: refetchUnlocked } = useUnlockedSongs();

  const songs = songsData || [];
  const userGems = gamification?.gems || 0;
  const userCreatedSongs = myCreations || [];
  const unlockedIds = new Set(unlockedData?.unlockedIds || []);

  // Filter out user-created songs from the main list
  const officialSongs = songs.filter(s => !s.createdByUserId);
  const filtered = officialSongs.filter(s =>
    filter === 'All' || s.difficulty.toLowerCase() === filter.toLowerCase()
  );

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
            <MusicNoteRoundedIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.5)' }} />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Failed to load songs</h1>
          <p className="text-white/50">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a] border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Songs</h1>
          <Link to="/shop" className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 rounded-full hover:bg-cyan-500/20 transition-colors">
            <DiamondRoundedIcon sx={{ fontSize: 18, color: '#22d3ee' }} />
            <span className="font-bold text-cyan-400">{userGems}</span>
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* My Tutorials Section */}
        {userCreatedSongs.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PersonRoundedIcon sx={{ fontSize: 20, color: '#a78bfa' }} />
                <h2 className="text-lg font-bold text-white">My Tutorials</h2>
                <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">
                  {userCreatedSongs.length}
                </span>
              </div>
              <Link
                to="/create-song"
                className="flex items-center gap-1 px-3 py-1.5 bg-violet-500/20 text-violet-400 rounded-full hover:bg-violet-500/30 transition-colors text-sm font-medium"
              >
                <AddRoundedIcon sx={{ fontSize: 16 }} />
                Create
              </Link>
            </div>
            <div className="space-y-3">
              {userCreatedSongs.map((song, index) => (
                <SongCard
                  key={song.id}
                  song={song}
                  index={index}
                  onUnlock={() => setShowUnlock(song)}
                  isUserCreated
                />
              ))}
            </div>
          </div>
        )}

        {/* Create Tutorial CTA (when no creations) */}
        {userCreatedSongs.length === 0 && (
          <Link
            to="/create-song"
            className="flex items-center gap-4 p-4 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-2xl border border-violet-500/20 hover:border-violet-500/40 transition-all mb-6"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
              <AddRoundedIcon sx={{ fontSize: 24, color: 'white' }} />
            </div>
            <div className="flex-1">
              <p className="font-medium text-white">Create Your Own Tutorial</p>
              <p className="text-sm text-white/50">Upload a song and start learning</p>
            </div>
          </Link>
        )}

        {/* Section divider */}
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold text-white">All Songs</h2>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {difficulties.map(d => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filter === d
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white scale-105'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
            >
              {d === 'All' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        {/* Songs List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MusicNoteRoundedIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.3)' }} />
              </div>
              <p className="text-white/50">No songs found</p>
            </div>
          ) : (
            filtered.map((song, index) => (
              <SongCard
                key={song.id}
                song={song}
                index={index}
                onUnlock={() => setShowUnlock(song)}
                isUnlocked={unlockedIds.has(song.id)}
              />
            ))
          )}
        </div>
      </main>

      {/* Unlock Modal */}
      {showUnlock && (
        <UnlockModal
          song={showUnlock}
          userGems={userGems}
          onClose={() => setShowUnlock(null)}
          onSuccess={() => {
            refetchUnlocked();
            refetchGamification();
            setShowUnlock(null);
          }}
        />
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

function SongCard({ song, index, onUnlock, isUserCreated, isUnlocked }: { song: Song; index: number; onUnlock: () => void; isUserCreated?: boolean; isUnlocked?: boolean }) {
  // Song is accessible if it's free OR user has unlocked it
  const isLocked = !song.isFree && !isUnlocked;
  const cost = SONG_COSTS[song.difficulty] || 150;
  const difficultyStyle = DIFFICULTY_COLORS[song.difficulty] || DIFFICULTY_COLORS.beginner;

  if (isLocked) {
    return (
      <button
        onClick={onUnlock}
        className="w-full flex items-center gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-left group"
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform">
          <LockRoundedIcon sx={{ fontSize: 24, color: 'rgba(255,255,255,0.4)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white/50 truncate">{song.title}</p>
          <p className="text-sm text-white/30 truncate">{song.artist}</p>
        </div>
        <div className="flex items-center gap-1 bg-cyan-500/20 px-3 py-1.5 rounded-full">
          <DiamondRoundedIcon sx={{ fontSize: 16, color: '#22d3ee' }} />
          <span className="text-cyan-400 font-bold">{cost}</span>
        </div>
      </button>
    );
  }

  return (
    <Link
      to={`/practice/${song.id}`}
      className={`flex items-center gap-4 p-4 rounded-2xl hover:bg-white/10 transition-all group ${isUserCreated ? 'bg-violet-500/5 border border-violet-500/10' : 'bg-white/5'
        }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg ${isUserCreated
        ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-violet-500/20'
        : 'bg-gradient-to-br from-orange-500 to-pink-500 shadow-orange-500/20'
        }`}>
        <MusicNoteRoundedIcon sx={{ fontSize: 24, color: 'white' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{song.title}</p>
        <p className="text-sm text-white/50 truncate">{song.artist}</p>
        {song.movie && (
          <p className="text-xs text-white/30 truncate">{song.movie}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`text-xs px-2 py-0.5 rounded-full ${difficultyStyle.bg} ${difficultyStyle.text} border ${difficultyStyle.border}`}>
          {song.difficulty.charAt(0).toUpperCase() + song.difficulty.slice(1)}
        </span>
        {isUserCreated ? (
          <div className="flex items-center gap-0.5 text-violet-400">
            <PersonRoundedIcon sx={{ fontSize: 12 }} />
            <span className="text-[10px] font-medium">My Creation</span>
          </div>
        ) : song.hasTutorial && (
          <div className="flex items-center gap-0.5 text-emerald-400">
            <SchoolRoundedIcon sx={{ fontSize: 12 }} />
            <span className="text-[10px] font-medium">Tutorial</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function UnlockModal({ song, userGems, onClose, onSuccess }: {
  song: Song;
  userGems: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const cost = SONG_COSTS[song.difficulty] || 150;
  const canAfford = userGems >= cost;
  const unlockMutation = useUnlockSongMutation();
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async () => {
    setError(null);
    try {
      await unlockMutation.mutateAsync(song.id);
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Failed to unlock song');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div
        className="bg-[#111] rounded-3xl p-6 max-w-sm w-full border border-white/10 animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <MusicNoteRoundedIcon sx={{ fontSize: 40, color: 'white' }} />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{song.title}</h3>
          <p className="text-white/50">{song.artist}</p>
        </div>

        <div className="bg-white/5 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/60">Unlock cost</span>
            <div className="flex items-center gap-1">
              <DiamondRoundedIcon sx={{ fontSize: 18, color: '#22d3ee' }} />
              <span className="font-bold text-white">{cost}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-white/60">Your gems</span>
            <div className="flex items-center gap-1">
              <DiamondRoundedIcon sx={{ fontSize: 18, color: canAfford ? '#34d399' : '#f87171' }} />
              <span className={`font-bold ${canAfford ? 'text-emerald-400' : 'text-red-400'}`}>
                {userGems}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm text-center">{error}</p>
          </div>
        )}

        {canAfford ? (
          <button
            onClick={handleUnlock}
            disabled={unlockMutation.isPending}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {unlockMutation.isPending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LockOpenRoundedIcon sx={{ fontSize: 18 }} />
                Unlock Song
              </>
            )}
          </button>
        ) : (
          <>
            <button
              disabled
              className="w-full py-4 bg-white/5 rounded-2xl text-white/40 font-bold cursor-not-allowed"
            >
              Not enough gems
            </button>
            <Link
              to="/shop"
              onClick={onClose}
              className="flex items-center justify-center gap-1 w-full py-3 text-cyan-400 font-medium mt-2 hover:underline"
            >
              <DiamondRoundedIcon sx={{ fontSize: 16 }} />
              Get more gems
            </Link>
          </>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 text-white/40 font-medium mt-2 hover:text-white/60 transition-colors flex items-center justify-center gap-1"
        >
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
          Cancel
        </button>
      </div>

      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.9); opacity: 0; }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
