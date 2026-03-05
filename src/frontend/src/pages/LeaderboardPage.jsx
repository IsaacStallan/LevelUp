import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client.js';
import NavHeader from '../components/NavHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [board, setBoard]     = useState([]);
  const [period, setPeriod]   = useState('alltime'); // 'alltime' | 'weekly'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = period === 'weekly' ? '?period=weekly' : '';
    client.get(`/leaderboard${q}`)
      .then(r => setBoard(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="page-enter min-h-screen">
      <NavHeader level={user?.level ?? 0} />

      <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold text-white">🏆 Leaderboard</h1>
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            <button
              onClick={() => setPeriod('alltime')}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                period === 'alltime' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              All-time
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                period === 'weekly' ? 'bg-purple-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              This week
            </button>
          </div>
        </div>

        {/* Board */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton rounded-xl h-14" />
            ))}
          </div>
        ) : board.length === 0 ? (
          <div className="glass-card rounded-xl border border-white/[0.08] p-8 text-center">
            <p className="text-gray-500 text-sm">No data yet. Complete habits to appear here!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {board.map(entry => (
              <div
                key={entry.id}
                className={`glass-card rounded-xl border px-4 py-3 flex items-center gap-3 ${
                  entry.isCurrentUser
                    ? 'border-purple-700/60 bg-purple-950/20'
                    : 'border-white/[0.06]'
                }`}
              >
                {/* Rank */}
                <div className="w-8 text-center shrink-0">
                  {MEDALS[entry.rank] ? (
                    <span className="text-lg">{MEDALS[entry.rank]}</span>
                  ) : (
                    <span className="text-sm font-bold text-gray-500 tabular-nums">#{entry.rank}</span>
                  )}
                </div>

                {/* Name + title */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-semibold truncate ${entry.isCurrentUser ? 'text-purple-300' : 'text-white'}`}>
                      {entry.username}
                      {entry.isCurrentUser && <span className="text-xs text-purple-500 ml-1">(you)</span>}
                    </span>
                    {entry.equipped_title && (
                      <span className="text-[10px] bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 px-1.5 py-0.5 rounded-full shrink-0">
                        {entry.equipped_title}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">Lv.{entry.level} · {entry.completions} completions</p>
                </div>

                {/* XP */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-purple-400 tabular-nums">{entry.xp_total} XP</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
