import { Fragment } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import BackgroundScene from './components/BackgroundScene.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import HabitsPage from './pages/HabitsPage.jsx';
import UpgradePage from './pages/UpgradePage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import TitlesPage from './pages/TitlesPage.jsx';

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/habits"      element={<PrivateRoute><HabitsPage /></PrivateRoute>} />
      <Route path="/upgrade"     element={<PrivateRoute><UpgradePage /></PrivateRoute>} />
      <Route path="/leaderboard" element={<PrivateRoute><LeaderboardPage /></PrivateRoute>} />
      <Route path="/analytics"   element={<PrivateRoute><AnalyticsPage /></PrivateRoute>} />
      <Route path="/titles"      element={<PrivateRoute><TitlesPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
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
  );
}
