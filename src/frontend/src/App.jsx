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

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Redirect authenticated users away from public-only pages (landing, login, register)
function PublicOnlyRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/"          element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
      <Route path="/login"     element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register"  element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/habits"      element={<PrivateRoute><HabitsPage /></PrivateRoute>} />
      <Route path="/upgrade"     element={<PrivateRoute><UpgradePage /></PrivateRoute>} />
      <Route path="/leaderboard" element={<PrivateRoute><LeaderboardPage /></PrivateRoute>} />
      <Route path="/analytics"   element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
      <Route path="/titles"      element={<PrivateRoute><TitlesPage /></PrivateRoute>} />
      <Route path="/privacy"     element={<PrivacyPage />} />
      <Route path="/terms"       element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ModeProvider>
      <Fragment>
        <BackgroundScene />
        <BrowserRouter>
          <AuthProvider>
            <div style={{ position: 'relative', zIndex: 2 }}>
              <AppRoutes />
            </div>
          </AuthProvider>
        </BrowserRouter>
      </Fragment>
    </ModeProvider>
  );
}
