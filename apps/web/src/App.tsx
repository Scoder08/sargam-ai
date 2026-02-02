import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import LoadingScreen from './components/LoadingScreen';

// Lazy load pages for better performance
const HomePage = lazy(() => import('./pages/HomePage'));
const LessonsPage = lazy(() => import('./pages/LessonsPage'));
const LessonDetailPage = lazy(() => import('./pages/LessonDetailPage'));
const SongsPage = lazy(() => import('./pages/SongsPage'));
const PracticePage = lazy(() => import('./pages/PracticePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ShopPage = lazy(() => import('./pages/ShopPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const FreePlayPage = lazy(() => import('./pages/FreePlayPage'));
const CreateSongPage = lazy(() => import('./pages/CreateSongPage'));

// Admin pages
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminTutorialsPage = lazy(() => import('./pages/admin/AdminTutorialsPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminTutorialFormPage = lazy(() => import('./pages/admin/AdminTutorialFormPage'));

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* App routes with layout */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/lessons" element={<LessonsPage />} />
          <Route path="/songs" element={<SongsPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        {/* Practice (full screen, no layout) */}
        <Route path="/practice/:sessionId" element={<PracticePage />} />

        {/* Free Play (full screen, no layout) */}
        <Route path="/play" element={<FreePlayPage />} />

        {/* Lesson detail (full screen, no layout) */}
        <Route path="/lessons/:id" element={<LessonDetailPage />} />

        {/* Create song (full screen, no layout) */}
        <Route path="/create-song" element={<CreateSongPage />} />

        {/* Admin routes (protected by AdminLayout) */}
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/tutorials" element={<AdminTutorialsPage />} />
          <Route path="/admin/tutorials/new" element={<AdminTutorialFormPage />} />
          <Route path="/admin/tutorials/:id/edit" element={<AdminTutorialFormPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <span className="text-6xl mb-4 block">🎹</span>
        <h1 className="text-4xl font-bold text-white mb-2">404</h1>
        <p className="text-white/60 mb-6">Page not found</p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}
