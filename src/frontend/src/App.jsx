import { Fragment } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ModeProvider } from './contexts/ModeContext.jsx';
import BackgroundScene from './components/BackgroundScene.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import HabitsPage from './pages/HabitsPage.jsx';
import UpgradePage from './pages/UpgradePage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import TitlesPage from './pages/TitlesPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import BattlesPage from './pages/BattlesPage.jsx';
import BattleAcceptPage from './pages/BattleAcceptPage.jsx';
import BattleDetailPage from './pages/BattleDetailPage.jsx';
import FriendsPage from './pages/FriendsPage.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';

function FullScreenLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#05020f', zIndex: 9999 }}>
      <span className="text-5xl animate-pulse select-none">🔥</span>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth();
  if (authLoading) return <FullScreenLoader />;
  return isAuthenticated ? children : <Navigate to="/" replace />;
}

// Redirect authenticated users away from login/register only
function PublicOnlyRoute({ children }) {
  const { isAuthenticated, authLoading } = useAuth();
  if (authLoading) return <FullScreenLoader />;
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function RootRoute() {
  const { isAuthenticated, authLoading } = useAuth();
  if (authLoading) return <FullScreenLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"          element={<RootRoute />} />
      <Route path="/login"     element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register"  element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/habits"      element={<PrivateRoute><HabitsPage /></PrivateRoute>} />
      <Route path="/upgrade"     element={<PrivateRoute><UpgradePage /></PrivateRoute>} />
      <Route path="/leaderboard" element={<PrivateRoute><LeaderboardPage /></PrivateRoute>} />
      <Route path="/analytics"   element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
      <Route path="/titles"      element={<PrivateRoute><TitlesPage /></PrivateRoute>} />
      <Route path="/battles"        element={<PrivateRoute><BattlesPage /></PrivateRoute>} />
      <Route path="/battles/:id"   element={<PrivateRoute><BattleDetailPage /></PrivateRoute>} />
      <Route path="/friends"       element={<PrivateRoute><FriendsPage /></PrivateRoute>} />
      <Route path="/battle/accept" element={<BattleAcceptPage />} />
      <Route path="/privacy"     element={<PrivacyPage />} />
      <Route path="/terms"       element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ModeProvider>
          <Fragment>
            <BackgroundScene />
            <div style={{ position: 'relative', zIndex: 2 }}>
              <AppRoutes />
              <InstallPrompt />
            </div>
          </Fragment>
        </ModeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
