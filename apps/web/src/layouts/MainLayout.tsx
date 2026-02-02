import { Outlet, Link, useLocation } from 'react-router-dom';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import MenuBookRoundedIcon from '@mui/icons-material/MenuBookRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import PianoRoundedIcon from '@mui/icons-material/PianoRounded';

const navItems = [
  { path: '/', label: 'Home', Icon: HomeRoundedIcon },
  { path: '/lessons', label: 'Learn', Icon: MenuBookRoundedIcon },
  { path: '/songs', label: 'Songs', Icon: LibraryMusicRoundedIcon },
  { path: '/profile', label: 'Profile', Icon: PersonRoundedIcon },
];

export default function MainLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-lg border-t border-white/5 z-50 safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto relative">
          {/* Left nav items */}
          {navItems.slice(0, 2).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                  isActive ? '' : 'opacity-50 hover:opacity-70'
                }`}
              >
                <item.Icon
                  sx={{
                    fontSize: 24,
                    color: isActive ? '#f97316' : 'rgba(255,255,255,0.7)',
                    transition: 'all 0.2s'
                  }}
                />
                <span className={`text-[10px] font-medium mt-0.5 ${
                  isActive ? 'text-orange-500' : 'text-white/60'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Center Play Button */}
          <Link
            to="/play"
            className="absolute left-1/2 -translate-x-1/2 -top-5 w-14 h-14 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all"
          >
            <PianoRoundedIcon sx={{ fontSize: 28, color: 'white' }} />
          </Link>

          {/* Spacer for center button */}
          <div className="w-16" />

          {/* Right nav items */}
          {navItems.slice(2).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all ${
                  isActive ? '' : 'opacity-50 hover:opacity-70'
                }`}
              >
                <item.Icon
                  sx={{
                    fontSize: 24,
                    color: isActive ? '#f97316' : 'rgba(255,255,255,0.7)',
                    transition: 'all 0.2s'
                  }}
                />
                <span className={`text-[10px] font-medium mt-0.5 ${
                  isActive ? 'text-orange-500' : 'text-white/60'
                }`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Safe area padding for iOS */}
      <style>{`
        .safe-area-pb {
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }
      `}</style>
    </div>
  );
}
