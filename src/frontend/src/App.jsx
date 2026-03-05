import { Fragment } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import BackgroundScene from './components/BackgroundScene.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import HabitsPage from './pages/HabitsPage.jsx';
import UpgradePage from './pages/UpgradePage.jsx';

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
      <Route path="/habits" element={<PrivateRoute><HabitsPage /></PrivateRoute>} />
      <Route path="/upgrade" element={<PrivateRoute><UpgradePage /></PrivateRoute>} />
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
          <div style={{ position: 'relative', zIndex: 1 }}>
            <AppRoutes />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </Fragment>
  );
}
