import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useUser } from '@sargam/api';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: DashboardRoundedIcon },
  { path: '/admin/tutorials', label: 'Tutorials', icon: LibraryMusicRoundedIcon },
  { path: '/admin/users', label: 'Users', icon: PeopleRoundedIcon },
];

export default function AdminLayout() {
  const location = useLocation();
  const { data: user, isLoading } = useUser();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Redirect if not admin
  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111] border-r border-white/10 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <Link to="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
            <span className="text-sm">Back to App</span>
          </Link>
          <h1 className="text-xl font-bold text-white mt-4">Admin Portal</h1>
          <p className="text-sm text-white/40">Sargam AI</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/admin' && location.pathname.startsWith(item.path));

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon sx={{ fontSize: 20 }} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{user?.name}</p>
              <p className="text-white/40 text-sm truncate">{user?.email || user?.phone}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
