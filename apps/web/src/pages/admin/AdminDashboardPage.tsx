import { useAdminStats } from '@sargam/api';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import PlayCircleRoundedIcon from '@mui/icons-material/PlayCircleRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import DiamondRoundedIcon from '@mui/icons-material/DiamondRounded';

export default function AdminDashboardPage() {
  const { data: stats, isLoading, error } = useAdminStats();

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400">
          Failed to load stats. Make sure you have admin access.
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={PeopleRoundedIcon}
          label="Total Users"
          value={stats?.users.total || 0}
          subtext={`+${stats?.users.newThisWeek || 0} this week`}
          gradient="from-blue-500 to-cyan-500"
        />
        <StatCard
          icon={LibraryMusicRoundedIcon}
          label="Total Tutorials"
          value={stats?.songs.total || 0}
          subtext={`${stats?.songs.free || 0} free`}
          gradient="from-purple-500 to-pink-500"
        />
        <StatCard
          icon={PlayCircleRoundedIcon}
          label="Practice Sessions"
          value={stats?.practice.totalSessions || 0}
          subtext={`${stats?.practice.sessionsToday || 0} today`}
          gradient="from-orange-500 to-red-500"
        />
        <StatCard
          icon={DiamondRoundedIcon}
          label="Premium Users"
          value={stats?.users.premium || 0}
          subtext={`${((stats?.users.premium || 0) / (stats?.users.total || 1) * 100).toFixed(1)}% of total`}
          gradient="from-emerald-500 to-teal-500"
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Songs */}
        <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUpRoundedIcon sx={{ fontSize: 20, color: '#f97316' }} />
            Top Songs by Play Count
          </h2>
          <div className="space-y-3">
            {stats?.topSongs?.map((song, index) => (
              <div
                key={song.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/5"
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                  index === 1 ? 'bg-gray-400/20 text-gray-400' :
                  index === 2 ? 'bg-orange-700/20 text-orange-700' :
                  'bg-white/10 text-white/60'
                }`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{song.title}</p>
                  <p className="text-white/40 text-sm truncate">{song.artist}</p>
                </div>
                <span className="text-white/60 text-sm">{song.playCount} plays</span>
              </div>
            ))}
            {(!stats?.topSongs || stats.topSongs.length === 0) && (
              <p className="text-white/40 text-center py-4">No data available</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickAction
              href="/admin/tutorials/new"
              icon={LibraryMusicRoundedIcon}
              label="Add Tutorial"
              description="Create a new song tutorial"
            />
            <QuickAction
              href="/admin/users"
              icon={PeopleRoundedIcon}
              label="Manage Users"
              description="Add gems, set premium"
            />
          </div>

          {/* Recent Activity Summary */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-white/60 text-sm font-medium mb-3">This Month</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats?.users.newThisMonth || 0}</p>
                <p className="text-white/40 text-sm">New Users</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats?.practice.sessionsThisWeek || 0}</p>
                <p className="text-white/40 text-sm">Sessions (Week)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  gradient,
}: {
  icon: any;
  label: string;
  value: number;
  subtext: string;
  gradient: string;
}) {
  return (
    <div className="bg-[#111] rounded-2xl border border-white/10 p-6">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}>
        <Icon sx={{ fontSize: 24, color: 'white' }} />
      </div>
      <p className="text-white/60 text-sm mb-1">{label}</p>
      <p className="text-3xl font-bold text-white mb-1">{value.toLocaleString()}</p>
      <p className="text-white/40 text-sm">{subtext}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: any;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
    >
      <Icon sx={{ fontSize: 24, color: '#f97316' }} className="mb-2" />
      <p className="text-white font-medium">{label}</p>
      <p className="text-white/40 text-sm">{description}</p>
    </a>
  );
}
