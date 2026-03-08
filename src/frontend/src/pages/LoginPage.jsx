import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import client from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const battleToken = searchParams.get('battle');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', form);
      login(data.token, data.user);
      if (battleToken) {
        try {
          await client.post('/battles/accept', { token: battleToken });
        } catch { /* non-fatal */ }
        navigate('/battles');
        return;
      }
      const createdAt = new Date(data.user.created_at);
      const hoursOld = (Date.now() - createdAt.getTime()) / 36e5;
      const shouldPromptUpgrade = data.user.subscription_status !== 'active' && hoursOld > 24;
      navigate(shouldPromptUpgrade ? '/upgrade' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-enter min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 logo-glow">🔥</div>
          <h1 className="text-3xl font-bold text-white logo-glow">Vivify</h1>
          <p className="text-gray-400 mt-1">Sign in to continue your journey</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl border border-white/[0.08] p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="input-field w-full rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              className="input-field w-full rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-all active:scale-95"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          No account?{' '}
          <Link to="/register" className="text-purple-400 hover:text-purple-300">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
